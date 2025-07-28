import { ProcessingMetrics, ChunkMetrics } from '../../types';

export interface MetricSnapshot {
  timestamp: number;
  metrics: ProcessingMetrics;
}

export interface AggregatedMetrics {
  avgNoiseReduction: number;
  avgLatency: number;
  avgInputLevel: number;
  avgOutputLevel: number;
  totalFrames: number;
  totalDroppedFrames: number;
  period: number;
}

export interface IMetricsManager {
  recordMetrics(metrics: ProcessingMetrics): void;
  getLatestMetrics(): ProcessingMetrics | null;
  getMetricsHistory(duration?: number): MetricSnapshot[];
  getAggregatedMetrics(duration?: number): AggregatedMetrics;
  clearHistory(): void;
  setHistoryLimit(limit: number): void;
  onMetricsUpdate(callback: (metrics: ProcessingMetrics) => void): () => void;
  
  // Additional methods used by MurmubaraEngine
  getMetrics(): ProcessingMetrics;
  updateInputLevel(level: number): void;
  updateOutputLevel(level: number): void;
  updateVAD(vad: number): void;
  updateNoiseReduction(reduction: number): void;
  calculatePeak(samples: Float32Array): number;
  calculateRMS(samples: Float32Array): number;
  recordFrame(): void;
  recordChunk(chunk: ChunkMetrics): void;
  startAutoUpdate(interval: number): void;
  stopAutoUpdate(): void;
  on(event: 'metrics-update', callback: (metrics: ProcessingMetrics) => void): void;
  emitMetricsUpdate?(): void;
}
