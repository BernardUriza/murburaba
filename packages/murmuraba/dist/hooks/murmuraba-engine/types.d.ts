import { MurmubaraConfig, ChunkMetrics, ChunkData, EngineState, ProcessingMetrics, DiagnosticInfo, StreamController } from '../../types';
export type ProcessedChunk = ChunkData;
export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;
    chunks: ChunkData[];
    playingChunks: {
        [key: string]: boolean;
    };
    expandedChunk: string | null;
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
    processFile: (arrayBuffer: ArrayBuffer) => Promise<ArrayBuffer>;
    startRecording: (chunkDuration?: number) => Promise<void>;
    stopRecording: () => void;
    pauseRecording: () => void;
    resumeRecording: () => void;
    clearRecordings: () => void;
    toggleChunkPlayback: (chunkId: string, audioType: 'processed' | 'original') => Promise<void>;
    toggleChunkExpansion: (chunkId: string) => void;
    exportChunkAsWav: (chunkId: string, audioType: 'processed' | 'original') => Promise<Blob>;
    exportChunkAsMp3: (chunkId: string, audioType: 'processed' | 'original', bitrate?: number) => Promise<Blob>;
    downloadChunk: (chunkId: string, format: 'webm' | 'wav' | 'mp3', audioType: 'processed' | 'original') => Promise<void>;
    downloadAllChunksAsZip: (audioType?: 'processed' | 'original' | 'both') => Promise<void>;
    getDiagnostics: () => DiagnosticInfo | null;
    resetError: () => void;
    formatTime: (seconds: number) => string;
    getAverageNoiseReduction: () => number;
}
//# sourceMappingURL=types.d.ts.map