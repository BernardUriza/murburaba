import { MurmubaraEngine } from './core/murmubara-engine';
import { MurmubaraConfig } from './types';
export declare function initializeAudioEngine(config?: MurmubaraConfig): Promise<void>;
export declare function getEngine(): MurmubaraEngine;
export declare function processStream(stream: MediaStream): Promise<import("./types").StreamController>;
export declare function processStreamChunked(stream: MediaStream, config: {
    chunkDuration: number;
    onChunkProcessed?: (chunk: any) => void;
}): Promise<import("./types").StreamController>;
export declare function destroyEngine(options?: {
    force?: boolean;
}): Promise<void>;
export declare function getEngineStatus(): import("./types").EngineState;
export declare function getDiagnostics(): import("./types").DiagnosticInfo;
export declare function onMetricsUpdate(callback: (metrics: any) => void): void;
export declare function processFile(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer>;
//# sourceMappingURL=api.d.ts.map