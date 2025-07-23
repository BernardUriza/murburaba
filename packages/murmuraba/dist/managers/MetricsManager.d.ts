import { ProcessingMetrics, ChunkMetrics } from '../types';
import { EventEmitter } from '../core/EventEmitter';
interface MetricsEvents {
    'metrics-update': (metrics: ProcessingMetrics) => void;
    'chunk-processed': (chunk: ChunkMetrics) => void;
    [key: string]: (...args: any[]) => void;
}
export declare class MetricsManager extends EventEmitter<MetricsEvents> {
    private metrics;
    private updateInterval?;
    private frameTimestamps;
    private maxFrameHistory;
    private vadHistory;
    private currentVAD;
    startAutoUpdate(intervalMs?: number): void;
    stopAutoUpdate(): void;
    updateInputLevel(level: number): void;
    updateOutputLevel(level: number): void;
    updateNoiseReduction(level: number): void;
    recordFrame(timestamp?: number): void;
    recordDroppedFrame(): void;
    recordChunk(chunk: ChunkMetrics): void;
    private calculateLatency;
    getMetrics(): ProcessingMetrics;
    reset(): void;
    calculateRMS(samples: Float32Array): number;
    calculatePeak(samples: Float32Array): number;
    updateVAD(vad: number): void;
    getAverageVAD(): number;
    getVoiceActivityPercentage(): number;
}
export {};
//# sourceMappingURL=MetricsManager.d.ts.map