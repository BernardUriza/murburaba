import { EventEmitter } from '../core/EventEmitter';
import { Logger } from '../core/Logger';
import { ChunkMetrics, ChunkConfig } from '../types';
import { MetricsManager } from './MetricsManager';
interface ChunkEvents {
    'chunk-ready': (chunk: AudioChunk) => void;
    'chunk-processed': (metrics: ChunkMetrics) => void;
    'period-complete': (aggregatedMetrics: AggregatedMetrics) => void;
    'frame-processed': (timestamp: number) => void;
    [key: string]: (...args: any[]) => void;
}
interface AggregatedMetrics {
    averageNoiseReduction: number;
    totalFrames: number;
    averageLatency: number;
    periodDuration: number;
    startTime: number;
    endTime: number;
}
interface AudioChunk {
    id: string;
    data: Float32Array;
    startTime: number;
    endTime: number;
    sampleRate: number;
    channelCount: number;
}
export declare class ChunkProcessor extends EventEmitter<ChunkEvents> {
    private logger;
    private config;
    private currentChunk;
    private chunkStartTime;
    private chunkIndex;
    private sampleRate;
    private samplesPerChunk;
    private currentSampleCount;
    private overlapBuffer;
    private metricsManager;
    private accumulatedMetrics;
    constructor(sampleRate: number, config: ChunkConfig, logger: Logger, metricsManager: MetricsManager);
    /**
     * Add samples to the current chunk
     */
    addSamples(samples: Float32Array): void;
    /**
     * Process the current chunk
     */
    private processCurrentChunk;
    /**
     * Extract samples for current chunk
     */
    private extractChunkSamples;
    /**
     * Apply overlap window to smooth chunk transitions
     */
    private applyOverlap;
    /**
     * Calculate and emit chunk metrics
     */
    private emitChunkMetrics;
    /**
     * Force process remaining samples as final chunk
     */
    flush(): void;
    /**
     * Reset the processor
     */
    reset(): void;
    /**
     * Combine multiple buffers into one
     */
    private combineBuffers;
    /**
     * Get current buffer status
     */
    getStatus(): {
        currentSampleCount: number;
        samplesPerChunk: number;
        chunkIndex: number;
        bufferFillPercentage: number;
    };
    /**
     * TDD Integration: Process individual frame and accumulate metrics
     * This allows RecordingManager integration with real-time metrics
     */
    processFrame(originalFrame: Float32Array, timestamp: number, processedFrame?: Float32Array): Promise<void>;
    /**
     * TDD Integration: Complete current period and emit aggregated metrics
     * This is called when RecordingManager finishes a recording chunk
     */
    completePeriod(duration: number): AggregatedMetrics;
    /**
     * Reset metrics accumulator for new period
     */
    private resetAccumulator;
    /**
     * Get current accumulated metrics without completing the period
     */
    getCurrentAccumulatedMetrics(): AggregatedMetrics | null;
}
export {};
//# sourceMappingURL=ChunkProcessor.d.ts.map