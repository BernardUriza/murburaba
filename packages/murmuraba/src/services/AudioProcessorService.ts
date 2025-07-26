import { TOKENS, DIContainer } from '../core/DIContainer';
import { IAudioProcessor, AudioProcessingOptions, AudioProcessingResult } from '../core/interfaces/IAudioProcessor';
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
  
  constructor(private container?: DIContainer) {
    if (container) {
      this.logger = container.get<ILogger>(TOKENS.Logger);
      this.metricsManager = container.get<IMetricsManager>(TOKENS.MetricsManager);
    }
  }
  
  async processFile(
    file: File | ArrayBuffer,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult> {
    this.isProcessingFlag = true;
    this.abortController = new AbortController();
    
    try {
      const arrayBuffer = file instanceof File 
        ? await file.arrayBuffer() 
        : file;
      
      const engine = engineRegistry.getEngine();
      const result = await this.processArrayBuffer(arrayBuffer, options);
      
      this.logger.info('File processing completed', {
        chunks: result.chunks.length,
        duration: result.totalDuration
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
        chunkDuration: options?.chunkDuration || 8000,
        onChunkProcessed: (chunk: any) => {
          const processedChunk = this.normalizeChunk(chunk);
          chunks.push(processedChunk);
          this.notifyChunk(processedChunk);
        }
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
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: options?.enableAGC ?? false
      }
    });
    
    try {
      return await this.processStream(stream, {
        ...options,
        chunkDuration: Math.min(duration, options?.chunkDuration || 8000)
      });
    } finally {
      stream.getTracks().forEach(track => track.stop());
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
    // Modern implementation using MurmurabaSuite architecture
    const chunks: ProcessedChunk[] = [];
    const engine = engineRegistry.getEngine();
    
    // Process and collect chunks
    // ... (simplified implementation)
    
    const processedBuffer = await engine.processFile(arrayBuffer);
    
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
      currentlyPlayingType: null
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
      droppedFrames: 0
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
        originalDuration: totalDuration
      }
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
}