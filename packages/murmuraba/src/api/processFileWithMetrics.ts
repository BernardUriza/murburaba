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
  outputFormat: 'wav' | 'webm' | 'raw'; // formato de salida deseado
}

export interface ProcessedChunk {
  id: string;
  blob?: Blob; // chunk en formato especificado, listo para usar
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
  isExpanded: boolean;
  isValid?: boolean;
  errorMessage?: string;
  currentlyPlayingType?: 'processed' | 'original' | null;
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
 * Process live microphone input with chunking using internal recording functions
 */
async function processLiveMicrophone(
  options: ProcessFileOptions & { recordingDuration?: number } = {}
): Promise<ProcessFileResult> {
  
  const recordingDuration = options.recordingDuration || 10000; // Default 10 seconds
  const chunkOptions = options.chunkOptions || { chunkDuration: 8000, outputFormat: 'wav' };
  
  // This is a simplified implementation that leverages the existing recording infrastructure
  // In a real React app, this would be used differently, but for the standalone API we simulate it
  
  return new Promise<ProcessFileResult>((resolve, reject) => {
    (async () => {
      try {
      // Initialize engine if needed
      const engine = getEngine();
      if (!engine) {
        throw new Error('Engine not initialized. Call initializeAudioEngine() first.');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Process the stream with noise reduction
      const controller = await processStream(stream);
      
      // Create MediaRecorder for chunking
      const mediaRecorder = new MediaRecorder(controller.stream);
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // Stop the stream
          controller.stop();
          stream.getTracks().forEach(track => track.stop());

          // Process recorded chunks
          const fullBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const arrayBuffer = await fullBlob.arrayBuffer();
          
          // Convert to audio buffer for analysis
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Create chunks from the recorded audio
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
            
            // Calculate basic metrics for chunk
            let rmsSum = 0;
            for (let j = 0; j < chunkData.length; j++) {
              rmsSum += chunkData[j] * chunkData[j];
            }
            const rms = Math.sqrt(rmsSum / chunkData.length);
            const vadScore = rms > 0.01 ? Math.min(rms * 10, 1) : 0; // Simple VAD approximation
            
            // Convert chunk to desired format
            const chunkBlob = await convertChunkToFormat(chunkData, sampleRate, chunkOptions.outputFormat);
            
            // Create URLs for the chunk blob
            const chunkUrl = URL.createObjectURL(chunkBlob);
            
            const chunk: ProcessedChunk = {
              id: `chunk-${chunks.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              blob: chunkBlob,
              processedAudioUrl: chunkUrl,
              originalAudioUrl: chunkUrl, // For now, same as processed
              startTime: (start / sampleRate) * 1000,
              endTime: (end / sampleRate) * 1000,
              duration: ((end - start) / sampleRate) * 1000,
              vadScore,
              averageVad: vadScore,
              vadData: [{time: (start / sampleRate) * 1000, value: vadScore}],
              metrics: {
                noiseRemoved: 0.3, // Approximation since we processed through RNNoise
                averageLevel: rms,
                vad: vadScore,
                noiseReductionLevel: 0.3,
                processingLatency: 0,
                inputLevel: rms,
                outputLevel: rms * 0.7, // Approximation after noise reduction
                frameCount: end - start,
                droppedFrames: 0
              },
              originalSize: chunkData.length * 4, // Float32 to bytes
              processedSize: chunkBlob.size,
              noiseRemoved: 0.3,
              isPlaying: false,
              isExpanded: false,
              isLoading: false,
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

      // Start recording in chunks
      mediaRecorder.start(chunkOptions.chunkDuration);
      
      // Stop recording after specified duration
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

/**
 * Process audio file with chunking support and metrics
 */
export async function processFileWithMetrics(
  arrayBuffer: ArrayBuffer,
  options: ProcessFileOptions
): Promise<ProcessFileResult>;

/**
 * Process live microphone input when no file is provided
 * Use 'Use.Mic' as first parameter to enable microphone recording
 */
export async function processFileWithMetrics(
  useMic: 'Use.Mic',
  options?: ProcessFileOptions & { recordingDuration?: number }
): Promise<ProcessFileResult>;

/**
 * Legacy overload for backward compatibility
 */
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
  let currentChunkVadData: Array<{ time: number; value: number }> = [];

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
      // Collect VAD data
      currentChunkVadData.push({
        time: currentTime - currentChunkStartTime,
        value: result.vad
      });

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

        // Convert chunk to desired format asynchronously
        convertChunkToFormat(chunkAudioData, sampleRate, chunkOptions.outputFormat)
          .then(blob => {
            const processedUrl = blob ? URL.createObjectURL(blob) : undefined;
            const chunk: ProcessedChunk = {
              id: `chunk-${chunks.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              blob,
              startTime: currentChunkStartTime,
              endTime: currentTime,
              duration: currentChunkDuration,
              vadScore: currentChunkVadSum / currentChunkFrameCount,
              averageVad: currentChunkVadSum / currentChunkFrameCount,
              processedAudioUrl: processedUrl,
              originalAudioUrl: processedUrl, // Same as processed since we only have one
              vadData: [...currentChunkVadData],
              metrics: {
                noiseReductionLevel: 1 - (currentChunkRmsSum / currentChunkFrameCount), // Approximation
                processingLatency: 0, // TODO: Measure actual latency
                inputLevel: currentChunkRmsSum / currentChunkFrameCount,
                outputLevel: currentChunkRmsSum / currentChunkFrameCount * 0.8, // Simulated reduction
                frameCount: currentChunkFrameCount,
                droppedFrames: 0,
                noiseRemoved: 1 - (currentChunkRmsSum / currentChunkFrameCount),
                averageLevel: currentChunkRmsSum / currentChunkFrameCount,
                vad: currentChunkVadSum / currentChunkFrameCount
              },
              originalSize: blob.size,
              processedSize: blob.size,
              noiseRemoved: 1 - (currentChunkRmsSum / currentChunkFrameCount),
              isPlaying: false,
              isExpanded: false,
              isValid: true,
              currentlyPlayingType: null
            };
            chunks.push(chunk);
          })
          .catch(error => {
            console.error('Error converting chunk:', error);
            // Add error chunk
            const errorChunk: ProcessedChunk = {
              id: `chunk-error-${chunks.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              duration: currentChunkDuration,
              startTime: currentChunkStartTime,
              endTime: currentTime,
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
              isExpanded: false,
              isValid: false,
              errorMessage: `Failed to convert chunk: ${error.message}`,
              currentlyPlayingType: null
            };
            chunks.push(errorChunk);
          });

        // Reset for next chunk
        currentChunkData = [];
        currentChunkStartTime = currentTime;
        currentChunkVadData = [];
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
      const processedUrl = blob ? URL.createObjectURL(blob) : undefined;
      const chunk: ProcessedChunk = {
        id: `chunk-${chunks.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        blob,
        startTime: currentChunkStartTime,
        endTime: finalTime,
        duration: finalTime - currentChunkStartTime,
        vadScore: currentChunkVadSum / currentChunkFrameCount,
        averageVad: currentChunkVadSum / currentChunkFrameCount,
        processedAudioUrl: processedUrl,
        originalAudioUrl: processedUrl,
        vadData: [...currentChunkVadData],
        metrics: {
          noiseReductionLevel: 1 - (currentChunkRmsSum / currentChunkFrameCount),
          processingLatency: 0,
          inputLevel: currentChunkRmsSum / currentChunkFrameCount,
          outputLevel: currentChunkRmsSum / currentChunkFrameCount * 0.8,
          frameCount: currentChunkFrameCount,
          droppedFrames: 0,
          noiseRemoved: 1 - (currentChunkRmsSum / currentChunkFrameCount),
          averageLevel: currentChunkRmsSum / currentChunkFrameCount,
          vad: currentChunkVadSum / currentChunkFrameCount
        },
        originalSize: blob.size,
        processedSize: blob.size,
        noiseRemoved: 1 - (currentChunkRmsSum / currentChunkFrameCount),
        isPlaying: false,
        isExpanded: false,
        isValid: true,
        currentlyPlayingType: null
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