import { ProcessedChunk } from './types';
import { URLManager } from './urlManager';
export declare class RecordingManager {
    private urlManager;
    private mediaRecorder;
    private originalRecorder;
    private chunkRecordings;
    private processChunkInterval;
    private stopCycleFlag;
    private cycleCount;
    private cycleTimeout;
    private metricsProvider;
    private currentMetrics;
    constructor(urlManager: URLManager);
    /**
     * TDD Integration: Set metrics provider from ChunkProcessor
     */
    setMetricsProvider(provider: {
        getAggregatedMetrics: (startTime: number, endTime: number) => any;
    }): void;
    /**
     * TDD Integration: Receive metrics from ChunkProcessor
     */
    receiveMetrics(metrics: any): void;
    /**
     * TDD Integration: Get real metrics for a time period
     */
    private getRealMetrics;
    /**
     * Start concatenated streaming for medical-grade recording
     */
    startCycle(processedStream: MediaStream, originalStream: MediaStream, chunkDuration: number, onChunkProcessed: (chunk: ProcessedChunk) => void): Promise<void>;
    /**
     * Process recorded chunk data
     */
    private processChunkRecording;
    /**
     * Stop recording
     */
    stopRecording(): void;
    /**
     * Pause recording
     */
    pauseRecording(): void;
    /**
     * Resume recording
     */
    resumeRecording(): void;
    /**
     * Check if currently recording
     */
    isRecording(): boolean;
    /**
     * Check if recording is paused
     */
    isPaused(): boolean;
}
//# sourceMappingURL=recordingManager.d.ts.map