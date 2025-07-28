import { TOKENS, DIContainer } from '../core/DIContainer';
import {
  IAudioProcessor,
  AudioProcessingOptions,
  AudioProcessingResult,
} from '../core/interfaces/IAudioProcessor';
import { ILogger, IMetricsManager } from '../core/interfaces';
import { ProcessedChunk, ProcessingMetrics } from '../types';
import { engineRegistry } from '../core/EngineRegistry';
import { AudioConverter } from '../utils/audioConverter';

export class AudioProcessorService implements IAudioProcessor {
  private logger!: ILogger;
  private metricsManager!: IMetricsManager;

  private progressCallbacks = new Set<(progress: number) => void>();
  private metricsCallbacks = new Set<(metrics: ProcessingMetrics) => void>();
  private chunkCallbacks = new Set<(chunk: ProcessedChunk) => void>();

  private isProcessingFlag = false;
  private abortController?: AbortController;
  private currentStream?: MediaStream;
  private currentAGCSetting = false;

  constructor(private container?: DIContainer) {
    if (container) {
      this.logger = container.get<ILogger>(TOKENS.Logger);
      this.metricsManager = container.get<IMetricsManager>(TOKENS.MetricsManager);

      // Forward metrics events from MetricsManager to our callbacks
      if (this.metricsManager && typeof (this.metricsManager as any).on === 'function') {
        (this.metricsManager as any).on('metrics-update', (metrics: ProcessingMetrics) => {
          this.logger.debug('AudioProcessorService: Forwarding metrics from MetricsManager');
          this.notifyMetrics(metrics);
        });
      }
    }
  }

  async processFile(
    file: File | ArrayBuffer,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult> {
    this.isProcessingFlag = true;
    this.abortController = new AbortController();

    try {
      const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;

      // Check if engine exists in registry
      if (!engineRegistry.hasEngine()) {
        this.logger.error('No engine available in registry');
        throw new Error('No engine available');
      }

      const engine = engineRegistry.getEngine();

      // Check if engine is initialized
      if (!engine.isInitialized) {
        this.logger.error('Engine is not initialized');
        throw new Error('Engine not initialized');
      }

      const result = await this.processArrayBuffer(arrayBuffer, options);

      this.logger.info('File processing completed', {
        chunks: result.chunks.length,
        duration: result.totalDuration,
      });

      return result;
    } finally {
      this.isProcessingFlag = false;
      this.abortController = undefined;
    }
  }

  async processStream(
    stream: MediaStream,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult> {
    this.isProcessingFlag = true;
    this.abortController = new AbortController();

    try {
      const chunks: ProcessedChunk[] = [];
      const engine = engineRegistry.getEngine();

      const controller = await engine.processStream(stream, {
        chunkDuration: options?.chunkDuration || 8, // Already in seconds
        onChunkProcessed: (chunk: any) => {
          const processedChunk = this.normalizeChunk(chunk);
          chunks.push(processedChunk);
          this.notifyChunk(processedChunk);
        },
      });

      // Wait for processing to complete or abort
      await new Promise<void>((resolve, reject) => {
        this.abortController?.signal.addEventListener('abort', () => {
          controller.stop();
          resolve();
        });

        // Auto-stop after duration if specified
        if (options?.chunkDuration) {
          setTimeout(() => {
            controller.stop();
            resolve();
          }, options.chunkDuration * 10); // Process 10 chunks max
        }
      });

      return this.createResult(chunks);
    } finally {
      this.isProcessingFlag = false;
      this.abortController = undefined;
    }
  }

  async processRecording(
    duration: number,
    options?: AudioProcessingOptions & { stream?: MediaStream }
  ): Promise<AudioProcessingResult> {
    let stream: MediaStream;
    let shouldStopStream = false;

    if (options?.stream) {
      // Use provided stream
      stream = options.stream;
    } else {
      // Check if we need a new stream due to AGC change
      const needNewStream =
        !this.currentStream ||
        (options?.enableAGC !== undefined && options.enableAGC !== this.currentAGCSetting);

      if (needNewStream) {
        // Clean up old stream if exists
        if (this.currentStream) {
          this.currentStream.getTracks().forEach(track => track.stop());
        }

        // Get new stream with updated settings
        shouldStopStream = true;
        this.currentAGCSetting = options?.enableAGC ?? false;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: this.currentAGCSetting,
          },
        });
        this.currentStream = stream;
      } else {
        // Reuse existing stream
        stream = this.currentStream!;
        shouldStopStream = false;
      }
    }

    try {
      // Set up duration-based recording
      const recordingOptions = {
        ...options,
        chunkDuration: options?.chunkDuration || 8,
      };

      // Start processing the stream
      this.isProcessingFlag = true;
      this.abortController = new AbortController();

      const chunks: ProcessedChunk[] = [];
      const engine = engineRegistry.getEngine();
      

      // Connect metrics from engine to service
      const metricsManager = (engine as any).metricsManager;
      if (metricsManager && metricsManager.on) {
        const metricsUnsubscribe = metricsManager.on(
          'metrics-update',
          (metrics: ProcessingMetrics) => {
            // Forward metrics to callbacks
            this.metricsCallbacks.forEach(cb => cb(metrics));
          }
        );
      }

      const chunkConfig = recordingOptions.chunkDuration ? {
        chunkDuration: recordingOptions.chunkDuration * 1000, // Convert seconds to milliseconds
        onChunkProcessed: (chunk: any) => {
          const processedChunk = this.normalizeChunk(chunk);
          chunks.push(processedChunk);
          this.notifyChunk(processedChunk);
        }
      } : undefined;
      
      
      const controller = await engine.processStream(stream, chunkConfig);
      

      // Stop recording after specified duration
      setTimeout(() => {
        controller.stop();
      }, duration);

      // Wait for recording to complete
      await new Promise<void>(resolve => {
        this.abortController?.signal.addEventListener('abort', () => {
          controller.stop();
          resolve();
        });

        setTimeout(resolve, duration + 500); // Add small buffer
      });

      return this.createResult(chunks);
    } finally {
      this.isProcessingFlag = false;
      this.abortController = undefined;

      // Don't stop the stream here anymore - keep it for reuse
      // Stream will be stopped when a new one is needed or on cleanup
    }
  }

  onProgress(callback: (progress: number) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  onMetrics(callback: (metrics: ProcessingMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    return () => this.metricsCallbacks.delete(callback);
  }

  onChunk(callback: (chunk: ProcessedChunk) => void): () => void {
    this.chunkCallbacks.add(callback);
    return () => this.chunkCallbacks.delete(callback);
  }

  cancel(): void {
    this.abortController?.abort();

    // Also try to stop the engine's processing
    try {
      const engine = engineRegistry.getEngine();
      if (engine) {
        (engine as any).stopProcessing?.();
      }
    } catch (error) {
      // Engine might not exist, ignore
    }
  }

  isProcessing(): boolean {
    return this.isProcessingFlag;
  }

  private async processArrayBuffer(
    arrayBuffer: ArrayBuffer,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult> {
    const chunks: ProcessedChunk[] = [];
    let processedBuffer: ArrayBuffer;

    if (options?.chunkDuration) {
      // Process with chunking
      const result = await this.processWithChunking(arrayBuffer, options);
      chunks.push(...result.chunks);
      processedBuffer = result.processedBuffer;
    } else {
      // Process entire file
      const engine = engineRegistry.getEngine();
      processedBuffer = await engine.processFile(arrayBuffer);
    }

    return this.createResult(chunks, processedBuffer);
  }

  private async processWithChunking(
    arrayBuffer: ArrayBuffer,
    options: AudioProcessingOptions
  ): Promise<{ chunks: ProcessedChunk[]; processedBuffer: ArrayBuffer }> {
    const chunks: ProcessedChunk[] = [];
    const engine = engineRegistry.getEngine();

    // Convert ArrayBuffer to AudioBuffer for processing
    const audioContext = new AudioContext({ sampleRate: 48000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

    // Calculate chunk parameters
    const sampleRate = audioBuffer.sampleRate;
    const chunkDurationSeconds = options.chunkDuration || 8;
    const samplesPerChunk = Math.floor(sampleRate * chunkDurationSeconds);
    const totalSamples = audioBuffer.length;
    const channelData = audioBuffer.getChannelData(0);

    // Process chunks
    for (let start = 0; start < totalSamples; start += samplesPerChunk) {
      const end = Math.min(start + samplesPerChunk, totalSamples);
      const chunkData = channelData.slice(start, end);

      // Create chunk audio buffer
      const chunkBuffer = audioContext.createBuffer(1, chunkData.length, sampleRate);
      chunkBuffer.getChannelData(0).set(chunkData);

      // Convert to ArrayBuffer for processing
      const chunkArrayBuffer = await AudioConverter.audioBufferToArrayBuffer(chunkBuffer);

      // Process chunk through engine
      const processedChunkBuffer = await engine.processFile(chunkArrayBuffer);

      // Create blob from processed buffer
      const blob = new Blob([processedChunkBuffer], { type: 'audio/wav' });

      // Create ProcessedChunk
      const chunk: ProcessedChunk = {
        id: `chunk-${chunks.length}`,
        blob,
        startTime: start / sampleRate,
        endTime: end / sampleRate,
        duration: (end - start) / sampleRate,
        vadScore: 0.8, // Placeholder - should be calculated
        averageVad: 0.8,
        processedAudioUrl: URL.createObjectURL(blob),
        originalAudioUrl: '',
        vadData: [],
        metrics: this.createDefaultMetrics(),
        originalSize: chunkArrayBuffer.byteLength,
        processedSize: processedChunkBuffer.byteLength,
        noiseRemoved: 0.15, // Placeholder
        isPlaying: false,
        isValid: true,
        currentlyPlayingType: null,
      };

      chunks.push(chunk);
      this.notifyChunk(chunk);
      this.notifyProgress((end / totalSamples) * 100);
    }

    // Process entire file for final result
    const processedBuffer = await engine.processFile(arrayBuffer);

    audioContext.close();

    return { chunks, processedBuffer };
  }

  private normalizeChunk(chunk: any): ProcessedChunk {
    return {
      id: chunk.id || `chunk-${Date.now()}`,
      blob: chunk.blob,
      startTime: chunk.startTime || 0,
      endTime: chunk.endTime || 0,
      duration: chunk.duration || 0,
      vadScore: chunk.vadScore || chunk.averageVad || 0,
      averageVad: chunk.averageVad || 0,
      processedAudioUrl: chunk.processedAudioUrl,
      originalAudioUrl: chunk.originalAudioUrl,
      vadData: chunk.vadData || [],
      metrics: chunk.metrics || this.createDefaultMetrics(),
      originalSize: chunk.originalSize || 0,
      processedSize: chunk.processedSize || 0,
      noiseRemoved: chunk.noiseRemoved || 0,
      isPlaying: false,
      isValid: chunk.isValid !== false,
      currentlyPlayingType: null,
    };
  }

  private createDefaultMetrics(): ProcessedChunk['metrics'] {
    return {
      noiseReductionLevel: 0,
      processingLatency: 0,
      inputLevel: 0,
      outputLevel: 0,
      timestamp: Date.now(),
      frameCount: 0,
      droppedFrames: 0,
    };
  }

  private createResult(
    chunks: ProcessedChunk[],
    processedBuffer?: ArrayBuffer
  ): AudioProcessingResult {
    const totalVad = chunks.reduce((sum, chunk) => sum + chunk.averageVad, 0);
    const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.duration, 0);

    return {
      chunks,
      processedBuffer: processedBuffer || new ArrayBuffer(0),
      averageVad: chunks.length > 0 ? totalVad / chunks.length : 0,
      totalDuration,
      metadata: {
        sampleRate: 48000,
        channels: 1,
        originalDuration: totalDuration,
      },
    };
  }

  private notifyProgress(progress: number): void {
    this.progressCallbacks.forEach(cb => cb(progress));
  }

  private notifyMetrics(metrics: ProcessingMetrics): void {
    this.metricsCallbacks.forEach(cb => cb(metrics));
    this.metricsManager?.recordMetrics(metrics);
  }

  private notifyChunk(chunk: ProcessedChunk): void {
    this.chunkCallbacks.forEach(cb => cb(chunk));
  }

  // Method to clean up resources
  getCurrentStream(): MediaStream | undefined {
    return this.currentStream;
  }

  public cleanup(): void {
    // Cancel any ongoing processing
    this.cancel();

    // Stop all media tracks
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => {
        track.stop();
        // Also remove all event listeners from the track
        track.removeEventListener('ended', () => {});
        track.removeEventListener('mute', () => {});
      });
      this.currentStream = undefined;
    }

    // Reset state
    this.currentAGCSetting = false;
    this.isProcessingFlag = false;
    this.abortController = undefined;

    // Clear all callbacks to prevent memory leaks
    this.progressCallbacks.clear();
    this.metricsCallbacks.clear();
    this.chunkCallbacks.clear();

    this.logger?.info('Audio resources cleaned up successfully');
  }

  // Method to destroy everything including the engine
  public async destroyEngine(): Promise<void> {
    // First cleanup local resources
    this.cleanup();

    // Cancel any ongoing processing
    this.cancel();

    // Clear all callbacks
    this.progressCallbacks.clear();
    this.metricsCallbacks.clear();
    this.chunkCallbacks.clear();

    // Destroy the engine
    try {
      await engineRegistry.destroyEngine();
      this.logger?.info('Engine destroyed successfully');
    } catch (error) {
      this.logger?.error('Failed to destroy engine:', error);
    }
  }
}
