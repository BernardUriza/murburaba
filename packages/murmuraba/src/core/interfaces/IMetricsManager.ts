import { ProcessingMetrics } from '../../types';

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
}
