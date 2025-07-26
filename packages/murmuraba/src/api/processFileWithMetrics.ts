import { getEngine, processStream } from '../api';
import { AudioConverter } from '../utils/audioConverter';

export interface ProcessingMetrics {
  vad: number;
  frame: number;
  timestamp: number;
  rms: number;
}

export interface ChunkOptions {
  chunkDuration: number; // ms
  outputFormat: 'wav' | 'webm' | 'raw';
}

export interface ProcessedChunk {
  id: string;
  blob?: Blob;
  startTime: number;
  endTime: number;
  duration: number;
  vadScore: number;
  averageVad: number;
  processedAudioUrl?: string;
  originalAudioUrl?: string;
  vadData: Array<{ time: number; value: number }>;
  metrics: {
    noiseRemoved: number;
    averageLevel: number;
    vad: number;
    noiseReductionLevel: number;
    processingLatency: number;
    inputLevel: number;
    outputLevel: number;
    frameCount: number;
    droppedFrames: number;
  };
  originalSize: number;
  processedSize: number;
  noiseRemoved: number;
  isPlaying: boolean;
  isValid?: boolean;
  errorMessage?: string;
  currentlyPlayingType?: 'processed' | 'original' | null;
}

export interface ProcessFileResult {
  chunks: ProcessedChunk[];
  processedBuffer: ArrayBuffer;
  averageVad: number;
  totalDuration: number;
  metadata: {
    sampleRate: number;
    channels: number;
    originalDuration: number;
  };
}

export interface ProcessFileOptions {
  enableVAD?: boolean;
  chunkOptions?: ChunkOptions;
  onFrameProcessed?: (metrics: ProcessingMetrics) => void;
}

// Legacy interface for compatibility
export interface ProcessFileWithMetricsResult {
  processedBuffer: ArrayBuffer;
  metrics: ProcessingMetrics[];
  averageVad: number;
}

// ============= Helper Classes =============

class ChunkAccumulator {
  private data: Float32Array[] = [];
  private startTime = 0;
  private vadSum = 0;
  private frameCount = 0;
  private rmsSum = 0;
  private noiseReduction = 0;
  private vadData: Array<{ time: number; value: number }> = [];

  reset(newStartTime: number) {
    this.data = [];
    this.startTime = newStartTime;
    this.vadSum = 0;
    this.frameCount = 0;
    this.rmsSum = 0;
    this.noiseReduction = 0;
    this.vadData = [];
  }

  addFrame(
    frame: Float32Array,
    vad: number,
    rms: number,
    noiseReduction: number,
    currentTime: number
  ) {
    this.data.push(new Float32Array(frame));
    this.vadSum += vad;
    this.frameCount++;
    this.rmsSum += rms;
    this.noiseReduction += noiseReduction;
    this.vadData.push({
      time: currentTime - this.startTime,
      value: vad
    });
  }

  getAudioData(): Float32Array {
    const totalSamples = this.data.reduce((acc, f) => acc + f.length, 0);
    const result = new Float32Array(totalSamples);
    let offset = 0;
    for (const frameData of this.data) {
      result.set(frameData, offset);
      offset += frameData.length;
    }
    return result;
  }

  getMetrics() {
    const avgCount = Math.max(1, this.frameCount);
    return {
      averageVad: this.vadSum / avgCount,
      averageRms: this.rmsSum / avgCount,
      averageNoiseReduction: this.noiseReduction / avgCount,
      frameCount: this.frameCount,
      vadData: [...this.vadData]
    };
  }

  getDuration(currentTime: number): number {
    return currentTime - this.startTime;
  }

  getStartTime(): number {
    return this.startTime;
  }
}

class FrameProcessor {
  private frameCount = 0;
  private totalVad = 0;
  private metrics: ProcessingMetrics[] = [];

  processFrame(
    frame: Float32Array,
    frameDuration: number,
    engine: any,
    onFrameProcessed?: (metrics: ProcessingMetrics) => void
  ): { vad: number; outputPower: number; inputPower: number; rms: number } {
    const inputPower = frame.reduce((sum, s) => sum + s * s, 0) / frame.length;
    const result = engine.processFrame(frame);
    const outputPower = result.output.reduce((sum, s) => sum + s * s, 0) / result.output.length;
    
    // Calculate RMS
    const rms = Math.sqrt(inputPower);
    
    const currentTime = this.frameCount * frameDuration;
    const metric: ProcessingMetrics = {
      vad: result.vad,
      frame: this.frameCount++,
      timestamp: Date.now(),
      rms
    };
    
    this.metrics.push(metric);
    this.totalVad += result.vad;
    
    if (onFrameProcessed) {
      onFrameProcessed(metric);
    }

    return { vad: result.vad, outputPower, inputPower, rms };
  }

  getMetrics() {
    return {
      metrics: this.metrics,
      totalVad: this.totalVad,
      averageVad: this.metrics.length > 0 ? this.totalVad / this.metrics.length : 0
    };
  }
}

// ============= Helper Functions =============

async function arrayBufferToAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    return await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
}

async function convertChunkToFormat(
  audioData: Float32Array,
  sampleRate: number,
  format: 'wav' | 'webm' | 'raw'
): Promise<Blob> {
  if (format === 'raw') {
    return new Blob([audioData.buffer], { type: 'application/octet-stream' });
  }

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
  audioBuffer.copyToChannel(audioData, 0);

  if (format === 'wav') {
    const converter = new AudioConverter();
    const wavBlob = converter['audioBufferToWav'](audioBuffer);
    converter.destroy();
    return wavBlob;
  }

  if (format === 'webm') {
    console.warn('WebM format conversion not yet implemented, returning WAV instead');
    const converter = new AudioConverter();
    const wavBlob = converter['audioBufferToWav'](audioBuffer);
    converter.destroy();
    return wavBlob;
  }

  throw new Error(`Unsupported format: ${format}`);
}

function createProcessedChunk(
  id: string,
  blob: Blob,
  startTime: number,
  endTime: number,
  metrics: ReturnType<ChunkAccumulator['getMetrics']>
): ProcessedChunk {
  const processedUrl = blob ? URL.createObjectURL(blob) : undefined;
  
  return {
    id,
    blob,
    startTime,
    endTime,
    duration: endTime - startTime,
    vadScore: metrics.averageVad,
    averageVad: metrics.averageVad,
    processedAudioUrl: processedUrl,
    originalAudioUrl: processedUrl,
    vadData: metrics.vadData,
    metrics: {
      noiseReductionLevel: metrics.averageNoiseReduction,
      processingLatency: 0,
      inputLevel: metrics.averageRms,
      outputLevel: metrics.averageRms * 0.8,
      frameCount: metrics.frameCount,
      droppedFrames: 0,
      noiseRemoved: metrics.averageNoiseReduction,
      averageLevel: metrics.averageRms,
      vad: metrics.averageVad
    },
    originalSize: blob.size,
    processedSize: blob.size,
    noiseRemoved: metrics.averageNoiseReduction,
    isPlaying: false,
    isValid: true,
    currentlyPlayingType: null
  };
}

function createErrorChunk(
  error: Error,
  startTime: number,
  endTime: number
): ProcessedChunk {
  return {
    id: `chunk-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    duration: endTime - startTime,
    startTime,
    endTime,
    vadScore: 0,
    averageVad: 0,
    vadData: [],
    metrics: {
      noiseRemoved: 0,
      averageLevel: 0,
      vad: 0,
      noiseReductionLevel: 0,
      processingLatency: 0,
      inputLevel: 0,
      outputLevel: 0,
      frameCount: 0,
      droppedFrames: 0
    },
    originalSize: 0,
    processedSize: 0,
    noiseRemoved: 0,
    isPlaying: false,
    isValid: false,
    errorMessage: `Failed to convert chunk: ${error.message}`,
    currentlyPlayingType: null
  };
}

// ============= Main Processing Functions =============

async function processLiveMicrophone(
  options: ProcessFileOptions & { recordingDuration?: number } = {}
): Promise<ProcessFileResult> {
  
  const recordingDuration = options.recordingDuration || 10000;
  const chunkOptions = options.chunkOptions || { chunkDuration: 8000, outputFormat: 'wav' };
  
  return new Promise<ProcessFileResult>((resolve, reject) => {
    (async () => {
      try {
        const engine = getEngine();
        if (!engine) {
          throw new Error('Engine not initialized. Call initializeAudioEngine() first.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });

        const controller = await processStream(stream);
        const mediaRecorder = new MediaRecorder(controller.stream);
        const audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          try {
            controller.stop();
            stream.getTracks().forEach(track => track.stop());

            const fullBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const arrayBuffer = await fullBlob.arrayBuffer();
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            const sampleRate = audioBuffer.sampleRate;
            const duration = audioBuffer.duration * 1000;
            const chunkDurationMs = chunkOptions.chunkDuration;
            const samplesPerChunk = (chunkDurationMs / 1000) * sampleRate;
            
            const audioData = audioBuffer.getChannelData(0);
            const numChunks = Math.ceil(audioData.length / samplesPerChunk);
            const chunks: ProcessedChunk[] = [];
            let totalVad = 0;
            
            for (let i = 0; i < numChunks; i++) {
              const start = i * samplesPerChunk;
              const end = Math.min(start + samplesPerChunk, audioData.length);
              const chunkData = audioData.slice(start, end);
              
              let rmsSum = 0;
              for (let j = 0; j < chunkData.length; j++) {
                rmsSum += chunkData[j] * chunkData[j];
              }
              const rms = Math.sqrt(rmsSum / chunkData.length);
              const vadScore = rms > 0.01 ? Math.min(rms * 10, 1) : 0;
              
              const chunkBlob = await convertChunkToFormat(chunkData, sampleRate, chunkOptions.outputFormat);
              const chunkUrl = URL.createObjectURL(chunkBlob);
              
              const chunk: ProcessedChunk = {
                id: `chunk-${chunks.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                blob: chunkBlob,
                processedAudioUrl: chunkUrl,
                originalAudioUrl: chunkUrl,
                startTime: (start / sampleRate) * 1000,
                endTime: (end / sampleRate) * 1000,
                duration: ((end - start) / sampleRate) * 1000,
                vadScore,
                averageVad: vadScore,
                vadData: [{time: (start / sampleRate) * 1000, value: vadScore}],
                metrics: {
                  noiseRemoved: vadScore > 0.5 ? Math.max(0.1, 1 - vadScore) : 0.7,
                  averageLevel: rms,
                  vad: vadScore,
                  noiseReductionLevel: vadScore > 0.5 ? Math.max(0.1, 1 - vadScore) : 0.7,
                  processingLatency: 0,
                  inputLevel: rms,
                  outputLevel: rms * (vadScore > 0.5 ? 0.9 : 0.3),
                  frameCount: end - start,
                  droppedFrames: 0
                },
                originalSize: chunkData.length * 4,
                processedSize: chunkBlob.size,
                noiseRemoved: vadScore > 0.5 ? Math.max(0.1, 1 - vadScore) : 0.7,
                isPlaying: false,
                isValid: true,
                currentlyPlayingType: null
              };
              
              chunks.push(chunk);
              totalVad += vadScore;
            }
            
            await audioContext.close();
            
            resolve({
              chunks,
              processedBuffer: arrayBuffer,
              averageVad: chunks.length > 0 ? totalVad / chunks.length : 0,
              totalDuration: duration,
              metadata: {
                sampleRate,
                channels: audioBuffer.numberOfChannels,
                originalDuration: duration
              }
            });
            
          } catch (error) {
            reject(error);
          }
        };

        mediaRecorder.start(chunkOptions.chunkDuration);
        
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, recordingDuration);
        
      } catch (error) {
        reject(error);
      }
    })();
  });
}

async function processFileWithChunking(
  arrayBuffer: ArrayBuffer,
  options: ProcessFileOptions
): Promise<ProcessFileResult> {
  const engine = getEngine();
  const audioBuffer = await arrayBufferToAudioBuffer(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const originalDuration = audioBuffer.duration * 1000;

  const frameSize = 480;
  const frameDuration = (frameSize / 48000) * 1000;

  const chunks: ProcessedChunk[] = [];
  const chunkAccumulator = new ChunkAccumulator();
  const frameProcessor = new FrameProcessor();
  
  const chunkOptions = options.chunkOptions!;
  let processedWithChunks = false;

  // Create a custom frame processor that handles chunking
  const originalProcessFrame = engine['processFrame'].bind(engine);
  engine['processFrame'] = function(frame: Float32Array) {
    const result = frameProcessor.processFrame(
      frame,
      frameDuration,
      { processFrame: originalProcessFrame },
      options.onFrameProcessed
    );

    if (chunkOptions) {
      const noiseReduction = result.inputPower > 0.000001 
        ? Math.max(0, 1 - (result.outputPower / result.inputPower))
        : 0;

      chunkAccumulator.addFrame(
        frame,
        result.vad,
        result.rms,
        noiseReduction,
        frameProcessor['frameCount'] * frameDuration
      );

      const currentDuration = chunkAccumulator.getDuration(frameProcessor['frameCount'] * frameDuration);
      
      if (currentDuration >= chunkOptions.chunkDuration) {
        processedWithChunks = true;
        const audioData = chunkAccumulator.getAudioData();
        const metrics = chunkAccumulator.getMetrics();
        const startTime = chunkAccumulator.getStartTime();
        const endTime = frameProcessor['frameCount'] * frameDuration;

        // Async chunk creation
        convertChunkToFormat(audioData, sampleRate, chunkOptions.outputFormat)
          .then(blob => {
            const chunk = createProcessedChunk(
              `chunk-${chunks.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              blob,
              startTime,
              endTime,
              metrics
            );
            chunks.push(chunk);
          })
          .catch(error => {
            chunks.push(createErrorChunk(error, startTime, endTime));
          });

        chunkAccumulator.reset(endTime);
      }
    }

    return originalProcessFrame(frame);
  };

  try {
    const processedBuffer = await engine.processFile(arrayBuffer);
    engine['processFrame'] = originalProcessFrame;

    // Handle remaining chunk data
    if (chunkOptions && chunkAccumulator['frameCount'] > 0) {
      const audioData = chunkAccumulator.getAudioData();
      const metrics = chunkAccumulator.getMetrics();
      const startTime = chunkAccumulator.getStartTime();
      const endTime = frameProcessor['frameCount'] * frameDuration;

      const blob = await convertChunkToFormat(audioData, sampleRate, chunkOptions.outputFormat);
      const chunk = createProcessedChunk(
        `chunk-${chunks.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        blob,
        startTime,
        endTime,
        metrics
      );
      chunks.push(chunk);
    }

    const { averageVad } = frameProcessor.getMetrics();

    return {
      chunks,
      processedBuffer,
      averageVad,
      totalDuration: frameProcessor['frameCount'] * frameDuration,
      metadata: {
        sampleRate,
        channels,
        originalDuration
      }
    };
  } catch (error) {
    engine['processFrame'] = originalProcessFrame;
    throw error;
  }
}

// ============= Legacy Support =============

async function processFileWithMetricsLegacy(
  arrayBuffer: ArrayBuffer,
  onFrameProcessed?: (metrics: ProcessingMetrics) => void
): Promise<ProcessFileWithMetricsResult> {
  const result = await processFileWithChunking(arrayBuffer, {
    onFrameProcessed
  });
  
  // Extract metrics from the result
  const engine = getEngine();
  const frameProcessor = new FrameProcessor();
  
  // Simple processing to get metrics
  const originalProcessFrame = engine['processFrame'].bind(engine);
  engine['processFrame'] = function(frame: Float32Array) {
    frameProcessor.processFrame(frame, 10, { processFrame: originalProcessFrame }, onFrameProcessed);
    return originalProcessFrame(frame);
  };

  try {
    await engine.processFile(arrayBuffer);
    engine['processFrame'] = originalProcessFrame;
    
    const { metrics, averageVad } = frameProcessor.getMetrics();
    
    return {
      processedBuffer: result.processedBuffer,
      metrics,
      averageVad
    };
  } catch (error) {
    engine['processFrame'] = originalProcessFrame;
    throw error;
  }
}

// ============= Main Export Functions =============

export async function processFileWithMetrics(
  arrayBuffer: ArrayBuffer,
  options: ProcessFileOptions
): Promise<ProcessFileResult>;

export async function processFileWithMetrics(
  useMic: 'Use.Mic',
  options?: ProcessFileOptions & { recordingDuration?: number }
): Promise<ProcessFileResult>;

export async function processFileWithMetrics(
  arrayBuffer: ArrayBuffer,
  onFrameProcessed?: (metrics: ProcessingMetrics) => void
): Promise<ProcessFileWithMetricsResult>;

export async function processFileWithMetrics(
  arrayBufferOrUseMic: ArrayBuffer | 'Use.Mic',
  optionsOrCallback?: ProcessFileOptions | ((metrics: ProcessingMetrics) => void)
): Promise<ProcessFileResult | ProcessFileWithMetricsResult> {
  // Handle microphone recording
  if (arrayBufferOrUseMic === 'Use.Mic') {
    return processLiveMicrophone(optionsOrCallback as ProcessFileOptions & { recordingDuration?: number });
  }

  const arrayBuffer = arrayBufferOrUseMic as ArrayBuffer;
  
  // Handle legacy callback parameter
  if (typeof optionsOrCallback === 'function') {
    return processFileWithMetricsLegacy(arrayBuffer, optionsOrCallback);
  }

  // Standard processing with optional chunking
  const options = optionsOrCallback || {};
  return processFileWithChunking(arrayBuffer, options);
}