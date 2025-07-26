import { MurmubaraConfig, ChunkMetrics, EngineState, ProcessingMetrics, DiagnosticInfo, StreamController, ProcessedChunk } from '../../types';
export type { ProcessedChunk };
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
    initialize: () => Promise<void>;
    destroy: (force?: boolean) => Promise<void>;
    processStream: (stream: MediaStream) => Promise<StreamController>;
    processStreamChunked: (stream: MediaStream, config: {
        chunkDuration: number;
        onChunkProcessed?: (chunk: ChunkMetrics) => void;
    }) => Promise<StreamController>;
    processFile: (arrayBuffer: ArrayBuffer) => Promise<ArrayBuffer>;
    getDiagnostics: () => DiagnosticInfo | null;
    resetError: () => void;
}
//# sourceMappingURL=types.d.ts.map