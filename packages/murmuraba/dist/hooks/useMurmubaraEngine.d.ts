import { MurmubaraConfig, EngineState, ProcessingMetrics, StreamController, DiagnosticInfo, ChunkMetrics } from '../types';
export interface ProcessedChunk extends ChunkMetrics {
    id: string;
    processedAudioUrl?: string;
    originalAudioUrl?: string;
    isPlaying: boolean;
    isExpanded: boolean;
}
export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;
    chunks: ProcessedChunk[];
}
export interface UseMurmubaraEngineOptions extends MurmubaraConfig {
    autoInitialize?: boolean;
    defaultChunkDuration?: number;
    fallbackToManual?: boolean;
    onInitError?: (error: Error) => void;
    react19Mode?: boolean;
}
export interface UseMurmubaraEngineReturn {
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    engineState: EngineState;
    metrics: ProcessingMetrics | null;
    diagnostics: DiagnosticInfo | null;
    recordingState: RecordingState;
    currentStream: MediaStream | null;
    streamController: StreamController | null;
    initialize: () => Promise<void>;
    destroy: (force?: boolean) => Promise<void>;
    processStream: (stream: MediaStream) => Promise<StreamController>;
    processStreamChunked: (stream: MediaStream, config: {
        chunkDuration: number;
        onChunkProcessed?: (chunk: ChunkMetrics) => void;
    }) => Promise<StreamController>;
    startRecording: (chunkDuration?: number) => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    clearRecordings: () => void;
    toggleChunkPlayback: (chunkId: string, audioType: 'processed' | 'original') => Promise<void>;
    toggleChunkExpansion: (chunkId: string) => void;
    getDiagnostics: () => DiagnosticInfo | null;
    resetError: () => void;
    formatTime: (seconds: number) => string;
    getAverageNoiseReduction: () => number;
}
/**
 * Main Murmuraba hook with full recording, chunking, and playback functionality
 *
 * @example
 * ```tsx
 * const {
 *   isInitialized,
 *   recordingState,
 *   startRecording,
 *   stopRecording,
 *   toggleChunkPlayback
 * } = useMurmubaraEngine({
 *   autoInitialize: true,
 *   defaultChunkDuration: 8
 * });
 * ```
 */
export declare function useMurmubaraEngine(options?: UseMurmubaraEngineOptions): UseMurmubaraEngineReturn;
//# sourceMappingURL=useMurmubaraEngine.d.ts.map