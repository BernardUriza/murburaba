/**
 * Optimized metrics manager using circular buffer for better performance
 */

import { EventEmitter } from '../core/EventEmitter';
import { MetricsBuffer } from '../utils/CircularBuffer';
import { ProcessingMetrics, ChunkMetrics } from '../types';
import { AudioLevel, VADProbability } from '../types/branded';

interface MetricSample {
  value: number;
  timestamp: number;
}

interface MetricsEvents {
  'metrics-update': (metrics: ProcessingMetrics) => void;
  'chunk-processed': (chunk: ChunkMetrics) => void;
  [key: string]: (...args: any[]) => void;
}

export class OptimizedMetricsManager extends EventEmitter<MetricsEvents> {
  // Circular buffers for different metrics
  private readonly inputLevelBuffer: MetricsBuffer<MetricSample>;
  private readonly outputLevelBuffer: MetricsBuffer<MetricSample>;
  private readonly vadBuffer: MetricsBuffer<MetricSample>;
  private readonly noiseReductionBuffer: MetricsBuffer<MetricSample>;
  private readonly latencyBuffer: MetricsBuffer<MetricSample>;
  
  // Current metrics snapshot
  private currentMetrics: ProcessingMetrics = {
    noiseReductionLevel: 0,
    processingLatency: 0,
    inputLevel: 0,
    outputLevel: 0,
    vadProbability: 0,
    framesProcessed: 0,
    chunksProcessed: 0,
    totalDuration: 0,
    droppedFrames: 0,
    audioQuality: 1,
    timestamp: Date.now(),
    frameCount: 0,
  };
  
  // Performance tracking
  private frameCount = 0;
  private chunkCount = 0;
  private lastUpdateTime = Date.now();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  
  // Configuration
  private readonly bufferSize: number;
  private readonly aggregationWindowMs: number;
  
  constructor(bufferSize = 1000, aggregationWindowMs = 5000) {
    super();
    this.bufferSize = bufferSize;
    this.aggregationWindowMs = aggregationWindowMs;
    
    // Initialize circular buffers
    this.inputLevelBuffer = new MetricsBuffer(bufferSize);
    this.outputLevelBuffer = new MetricsBuffer(bufferSize);
    this.vadBuffer = new MetricsBuffer(bufferSize);
    this.noiseReductionBuffer = new MetricsBuffer(bufferSize);
    this.latencyBuffer = new MetricsBuffer(bufferSize);
  }
  
  /**
   * Update input level
   */
  updateInputLevel(level: number): void {
    const audioLevel = AudioLevel(Math.max(0, Math.min(1, level)));
    this.inputLevelBuffer.push({
      value: audioLevel,
      timestamp: Date.now(),
    });
    this.currentMetrics.inputLevel = audioLevel;
    this.scheduleUpdate();
  }
  
  /**
   * Update output level
   */
  updateOutputLevel(level: number): void {
    const audioLevel = AudioLevel(Math.max(0, Math.min(1, level)));
    this.outputLevelBuffer.push({
      value: audioLevel,
      timestamp: Date.now(),
    });
    this.currentMetrics.outputLevel = audioLevel;
    this.scheduleUpdate();
  }
  
  /**
   * Update VAD probability
   */
  updateVAD(vad: number): void {
    const vadProb = VADProbability(Math.max(0, Math.min(1, vad)));
    this.vadBuffer.push({
      value: vadProb,
      timestamp: Date.now(),
    });
    this.currentMetrics.vadProbability = vadProb;
    this.scheduleUpdate();
  }
  
  /**
   * Update noise reduction
   */
  updateNoiseReduction(reduction: number): void {
    const clampedReduction = Math.max(0, Math.min(1, reduction));
    this.noiseReductionBuffer.push({
      value: clampedReduction,
      timestamp: Date.now(),
    });
    this.currentMetrics.noiseReductionLevel = clampedReduction;
    this.scheduleUpdate();
  }
  
  /**
   * Update processing latency
   */
  updateLatency(latencyMs: number): void {
    this.latencyBuffer.push({
      value: latencyMs,
      timestamp: Date.now(),
    });
    this.currentMetrics.processingLatency = latencyMs;
    this.scheduleUpdate();
  }
  
  /**
   * Record a processed frame
   */
  recordFrame(): void {
    this.frameCount++;
    this.currentMetrics.framesProcessed = this.frameCount;
    this.currentMetrics.frameCount = this.frameCount;
  }
  
  /**
   * Record a processed chunk
   */
  recordChunk(chunk: ChunkMetrics): void {
    this.chunkCount++;
    this.currentMetrics.chunksProcessed = this.chunkCount;
    this.currentMetrics.totalDuration += chunk.duration;
    this.emit('chunk-processed', chunk);
  }
  
  /**
   * Get current metrics snapshot
   */
  getMetrics(): ProcessingMetrics {
    // Update aggregated values
    const now = Date.now();
    const windowMs = this.aggregationWindowMs;
    
    // Calculate averages over the aggregation window
    const avgInputLevel = this.inputLevelBuffer.getAverageInWindow(windowMs, now);
    const avgOutputLevel = this.outputLevelBuffer.getAverageInWindow(windowMs, now);
    const avgVAD = this.vadBuffer.getAverageInWindow(windowMs, now);
    const avgNoiseReduction = this.noiseReductionBuffer.getAverageInWindow(windowMs, now);
    const avgLatency = this.latencyBuffer.getAverageInWindow(windowMs, now);
    
    return {
      ...this.currentMetrics,
      inputLevel: avgInputLevel ?? this.currentMetrics.inputLevel,
      outputLevel: avgOutputLevel ?? this.currentMetrics.outputLevel,
      vadProbability: avgVAD ?? this.currentMetrics.vadProbability,
      noiseReductionLevel: avgNoiseReduction ?? this.currentMetrics.noiseReductionLevel,
      processingLatency: avgLatency ?? this.currentMetrics.processingLatency,
      timestamp: now,
    };
  }
  
  /**
   * Get detailed statistics
   */
  getDetailedStats(): {
    inputLevel: { min: number; max: number; avg: number; p95: number } | null;
    outputLevel: { min: number; max: number; avg: number; p95: number } | null;
    vad: { min: number; max: number; avg: number; p95: number } | null;
    latency: { min: number; max: number; avg: number; p95: number } | null;
    bufferStats: {
      inputLevel: { size: number; capacity: number; utilization: number };
      outputLevel: { size: number; capacity: number; utilization: number };
      vad: { size: number; capacity: number; utilization: number };
      latency: { size: number; capacity: number; utilization: number };
    };
  } {
    const now = Date.now();
    const windowMs = this.aggregationWindowMs;
    
    const getStats = (buffer: MetricsBuffer<MetricSample>) => {
      const avg = buffer.getAverageInWindow(windowMs, now);
      const minMax = buffer.getMinMaxInWindow(windowMs, now);
      const p95 = buffer.getPercentileInWindow(95, windowMs, now);
      
      if (avg === null || minMax === null || p95 === null) {
        return null;
      }
      
      return {
        min: minMax.min,
        max: minMax.max,
        avg,
        p95,
      };
    };
    
    return {
      inputLevel: getStats(this.inputLevelBuffer),
      outputLevel: getStats(this.outputLevelBuffer),
      vad: getStats(this.vadBuffer),
      latency: getStats(this.latencyBuffer),
      bufferStats: {
        inputLevel: this.inputLevelBuffer.getStats(),
        outputLevel: this.outputLevelBuffer.getStats(),
        vad: this.vadBuffer.getStats(),
        latency: this.latencyBuffer.getStats(),
      },
    };
  }
  
  /**
   * Calculate peak from audio samples
   */
  calculatePeak(samples: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    return peak;
  }
  
  /**
   * Calculate RMS from audio samples
   */
  calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }
  
  /**
   * Start automatic metrics updates
   */
  startAutoUpdate(intervalMs: number): void {
    this.stopAutoUpdate();
    this.updateInterval = setInterval(() => {
      this.emitMetricsUpdate();
    }, intervalMs);
  }
  
  /**
   * Stop automatic metrics updates
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Schedule a metrics update
   */
  private scheduleUpdate(): void {
    // Debounce updates to avoid too frequent emissions
    const now = Date.now();
    if (now - this.lastUpdateTime > 16) { // ~60fps
      this.emitMetricsUpdate();
      this.lastUpdateTime = now;
    }
  }
  
  /**
   * Emit metrics update event
   */
  private emitMetricsUpdate(): void {
    const metrics = this.getMetrics();
    this.emit('metrics-update', metrics);
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.inputLevelBuffer.clear();
    this.outputLevelBuffer.clear();
    this.vadBuffer.clear();
    this.noiseReductionBuffer.clear();
    this.latencyBuffer.clear();
    
    this.frameCount = 0;
    this.chunkCount = 0;
    
    this.currentMetrics = {
      noiseReductionLevel: 0,
      processingLatency: 0,
      inputLevel: 0,
      outputLevel: 0,
      vadProbability: 0,
      framesProcessed: 0,
      chunksProcessed: 0,
      totalDuration: 0,
      droppedFrames: 0,
      audioQuality: 1,
      timestamp: Date.now(),
      frameCount: 0,
    };
  }
  
  /**
   * IMetricsManager compatibility methods
   */
  recordMetrics(metrics: ProcessingMetrics): void {
    this.updateInputLevel(metrics.inputLevel);
    this.updateOutputLevel(metrics.outputLevel);
    this.updateVAD(metrics.vadProbability);
    this.updateNoiseReduction(metrics.noiseReductionLevel);
    this.updateLatency(metrics.processingLatency);
  }
  
  getLatestMetrics(): ProcessingMetrics | null {
    return this.getMetrics();
  }
  
  getMetricsHistory(duration?: number): Array<{ timestamp: number; metrics: ProcessingMetrics }> {
    // Not implemented in optimized version
    return [];
  }
  
  getAggregatedMetrics(duration?: number): any {
    return this.getDetailedStats();
  }
  
  clearHistory(): void {
    this.clear();
  }
  
  setHistoryLimit(limit: number): void {
    // Buffer size is set in constructor
  }
  
  onMetricsUpdate(callback: (metrics: ProcessingMetrics) => void): () => void {
    this.on('metrics-update', callback);
    return () => this.off('metrics-update', callback);
  }
}