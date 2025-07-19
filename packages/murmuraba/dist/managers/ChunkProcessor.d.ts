import { EventEmitter } from '../core/EventEmitter';
import { Logger } from '../core/Logger';
import { ChunkMetrics, ChunkConfig } from '../types';
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
}
export {};
//# sourceMappingURL=ChunkProcessor.d.ts.map