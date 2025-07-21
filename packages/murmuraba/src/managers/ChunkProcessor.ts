import { EventEmitter } from '../core/EventEmitter';
import { Logger } from '../core/Logger';
import { ChunkMetrics, ChunkConfig, ProcessingMetrics } from '../types';
import { MetricsManager } from './MetricsManager';

interface ChunkEvents {
  'chunk-ready': (chunk: AudioChunk) => void;
  'chunk-processed': (metrics: ChunkMetrics) => void;
  [key: string]: (...args: any[]) => void;
}

interface AudioChunk {
  id: string;
  data: Float32Array;
  startTime: number;
  endTime: number;
  sampleRate: number;
  channelCount: number;
}

export class ChunkProcessor extends EventEmitter<ChunkEvents> {
  private logger: Logger;
  private config: Required<ChunkConfig>;
  private currentChunk: Float32Array[] = [];
  private chunkStartTime: number = Date.now();
  private chunkIndex: number = 0;
  private sampleRate: number;
  private samplesPerChunk: number;
  private currentSampleCount: number = 0;
  private overlapBuffer: Float32Array[] = [];
  private metricsManager: MetricsManager;
  
  constructor(
    sampleRate: number,
    config: ChunkConfig,
    logger: Logger,
    metricsManager: MetricsManager
  ) {
    super();
    this.logger = logger;
    this.sampleRate = sampleRate;
    this.metricsManager = metricsManager;
    
    this.config = {
      chunkDuration: config.chunkDuration,
      onChunkProcessed: config.onChunkProcessed || undefined,
      overlap: config.overlap || 0,
    } as Required<ChunkConfig>;
    
    // Calculate samples per chunk
    this.samplesPerChunk = Math.floor(
      (this.config.chunkDuration / 1000) * this.sampleRate
    );
    
    this.logger.info(`ChunkProcessor initialized:`, {
      sampleRate: this.sampleRate,
      chunkDuration: this.config.chunkDuration,
      samplesPerChunk: this.samplesPerChunk,
      overlap: this.config.overlap,
    });
  }
  
  /**
   * Add samples to the current chunk
   */
  addSamples(samples: Float32Array): void {
    // Initialize start time on first sample if not already set
    if (this.chunkStartTime === 0) {
      this.chunkStartTime = Date.now();
    }
    
    this.currentChunk.push(new Float32Array(samples));
    this.currentSampleCount += samples.length;
    
    // Check if we have enough samples for a chunk
    while (this.currentSampleCount >= this.samplesPerChunk) {
      this.processCurrentChunk();
    }
  }
  
  /**
   * Process the current chunk
   */
  private processCurrentChunk(): void {
    const chunkId = `chunk-${this.chunkIndex++}`;
    const endTime = Date.now();
    
    // Combine all samples into a single array
    const totalSamples = this.extractChunkSamples();
    
    // Apply overlap if configured
    const processedSamples = this.applyOverlap(totalSamples);
    
    // Create chunk object
    const chunk: AudioChunk = {
      id: chunkId,
      data: processedSamples,
      startTime: this.chunkStartTime,
      endTime: endTime,
      sampleRate: this.sampleRate,
      channelCount: 1,
    };
    
    // Emit chunk ready event
    this.emit('chunk-ready', chunk);
    
    // Calculate and emit metrics
    this.emitChunkMetrics(chunk, totalSamples, processedSamples);
    
    // Reset for next chunk
    this.chunkStartTime = endTime;
  }
  
  /**
   * Extract samples for current chunk
   */
  private extractChunkSamples(): Float32Array {
    const result = new Float32Array(this.samplesPerChunk);
    let offset = 0;
    let remainingSamples = this.samplesPerChunk;
    
    while (remainingSamples > 0 && this.currentChunk.length > 0) {
      const buffer = this.currentChunk[0];
      const samplesToTake = Math.min(remainingSamples, buffer.length);
      
      // Copy samples
      result.set(buffer.subarray(0, samplesToTake), offset);
      offset += samplesToTake;
      remainingSamples -= samplesToTake;
      
      if (samplesToTake === buffer.length) {
        // Used entire buffer
        this.currentChunk.shift();
      } else {
        // Partial buffer used, keep remainder
        this.currentChunk[0] = buffer.subarray(samplesToTake);
      }
    }
    
    this.currentSampleCount -= this.samplesPerChunk;
    return result;
  }
  
  /**
   * Apply overlap window to smooth chunk transitions
   */
  private applyOverlap(samples: Float32Array): Float32Array {
    if (this.config.overlap === 0) {
      return samples;
    }
    
    const overlapSamples = Math.floor(this.samplesPerChunk * this.config.overlap);
    const result = new Float32Array(samples.length);
    
    // Copy main samples
    result.set(samples);
    
    // Apply overlap from previous chunk
    if (this.overlapBuffer.length > 0) {
      const previousOverlap = this.combineBuffers(this.overlapBuffer);
      const fadeLength = Math.min(overlapSamples, previousOverlap.length);
      
      // Crossfade between chunks
      for (let i = 0; i < fadeLength; i++) {
        const fadeIn = i / fadeLength;
        const fadeOut = 1 - fadeIn;
        result[i] = result[i] * fadeIn + previousOverlap[i] * fadeOut;
      }
    }
    
    // Save overlap for next chunk
    this.overlapBuffer = [samples.subarray(samples.length - overlapSamples)];
    
    return result;
  }
  
  /**
   * Calculate and emit chunk metrics
   */
  private emitChunkMetrics(
    chunk: AudioChunk,
    originalSamples: Float32Array,
    processedSamples: Float32Array
  ): void {
    // Calculate metrics
    const originalRMS = this.metricsManager.calculateRMS(originalSamples);
    const processedRMS = this.metricsManager.calculateRMS(processedSamples);
    const originalPeak = this.metricsManager.calculatePeak(originalSamples);
    const processedPeak = this.metricsManager.calculatePeak(processedSamples);
    
    const noiseRemoved = originalRMS > 0 
      ? ((originalRMS - processedRMS) / originalRMS) * 100 
      : 0;
    
    const metrics: ChunkMetrics = {
      originalSize: originalSamples.length * 4, // Float32 = 4 bytes
      processedSize: processedSamples.length * 4,
      noiseRemoved: Math.max(0, Math.min(100, noiseRemoved)),
      metrics: {
        noiseReductionLevel: noiseRemoved,
        processingLatency: chunk.endTime - chunk.startTime,
        inputLevel: originalPeak,
        outputLevel: processedPeak,
        timestamp: chunk.endTime,
        frameCount: Math.floor(processedSamples.length / 480), // RNNoise frame size
        droppedFrames: 0,
      },
      duration: this.config.chunkDuration,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
    };
    
    // Record metrics in metrics manager
    this.metricsManager.recordChunk(metrics);
    
    // Emit to listeners
    this.emit('chunk-processed', metrics);
    
    // Call user callback if provided
    if (this.config.onChunkProcessed) {
      try {
        this.config.onChunkProcessed(metrics);
      } catch (error) {
        this.logger.error('Error in chunk processed callback:', error);
      }
    }
    
    this.logger.debug(`Chunk ${chunk.id} processed:`, {
      duration: `${metrics.duration}ms`,
      noiseRemoved: `${metrics.noiseRemoved.toFixed(1)}%`,
      latency: `${metrics.metrics.processingLatency}ms`,
    });
  }
  
  /**
   * Force process remaining samples as final chunk
   */
  flush(): void {
    if (this.currentSampleCount > 0) {
      this.logger.info(`Flushing final chunk with ${this.currentSampleCount} samples`);
      
      // Pad with silence if needed
      const remainingSamples = this.samplesPerChunk - this.currentSampleCount;
      if (remainingSamples > 0) {
        this.addSamples(new Float32Array(remainingSamples));
      }
      
      this.processCurrentChunk();
    }
    
    this.reset();
  }
  
  /**
   * Reset the processor
   */
  reset(): void {
    this.currentChunk = [];
    this.overlapBuffer = [];
    this.currentSampleCount = 0;
    this.chunkIndex = 0;
    this.chunkStartTime = Date.now();
    this.logger.debug('ChunkProcessor reset');
  }
  
  /**
   * Combine multiple buffers into one
   */
  private combineBuffers(buffers: Float32Array[]): Float32Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    
    return result;
  }
  
  /**
   * Get current buffer status
   */
  getStatus(): {
    currentSampleCount: number;
    samplesPerChunk: number;
    chunkIndex: number;
    bufferFillPercentage: number;
  } {
    return {
      currentSampleCount: this.currentSampleCount,
      samplesPerChunk: this.samplesPerChunk,
      chunkIndex: this.chunkIndex,
      bufferFillPercentage: (this.currentSampleCount / this.samplesPerChunk) * 100,
    };
  }
}