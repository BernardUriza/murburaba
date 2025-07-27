import { ProcessingMetrics, ChunkMetrics } from '../types';
import { EventEmitter } from '../core/EventEmitter';
import { logging } from './LoggingManager';

interface MetricsEvents {
  'metrics-update': (metrics: ProcessingMetrics) => void;
  'chunk-processed': (chunk: ChunkMetrics) => void;
  [key: string]: (...args: any[]) => void;
}

export class MetricsManager extends EventEmitter<MetricsEvents> {
  private metrics: ProcessingMetrics = {
    noiseReductionLevel: 0,
    processingLatency: 0,
    inputLevel: 0,
    outputLevel: 0,
    timestamp: Date.now(),
    frameCount: 0,
    droppedFrames: 0,
  };

  private updateInterval?: NodeJS.Timeout;
  private frameTimestamps: number[] = [];
  private maxFrameHistory = 100;
  private vadHistory: number[] = [];
  private currentVAD = 0;

  startAutoUpdate(intervalMs: number = 100): void {
    this.stopAutoUpdate();

    // Emit initial metrics immediately
    const initialMetrics = { ...this.metrics };
    this.emit('metrics-update', initialMetrics);

    this.updateInterval = setInterval(() => {
      this.calculateLatency();
      const metricsSnapshot = { ...this.metrics };
      // Removed excessive logging - was logging every 100ms
      this.emit('metrics-update', metricsSnapshot);
    }, intervalMs);
  }

  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  updateInputLevel(level: number): void {
    const oldLevel = this.metrics.inputLevel;
    this.metrics.inputLevel = Math.max(0, Math.min(1, level));
    
    // Only log significant changes (>10%)
    const change = Math.abs(level - oldLevel);
    if (change > 0.1) {
      logging.metric('inputLevel', level);
    }

    // Emit update immediately for real-time feedback
    this.emit('metrics-update', { ...this.metrics });
  }

  updateOutputLevel(level: number): void {
    this.metrics.outputLevel = Math.max(0, Math.min(1, level));
    // Emit update immediately for real-time feedback
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

    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    this.metrics.processingLatency = avgDelta;
  }

  getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      noiseReductionLevel: 0,
      processingLatency: 0,
      inputLevel: 0,
      outputLevel: 0,
      timestamp: Date.now(),
      frameCount: 0,
      droppedFrames: 0,
    };
    this.frameTimestamps = [];
  }

  calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  calculatePeak(samples: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    return peak;
  }

  updateVAD(vad: number): void {
    this.currentVAD = vad;
    this.vadHistory.push(vad);
    if (this.vadHistory.length > this.maxFrameHistory) {
      this.vadHistory.shift();
    }
    
    // Only log significant VAD events
    if (vad > 0.5 && this.vadHistory.length > 0) {
      const prevVad = this.vadHistory[this.vadHistory.length - 2] || 0;
      if (prevVad <= 0.5) {
        logging.metric('voiceDetected', vad);
      }
    }
  }

  getAverageVAD(): number {
    if (this.vadHistory.length === 0) return 0;
    return this.vadHistory.reduce((a, b) => a + b, 0) / this.vadHistory.length;
  }

  getVoiceActivityPercentage(): number {
    if (this.vadHistory.length === 0) return 0;
    const voiceFrames = this.vadHistory.filter(v => v > 0.5).length;
    return (voiceFrames / this.vadHistory.length) * 100;
  }
}
