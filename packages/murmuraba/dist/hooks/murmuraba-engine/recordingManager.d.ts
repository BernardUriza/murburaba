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
    constructor(urlManager: URLManager);
    /**
     * Start concatenated streaming for medical-grade recording
     */
    startConcatenatedStreaming(processedStream: MediaStream, originalStream: MediaStream, mimeType: string, chunkDuration: number, onChunkReady: (chunk: ProcessedChunk) => void): Promise<void>;
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
}
//# sourceMappingURL=recordingManager.d.ts.map