/**
 * Modern async audio processing service
 * 
 * @module features/audio-processing/services
 */

import { EventEmitter, type EventHandler } from '../../../core/EventEmitter';
import type { ILogger } from '../../../core/interfaces';
import { Result, Ok, Err, tryCatchAsync } from '../../../types/result';
import type { StreamId, ChunkId, SessionId } from '../../../types/branded';
import type { ProcessedChunk, ProcessingMetrics } from '../../../types';
import { retry, withRetry, CircuitBreaker, RetryError } from '../../../utils/retry';

// Modern event types with strict typing
export interface AudioServiceEvents extends Record<string, EventHandler> {
  'chunk-ready': (chunk: ProcessedChunk) => void;
  'processing-complete': (sessionId: SessionId) => void;
  'error': (error: AudioProcessingError) => void;
  'metrics-update': (metrics: ProcessingMetrics) => void;
}

// Custom error types
export class AudioProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AudioProcessingError';
  }
}

export interface AudioProcessingOptions {
  chunkSize: number;
  sampleRate: number;
  enableNoiseSuppression: boolean;
  enableAutoGainControl: boolean;
  maxRetries: number;
  timeoutMs: number;
}

const DEFAULT_OPTIONS: AudioProcessingOptions = {
  chunkSize: 4096,
  sampleRate: 48000,
  enableNoiseSuppression: true,
  enableAutoGainControl: false,
  maxRetries: 3,
  timeoutMs: 30000,
};

/**
 * Modern audio processing service with async/await patterns
 * 
 * @example
 * ```typescript
 * const service = new ModernAudioService(logger);
 * 
 * // Process audio with automatic retry
 * const result = await service.processAudioBuffer(buffer, {
 *   enableNoiseSuppression: true,
 *   maxRetries: 5
 * });
 * 
 * if (!result.ok) {
 *   console.error('Processing failed:', result.error);
 *   return;
 * }
 * 
 * console.log('Processed audio:', result.value);
 * ```
 */
export class ModernAudioService extends EventEmitter<AudioServiceEvents> {
  private readonly breaker = new CircuitBreaker(5, 60000);
  private activeProcessing = new Map<SessionId, AbortController>();
  
  constructor(
    private readonly logger: ILogger,
    private readonly options: Partial<AudioProcessingOptions> = {}
  ) {
    super();
  }
  
  /**
   * Process audio buffer with modern async patterns
   */
  async processAudioBuffer(
    buffer: ArrayBuffer,
    options?: Partial<AudioProcessingOptions>
  ): Promise<Result<ProcessedChunk, AudioProcessingError>> {
    const opts = { ...DEFAULT_OPTIONS, ...this.options, ...options };
    
    // Use circuit breaker for resilience
    const breakerResult = await this.breaker.execute(async () => {
      return this.processWithRetry(buffer, opts);
    });
    
    if (!breakerResult.ok) {
      return Err(new AudioProcessingError(
        'Service temporarily unavailable',
        'CIRCUIT_BREAKER_OPEN',
        breakerResult.error
      ));
    }
    
    return breakerResult.value;
  }
  
  /**
   * Process with automatic retry
   */
  private async processWithRetry(
    buffer: ArrayBuffer,
    options: AudioProcessingOptions
  ): Promise<Result<ProcessedChunk, AudioProcessingError>> {
    const result = await retry(
      () => this.processInternal(buffer, options),
      {
        maxAttempts: options.maxRetries,
        shouldRetry: (error) => {
          // Don't retry on validation errors
          if (error instanceof AudioProcessingError) {
            return !['INVALID_INPUT', 'UNSUPPORTED_FORMAT'].includes(error.code);
          }
          return true;
        },
        onRetry: (error, attempt, delay) => {
          this.logger.warn('Retrying audio processing', {
            attempt,
            delay,
            error: error.message,
          });
        },
      }
    );
    
    // Convert RetryError to AudioProcessingError
    if (!result.ok) {
      return Err(new AudioProcessingError(
        result.error.message,
        'PROCESSING_FAILED',
        result.error
      ));
    }
    
    return result;
  }
  
  /**
   * Internal processing implementation
   */
  private async processInternal(
    buffer: ArrayBuffer,
    options: AudioProcessingOptions
  ): Promise<ProcessedChunk> {
    // Validate input
    if (buffer.byteLength === 0) {
      throw new AudioProcessingError(
        'Empty audio buffer',
        'INVALID_INPUT'
      );
    }
    
    // Convert to float samples
    const samples = await this.decodeAudioData(buffer, options.sampleRate);
    
    // Apply processing
    const processed = await this.applyProcessingPipeline(samples, options);
    
    // Create chunk
    const chunk: ProcessedChunk = {
      id: this.generateChunkId(),
      startTime: Date.now(),
      endTime: Date.now() + (samples.length / options.sampleRate) * 1000,
      duration: samples.length / options.sampleRate,
      vadScore: 0.8, // Placeholder
      averageVad: 0.75,
      processedAudioUrl: await this.createAudioUrl(processed),
      originalAudioUrl: await this.createAudioUrl(samples),
      vadData: [],
      metrics: this.createMetrics(samples, processed),
      originalSize: buffer.byteLength,
      processedSize: processed.length * 4,
      noiseRemoved: 25, // Placeholder
      isPlaying: false,
      isValid: true,
    };
    
    this.emit('chunk-ready', chunk);
    return chunk;
  }
  
  /**
   * Decode audio data to float samples
   */
  private async decodeAudioData(
    buffer: ArrayBuffer,
    targetSampleRate: number
  ): Promise<Float32Array> {
    return tryCatchAsync(
      async () => {
        // In a real implementation, this would use Web Audio API
        const audioContext = new AudioContext({ sampleRate: targetSampleRate });
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        const samples = audioBuffer.getChannelData(0);
        audioContext.close();
        return samples;
      },
      (error: any) => new AudioProcessingError(
        'Failed to decode audio',
        'DECODE_ERROR',
        error
      )
    ).then((result: any) => {
      if (!result.ok) throw result.error;
      return result.value;
    });
  }
  
  /**
   * Apply processing pipeline
   */
  private async applyProcessingPipeline(
    samples: Float32Array,
    options: AudioProcessingOptions
  ): Promise<Float32Array> {
    let processed = samples;
    
    if (options.enableNoiseSuppression) {
      processed = await this.applyNoiseSuppression(processed);
    }
    
    if (options.enableAutoGainControl) {
      processed = await this.applyAutoGainControl(processed);
    }
    
    return processed;
  }
  
  /**
   * Apply noise suppression
   */
  private async applyNoiseSuppression(
    samples: Float32Array
  ): Promise<Float32Array> {
    // Placeholder - would integrate with RNNoise
    return samples;
  }
  
  /**
   * Apply automatic gain control
   */
  private async applyAutoGainControl(
    samples: Float32Array
  ): Promise<Float32Array> {
    // Simple AGC implementation
    const targetLevel = 0.7;
    const maxSample = Math.max(...samples.map(Math.abs));
    
    if (maxSample > 0) {
      const gain = targetLevel / maxSample;
      return samples.map(s => s * gain);
    }
    
    return samples;
  }
  
  /**
   * Create audio URL from samples
   */
  private async createAudioUrl(samples: Float32Array): Promise<string> {
    // Convert to WAV and create blob URL
    const wav = this.samplesToWav(samples, 48000);
    const blob = new Blob([wav], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }
  
  /**
   * Convert samples to WAV format
   */
  private samplesToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const length = samples.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return buffer;
  }
  
  /**
   * Create processing metrics
   */
  private createMetrics(
    original: Float32Array,
    processed: Float32Array
  ): ProcessingMetrics {
    return {
      noiseReductionLevel: 0.25,
      processingLatency: 50,
      inputLevel: this.calculateRMS(original),
      outputLevel: this.calculateRMS(processed),
      vadProbability: 0.75,
      framesProcessed: processed.length,
      chunksProcessed: 1,
      totalDuration: processed.length / 48000,
      droppedFrames: 0,
      audioQuality: 0.9,
      timestamp: Date.now(),
      frameCount: Math.floor(processed.length / 512),
    };
  }
  
  /**
   * Calculate RMS of audio samples
   */
  private calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }
  
  /**
   * Generate unique chunk ID
   */
  private generateChunkId(): ChunkId {
    return ('chunk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)) as ChunkId;
  }
  
  /**
   * Cancel all active processing
   */
  async cancelAll(): Promise<void> {
    for (const [sessionId, controller] of this.activeProcessing) {
      controller.abort();
      this.logger.info('Cancelled processing session', { sessionId });
    }
    this.activeProcessing.clear();
  }
  
  /**
   * Get service health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    circuitBreakerState: 'closed' | 'open' | 'half-open';
    activeProcessingCount: number;
  } {
    return {
      isHealthy: this.breaker.getState() !== 'open',
      circuitBreakerState: this.breaker.getState(),
      activeProcessingCount: this.activeProcessing.size,
    };
  }
}
