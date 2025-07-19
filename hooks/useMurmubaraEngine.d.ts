import { MurmubaraConfig, EngineState, ProcessingMetrics, StreamController, DiagnosticInfo, ChunkMetrics } from '../types';
interface UseMurmubaraEngineOptions extends MurmubaraConfig {
    autoInitialize?: boolean;
}
interface UseMurmubaraEngineReturn {
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
    getDiagnostics: () => DiagnosticInfo | null;
    resetError: () => void;
}
export declare function useMurmubaraEngine(options?: UseMurmubaraEngineOptions): UseMurmubaraEngineReturn;
export {};
//# sourceMappingURL=useMurmubaraEngine.d.ts.map