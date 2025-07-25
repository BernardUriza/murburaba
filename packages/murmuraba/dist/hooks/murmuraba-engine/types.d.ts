import { MurmubaraConfig, ChunkMetrics, EngineState, ProcessingMetrics, DiagnosticInfo, StreamController } from '../../types';
export interface ProcessedChunk extends ChunkMetrics {
    id: string;
    processedAudioUrl?: string;
    originalAudioUrl?: string;
    isPlaying: boolean;
    isExpanded: boolean;
    isValid?: boolean;
    errorMessage?: string;
    currentlyPlayingType?: 'processed' | 'original' | null;
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
export interface UseMurmubaraEngineReturnInternal {
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
    _internal_startRecording: (chunkDuration?: number) => Promise<void>;
    _internal_stopRecording: () => void;
    _internal_pauseRecording: () => void;
    _internal_resumeRecording: () => void;
    _internal_clearRecordings: () => void;
    toggleChunkPlayback: (chunkId: string, audioType: 'processed' | 'original') => Promise<void>;
    toggleChunkExpansion: (chunkId: string) => void;
    exportChunkAsWav: (chunkId: string, audioType: 'processed' | 'original') => Promise<Blob>;
    exportChunkAsMp3: (chunkId: string, audioType: 'processed' | 'original', bitrate?: number) => Promise<Blob>;
    downloadChunk: (chunkId: string, format: 'webm' | 'wav' | 'mp3', audioType: 'processed' | 'original') => Promise<void>;
    getDiagnostics: () => DiagnosticInfo | null;
    resetError: () => void;
    formatTime: (seconds: number) => string;
    getAverageNoiseReduction: () => number;
}
export interface UseMurmubaraEngineReturn extends Omit<UseMurmubaraEngineReturnInternal, '_internal_startRecording' | '_internal_stopRecording' | '_internal_pauseRecording' | '_internal_resumeRecording' | '_internal_clearRecordings'> {
}
//# sourceMappingURL=types.d.ts.map