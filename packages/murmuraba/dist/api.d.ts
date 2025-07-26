import { engineRegistry } from './core/EngineRegistry';
import { MurmubaraConfig } from './types';
export declare function initializeAudioEngine(config?: MurmubaraConfig & {
    id?: string;
}): Promise<void>;
export declare function getEngine(id?: string): ReturnType<typeof engineRegistry.getEngine>;
export declare function processStream(stream: MediaStream): Promise<import("./types").StreamController>;
export declare function processStreamChunked(stream: MediaStream, config: {
    chunkDuration: number;
    onChunkProcessed?: (chunk: import('./types').ProcessedChunk) => void;
}): Promise<import("./types").StreamController>;
export declare function destroyEngine(idOrOptions?: string | {
    force?: boolean;
    id?: string;
}): Promise<void>;
export declare function getEngineStatus(id?: string): import("./types").EngineState;
export declare function getDiagnostics(): import("./types").DiagnosticInfo;
export declare function onMetricsUpdate(callback: (metrics: import('./types').ProcessingMetrics) => void): void;
export declare function processFile(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer>;
//# sourceMappingURL=api.d.ts.map