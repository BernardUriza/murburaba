import { ProcessingMetrics, ChunkMetrics } from '../types';
import { EventEmitter } from '../core/EventEmitter';

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
    console.log(`[MetricsManager] Starting auto-update with interval: ${intervalMs}ms`);
    console.log('[MetricsManager] Current listeners:', this.listenerCount('metrics-update'));
    
    // Emit initial metrics immediately
    const initialMetrics = { ...this.metrics };
    console.log('[MetricsManager] Emitting initial metrics:', initialMetrics);
    this.emit('metrics-update', initialMetrics);
    
    this.updateInterval = setInterval(() => {
      this.calculateLatency();
      const metricsSnapshot = { ...this.metrics };
      console.log('[MetricsManager] Auto-update tick:', {
        inputLevel: metricsSnapshot.inputLevel,
        frameCount: metricsSnapshot.frameCount,
        timestamp: new Date(metricsSnapshot.timestamp).toISOString(),
        listeners: this.listenerCount('metrics-update')
      });
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
    
    // Log only when level changes significantly
    if (Math.abs(oldLevel - this.metrics.inputLevel) > 0.01) {
      console.log('[MetricsManager] Input level updated:', {
        oldLevel: oldLevel.toFixed(4),
        newLevel: this.metrics.inputLevel.toFixed(4),
        rawLevel: level.toFixed(4),
        listeners: this.listenerCount('metrics-update')
      });
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
    this.metrics.noiseReductionLevel = Math.max(0, Math.min(100, level));
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