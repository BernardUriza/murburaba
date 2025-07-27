/**
 * FileProcessor - Dedicated file processing with chunking support
 * 
 * EXTRACTION: From MurmubaraEngine.processFile() (lines 1166-1388)
 * PHILOSOPHY: One module = one responsibility (ArrayBuffer processing)
 */

import { FrameProcessor } from './FrameProcessor';
import { WasmManager } from './WasmManager';
import { AudioResampler } from '../utils/AudioResampler';
import type { Logger } from '../core/Logger';

export interface FileProcessorConfig {
  logger?: Logger;
  enableResampling?: boolean;
  chunkSize?: number;
}

export interface ProcessingProgress {
  frameIndex: number;
  totalFrames: number;
  progress: number; // 0-100
  vad: number;
  noiseReduction: number;
}

export class FileProcessor {
  private wasmManager: WasmManager;
  private frameProcessor: FrameProcessor;
  private logger?: Logger;
  private config: Required<FileProcessorConfig>;

  constructor(wasmManager: WasmManager, config: FileProcessorConfig = {}) {
    this.wasmManager = wasmManager;
    this.frameProcessor = new FrameProcessor();
    this.logger = config.logger;
    
    this.config = {
      logger: config.logger,
      enableResampling: config.enableResampling ?? true,
      chunkSize: config.chunkSize || 1024, // Process in chunks for progress
    };
  }

  async processFile(
    arrayBuffer: ArrayBuffer,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ArrayBuffer> {
    this.logger?.info('Processing WAV file...');
    const startTime = Date.now();

    // Parse WAV header
    const { pcmData, sampleRate, format } = this.parseWavFile(arrayBuffer);
    
    // Resample to 48kHz if needed
    const { resampledData, outputSampleRate } = this.resampleIfNeeded(pcmData, sampleRate);
    
    // Process audio in 480-sample frames
    const processedSamples = await this.processAudioFrames(
      resampledData, 
      outputSampleRate,
      onProgress
    );
    
    // Create output WAV buffer
    const outputBuffer = this.createWavOutput(processedSamples, outputSampleRate);
    
    const processingTime = Date.now() - startTime;
    this.logger?.info(`File processing complete in ${processingTime}ms`);
    
    return outputBuffer;
  }

  private parseWavFile(arrayBuffer: ArrayBuffer): {
    pcmData: Int16Array;
    sampleRate: number;
    format: { channels: number; bitsPerSample: number };
  } {
    const dataView = new DataView(arrayBuffer);

    // Verify RIFF header
    const riff = this.readString(dataView, 0, 4);
    if (riff !== 'RIFF') {
      throw new Error('Not a valid WAV file: missing RIFF header');
    }

    // Verify WAVE format
    const wave = this.readString(dataView, 8, 4);
    if (wave !== 'WAVE') {
      throw new Error('Not a valid WAV file: missing WAVE format');
    }

    // Find fmt chunk
    const fmtInfo = this.findChunk(dataView, 'fmt ');
    if (!fmtInfo) {
      throw new Error('Invalid WAV file: fmt chunk not found');
    }

    // Parse fmt chunk
    const audioFormat = dataView.getUint16(fmtInfo.offset + 8, true);
    const numChannels = dataView.getUint16(fmtInfo.offset + 10, true);
    const sampleRate = dataView.getUint32(fmtInfo.offset + 12, true);
    const bitsPerSample = dataView.getUint16(fmtInfo.offset + 22, true);

    // Validate format
    this.validateWavFormat(audioFormat, numChannels, bitsPerSample);

    // Find data chunk
    const dataInfo = this.findChunk(dataView, 'data');
    if (!dataInfo) {
      throw new Error('Invalid WAV file: data chunk not found');
    }

    // Extract PCM data
    const pcmData = new Int16Array(arrayBuffer, dataInfo.offset, dataInfo.size / 2);
    
    this.logger?.info(`WAV format: PCM 16-bit mono ${sampleRate}Hz`);
    
    return {
      pcmData,
      sampleRate,
      format: { channels: numChannels, bitsPerSample },
    };
  }

  private resampleIfNeeded(pcmData: Int16Array, sampleRate: number): {
    resampledData: Int16Array;
    outputSampleRate: number;
  } {
    if (!this.config.enableResampling) {
      return { resampledData: pcmData, outputSampleRate: sampleRate };
    }

    // Resample to 48kHz if needed (RNNoise requires 48kHz)
    const result = AudioResampler.resampleToRNNoiseRate(pcmData, sampleRate, this.logger);
    return {
      resampledData: result.resampledData,
      outputSampleRate: result.outputSampleRate,
    };
  }

  private async processAudioFrames(
    pcmData: Int16Array,
    sampleRate: number,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Float32Array> {
    const numSamples = pcmData.length;
    const numFrames = Math.floor(numSamples / FrameProcessor.FRAME_SIZE);
    
    this.logger?.info(`Processing ${numSamples} samples (${numFrames} frames)`);
    
    const processedSamples = new Float32Array(numFrames * FrameProcessor.FRAME_SIZE);
    let totalVAD = 0;
    let voiceFrames = 0;

    // Ensure WASM is initialized
    if (!this.wasmManager.isInitialized()) {
      await this.wasmManager.initialize();
    }

    const module = this.wasmManager.getModule()!;
    const state = this.wasmManager.createState();
    const inputPtr = this.wasmManager.allocateMemory(FrameProcessor.FRAME_SIZE);
    const outputPtr = this.wasmManager.allocateMemory(FrameProcessor.FRAME_SIZE);

    try {
      for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
        const frameStart = frameIndex * FrameProcessor.FRAME_SIZE;
        const frame = new Float32Array(FrameProcessor.FRAME_SIZE);

        // Convert PCM16 to Float32
        for (let i = 0; i < FrameProcessor.FRAME_SIZE; i++) {
          frame[i] = pcmData[frameStart + i] / 32768.0;
        }

        // Process frame with RNNoise
        const result = this.frameProcessor.processFrame(
          frame, 
          module, 
          state, 
          inputPtr, 
          outputPtr
        );

        // Calculate metrics
        const inputRMS = this.frameProcessor.calculateRMS(frame);
        const outputRMS = this.frameProcessor.calculateRMS(result.output);
        const noiseReduction = inputRMS > 0 ? Math.max(0, (1 - outputRMS / inputRMS) * 100) : 0;

        // Track voice activity
        totalVAD += result.vad;
        if (result.vad > 0.5) voiceFrames++;

        // Store processed samples
        for (let i = 0; i < FrameProcessor.FRAME_SIZE; i++) {
          processedSamples[frameStart + i] = result.output[i];
        }

        // Report progress
        if (onProgress && frameIndex % this.config.chunkSize === 0) {
          onProgress({
            frameIndex,
            totalFrames: numFrames,
            progress: (frameIndex / numFrames) * 100,
            vad: result.vad,
            noiseReduction,
          });
        }
      }
    } finally {
      // Cleanup
      this.wasmManager.freeMemory(inputPtr);
      this.wasmManager.freeMemory(outputPtr);
      this.wasmManager.destroyState(state);
    }

    // Log summary
    const averageVAD = totalVAD / numFrames;
    const voicePercentage = (voiceFrames / numFrames) * 100;
    this.logger?.info(
      `Processing complete: Average VAD: ${averageVAD.toFixed(3)}, Voice frames: ${voicePercentage.toFixed(1)}%`
    );

    return processedSamples;
  }

  private createWavOutput(processedSamples: Float32Array, sampleRate: number): ArrayBuffer {
    // Convert Float32 back to PCM16
    const processedPCM = new Int16Array(processedSamples.length);
    for (let i = 0; i < processedSamples.length; i++) {
      const clamped = Math.max(-1, Math.min(1, processedSamples[i]));
      processedPCM[i] = Math.round(clamped * 32767);
    }

    // Create output WAV buffer
    const outputSize = 44 + processedPCM.length * 2; // WAV header + PCM data
    const outputBuffer = new ArrayBuffer(outputSize);
    const outputView = new DataView(outputBuffer);

    // Write WAV header
    this.writeWavHeader(outputView, processedPCM.length, sampleRate);

    // Write PCM data
    const outputPCMView = new Int16Array(outputBuffer, 44);
    outputPCMView.set(processedPCM);

    return outputBuffer;
  }

  private readString(dataView: DataView, offset: number, length: number): string {
    return String.fromCharCode(
      ...Array.from({ length }, (_, i) => dataView.getUint8(offset + i))
    );
  }

  private findChunk(dataView: DataView, chunkId: string): { offset: number; size: number } | null {
    let offset = 12; // Skip RIFF header
    
    while (offset < dataView.byteLength - 8) {
      const id = this.readString(dataView, offset, 4);
      const size = dataView.getUint32(offset + 4, true);
      
      if (id === chunkId) {
        return { offset: offset + 8, size };
      }
      offset += 8 + size;
    }
    
    return null;
  }

  private validateWavFormat(audioFormat: number, numChannels: number, bitsPerSample: number): void {
    if (audioFormat !== 1) {
      throw new Error(`Unsupported audio format: ${audioFormat}. Only PCM (format 1) is supported`);
    }
    if (numChannels !== 1) {
      throw new Error(`Unsupported channel count: ${numChannels}. Only mono (1 channel) is supported`);
    }
    if (bitsPerSample !== 16) {
      throw new Error(`Unsupported bit depth: ${bitsPerSample}. Only 16-bit is supported`);
    }
  }

  private writeWavHeader(outputView: DataView, pcmLength: number, sampleRate: number): void {
    // RIFF chunk
    outputView.setUint8(0, 0x52); // 'R'
    outputView.setUint8(1, 0x49); // 'I'
    outputView.setUint8(2, 0x46); // 'F'
    outputView.setUint8(3, 0x46); // 'F'
    outputView.setUint32(4, pcmLength * 2 + 36, true); // File size - 8
    outputView.setUint8(8, 0x57); // 'W'
    outputView.setUint8(9, 0x41); // 'A'
    outputView.setUint8(10, 0x56); // 'V'
    outputView.setUint8(11, 0x45); // 'E'

    // fmt chunk
    outputView.setUint8(12, 0x66); // 'f'
    outputView.setUint8(13, 0x6d); // 'm'
    outputView.setUint8(14, 0x74); // 't'
    outputView.setUint8(15, 0x20); // ' '
    outputView.setUint32(16, 16, true); // fmt chunk size
    outputView.setUint16(20, 1, true); // PCM format
    outputView.setUint16(22, 1, true); // Mono
    outputView.setUint32(24, sampleRate, true); // Sample rate
    outputView.setUint32(28, sampleRate * 2, true); // Byte rate
    outputView.setUint16(32, 2, true); // Block align
    outputView.setUint16(34, 16, true); // Bits per sample

    // data chunk
    outputView.setUint8(36, 0x64); // 'd'
    outputView.setUint8(37, 0x61); // 'a'
    outputView.setUint8(38, 0x74); // 't'
    outputView.setUint8(39, 0x61); // 'a'
    outputView.setUint32(40, pcmLength * 2, true); // Data size
  }
}