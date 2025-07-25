import { getEngine } from '../api';
import { AudioConverter } from '../utils/audioConverter';

export interface ProcessingMetrics {
  vad: number;
  frame: number;
  timestamp: number;
  rms: number;
}

export interface ChunkOptions {
  chunkDuration: number; // ms
  outputFormat: 'wav' | 'webm' | 'raw'; // formato de salida deseado
}

export interface ProcessedChunk {
  blob: Blob; // chunk en formato especificado, listo para usar
  startTime: number;
  endTime: number;
  duration: number;
  vadScore: number;
  metrics: {
    noiseRemoved: number;
    averageLevel: number;
    vad: number;
  };
}

export interface ProcessFileResult {
  chunks: ProcessedChunk[]; // array de chunks procesados
  processedBuffer: ArrayBuffer; // audio completo procesado (opcional)
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

// Mantener la interfaz antigua para compatibilidad
export interface ProcessFileWithMetricsResult {
  processedBuffer: ArrayBuffer;
  metrics: ProcessingMetrics[];
  averageVad: number;
}

/**
 * Convert ArrayBuffer to AudioBuffer using Web Audio API
 */
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

/**
 * Convert audio chunk to desired format
 */
async function convertChunkToFormat(
  audioData: Float32Array,
  sampleRate: number,
  format: 'wav' | 'webm' | 'raw'
): Promise<Blob> {
  if (format === 'raw') {
    // Return raw Float32Array as blob
    return new Blob([audioData.buffer], { type: 'application/octet-stream' });
  }

  // Create AudioBuffer from Float32Array
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
  audioBuffer.copyToChannel(audioData, 0);

  if (format === 'wav') {
    // Use AudioConverter to convert to WAV
    const converter = new AudioConverter();
    const wavBlob = converter['audioBufferToWav'](audioBuffer);
    converter.destroy();
    return wavBlob;
  }

  if (format === 'webm') {
    // For WebM, we need to use MediaRecorder (more complex, returning WAV for now)
    console.warn('WebM format conversion not yet implemented, returning WAV instead');
    const converter = new AudioConverter();
    const wavBlob = converter['audioBufferToWav'](audioBuffer);
    converter.destroy();
    return wavBlob;
  }

  throw new Error(`Unsupported format: ${format}`);
}

/**
 * Process audio file with chunking support and metrics
 */
export async function processFileWithMetrics(
  arrayBuffer: ArrayBuffer,
  options: ProcessFileOptions
): Promise<ProcessFileResult>;

/**
 * Legacy overload for backward compatibility
 */
export async function processFileWithMetrics(
  arrayBuffer: ArrayBuffer,
  onFrameProcessed?: (metrics: ProcessingMetrics) => void
): Promise<ProcessFileWithMetricsResult>;

export async function processFileWithMetrics(
  arrayBuffer: ArrayBuffer,
  optionsOrCallback?: ProcessFileOptions | ((metrics: ProcessingMetrics) => void)
): Promise<ProcessFileResult | ProcessFileWithMetricsResult> {
  // Handle legacy callback parameter
  if (typeof optionsOrCallback === 'function') {
    return processFileWithMetricsLegacy(arrayBuffer, optionsOrCallback);
  }

  const options = optionsOrCallback || {};
  const engine = getEngine();
  const metrics: ProcessingMetrics[] = [];
  const chunks: ProcessedChunk[] = [];
  let frameCount = 0;
  let totalVad = 0;

  // Get audio metadata
  const audioBuffer = await arrayBufferToAudioBuffer(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels;
  const originalDuration = audioBuffer.duration * 1000; // Convert to ms

  // Calculate frame size (RNNoise uses 480 samples per frame at 48kHz)
  const frameSize = 480;
  const frameDuration = (frameSize / 48000) * 1000; // ms per frame

  // Prepare for chunking if requested
  const chunkOptions = options.chunkOptions;
  let currentChunkData: Float32Array[] = [];
  let currentChunkStartTime = 0;
  let currentChunkVadSum = 0;
  let currentChunkFrameCount = 0;
  let currentChunkRmsSum = 0;

  // Hook into the engine's frame processing
  const originalProcessFrame = engine['processFrame'].bind(engine);
  engine['processFrame'] = function(frame: Float32Array) {
    const result = originalProcessFrame(frame);
    
    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    const rms = Math.sqrt(sum / frame.length);
    
    const currentTime = frameCount * frameDuration;
    const metric: ProcessingMetrics = {
      vad: result.vad,
      frame: frameCount++,
      timestamp: Date.now(),
      rms
    };
    
    metrics.push(metric);
    totalVad += result.vad;
    
    if (options.onFrameProcessed) {
      options.onFrameProcessed(metric);
    }

    // Handle chunking if enabled
    if (chunkOptions) {
      currentChunkData.push(new Float32Array(frame));
      currentChunkVadSum += result.vad;
      currentChunkFrameCount++;
      currentChunkRmsSum += rms;

      // Check if we should create a new chunk
      const currentChunkDuration = currentTime - currentChunkStartTime;
      if (currentChunkDuration >= chunkOptions.chunkDuration) {
        // Create chunk
        const chunkSamples = currentChunkData.reduce((acc, f) => acc + f.length, 0);
        const chunkAudioData = new Float32Array(chunkSamples);
        let offset = 0;
        for (const frameData of currentChunkData) {
          chunkAudioData.set(frameData, offset);
          offset += frameData.length;
        }

        // Convert chunk to desired format (sync for now to avoid test issues)
        try {
          const blob = await convertChunkToFormat(chunkAudioData, sampleRate, chunkOptions.outputFormat);
          const chunk: ProcessedChunk = {
            blob,
            startTime: currentChunkStartTime,
            endTime: currentTime,
            duration: currentChunkDuration,
            vadScore: currentChunkVadSum / currentChunkFrameCount,
            metrics: {
              noiseRemoved: 1 - (currentChunkRmsSum / currentChunkFrameCount), // Approximation
              averageLevel: currentChunkRmsSum / currentChunkFrameCount,
              vad: currentChunkVadSum / currentChunkFrameCount
            }
          };
          chunks.push(chunk);
        } catch (error) {
          console.error('Error converting chunk:', error);
        }

        // Reset for next chunk
        currentChunkData = [];
        currentChunkStartTime = currentTime;
        currentChunkVadSum = 0;
        currentChunkFrameCount = 0;
        currentChunkRmsSum = 0;
      }
    }
    
    return result;
  };
  
  try {
    // Process the file
    const processedBuffer = await engine.processFile(arrayBuffer);
    
    // Restore original method
    engine['processFrame'] = originalProcessFrame;

    // Handle any remaining chunk data
    if (chunkOptions && currentChunkData.length > 0) {
      const chunkSamples = currentChunkData.reduce((acc, f) => acc + f.length, 0);
      const chunkAudioData = new Float32Array(chunkSamples);
      let offset = 0;
      for (const frameData of currentChunkData) {
        chunkAudioData.set(frameData, offset);
        offset += frameData.length;
      }

      const blob = await convertChunkToFormat(chunkAudioData, sampleRate, chunkOptions.outputFormat);
      const finalTime = frameCount * frameDuration;
      const chunk: ProcessedChunk = {
        blob,
        startTime: currentChunkStartTime,
        endTime: finalTime,
        duration: finalTime - currentChunkStartTime,
        vadScore: currentChunkVadSum / currentChunkFrameCount,
        metrics: {
          noiseRemoved: 1 - (currentChunkRmsSum / currentChunkFrameCount),
          averageLevel: currentChunkRmsSum / currentChunkFrameCount,
          vad: currentChunkVadSum / currentChunkFrameCount
        }
      };
      chunks.push(chunk);
    }
    
    const averageVad = metrics.length > 0 ? totalVad / metrics.length : 0;
    const totalDuration = frameCount * frameDuration;
    
    return {
      chunks,
      processedBuffer,
      averageVad,
      totalDuration,
      metadata: {
        sampleRate,
        channels,
        originalDuration
      }
    };
  } catch (error) {
    // Restore original method on error
    engine['processFrame'] = originalProcessFrame;
    throw error;
  }
}

/**
 * Legacy implementation for backward compatibility
 */
async function processFileWithMetricsLegacy(
  arrayBuffer: ArrayBuffer,
  onFrameProcessed?: (metrics: ProcessingMetrics) => void
): Promise<ProcessFileWithMetricsResult> {
  const result = await processFileWithMetrics(arrayBuffer, {
    onFrameProcessed
  });
  
  return {
    processedBuffer: result.processedBuffer,
    metrics: result.metadata ? [] : (result as any).metrics,
    averageVad: result.averageVad
  };
}