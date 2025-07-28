import { ProcessingMetrics, ChunkMetrics } from '../types';
import { EventEmitter } from '../core/EventEmitter';
import { logging } from './LoggingManager';
import { createDefaultMetrics } from '../utils/defaultMetrics';
import { calculateRMS, calculatePeak, calculateAverage } from '../utils/audioCalculations';

interface MetricsEvents {
  'metrics-update': (metrics: ProcessingMetrics) => void;
  'chunk-processed': (chunk: ChunkMetrics) => void;
  [key: string]: (...args: any[]) => void;
}

export class MetricsManager extends EventEmitter<MetricsEvents> {
  private metrics: ProcessingMetrics = createDefaultMetrics();

  private updateInterval?: NodeJS.Timeout;
  private frameTimestamps: number[] = [];
  private maxFrameHistory = 100;
  private vadHistory: number[] = [];
  private currentVAD = 0;

  startAutoUpdate(intervalMs: number = 100): void {
    this.stopAutoUpdate();

    this.emit('metrics-update', { ...this.metrics });

    this.updateInterval = setInterval(() => {
      this.calculateLatency();
      this.emit('metrics-update', { ...this.metrics });
    }, intervalMs);
  }

  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  updateInputLevel(level: number): void {
    this.metrics.inputLevel = Math.max(0, Math.min(1, level));
    this.emit('metrics-update', { ...this.metrics });
  }

  updateOutputLevel(level: number): void {
    this.metrics.outputLevel = Math.max(0, Math.min(1, level));
    this.emit('metrics-update', { ...this.metrics });
  }

  updateNoiseReduction(level: number): void {
    this.metrics.noiseReductionLevel = Math.max(0, Math.min(1, level));
  }

  recordFrame(timestamp: number = Date.now()): void {
    this.frameTimestamps.push(timestamp);
    if (this.frameTimestamps.length > this.maxFrameHistory) {
      this.frameTimestamps.shift();
    }
    this.metrics.frameCount++;
    this.metrics.timestamp = timestamp;
  }

  recordDroppedFrame(): void {
    this.metrics.droppedFrames++;
  }

  recordChunk(chunk: ChunkMetrics): void {
    this.emit('chunk-processed', chunk);
  }

  private calculateLatency(): void {
    if (this.frameTimestamps.length < 2) {
      this.metrics.processingLatency = 0;
      return;
    }

    const deltas: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      deltas.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
    }

    this.metrics.processingLatency = calculateAverage(deltas);
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = createDefaultMetrics();
    this.frameTimestamps = [];
  }

  calculateRMS(samples: Float32Array): number {
    return calculateRMS(samples);
  }

  calculatePeak(samples: Float32Array): number {
    return calculatePeak(samples);
  }

  updateVAD(vad: number): void {
    this.currentVAD = vad;
    this.vadHistory.push(vad);
    if (this.vadHistory.length > this.maxFrameHistory) {
      this.vadHistory.shift();
    }
  }

  getAverageVAD(): number {
    return calculateAverage(this.vadHistory);
  }

  getVoiceActivityPercentage(): number {
    if (this.vadHistory.length === 0) return 0;
    const voiceFrames = this.vadHistory.filter(v => v > 0.5).length;
    return (voiceFrames / this.vadHistory.length) * 100;
  }

  onMetricsUpdate(callback: (metrics: ProcessingMetrics) => void): () => void {
    this.on('metrics-update', callback);
    return () => this.off('metrics-update', callback);
  }

  // IMetricsManager interface methods (stubs for now)
  recordMetrics(metrics: ProcessingMetrics): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  getLatestMetrics(): ProcessingMetrics | null {
    return this.getMetrics();
  }

  getMetricsHistory(duration?: number): Array<{ timestamp: number; metrics: ProcessingMetrics }> {
    return [];
  }

  getAggregatedMetrics(duration?: number): any {
    return {
      avgNoiseReduction: this.metrics.noiseReductionLevel,
      avgLatency: this.metrics.processingLatency,
      avgInputLevel: this.metrics.inputLevel,
      avgOutputLevel: this.metrics.outputLevel,
      totalFrames: this.metrics.frameCount,
      totalDroppedFrames: this.metrics.droppedFrames,
      period: duration || 0
    };
  }

  clearHistory(): void {
    this.vadHistory = [];
    this.frameTimestamps = [];
  }

  setHistoryLimit(limit: number): void {
    this.maxFrameHistory = limit;
  }
}
