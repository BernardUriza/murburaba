export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';
export * from './types';
import { MurmubaraEngine } from './core/MurmubaraEngine';
import { MurmubaraConfig } from './types';
/**
 * Initialize the global audio engine instance
 */
export declare function initializeAudioEngine(config?: MurmubaraConfig): Promise<void>;
/**
 * Get the global engine instance
 */
export declare function getEngine(): MurmubaraEngine;
/**
 * Process a media stream
 */
export declare function processStream(stream: MediaStream): Promise<import("./types").StreamController>;
/**
 * Process stream with chunk callbacks
 */
export declare function processStreamChunked(stream: MediaStream, config: {
    chunkDuration: number;
    onChunkProcessed?: (chunk: any) => void;
}): Promise<import("./types").StreamController>;
/**
 * Destroy the global engine instance
 */
export declare function destroyEngine(options?: {
    force?: boolean;
}): Promise<void>;
/**
 * Get current engine status
 */
export declare function getEngineStatus(): import("./types").EngineState;
/**
 * Get engine diagnostics
 */
export declare function getDiagnostics(): import("./types").DiagnosticInfo;
/**
 * Set up metrics callback
 */
export declare function onMetricsUpdate(callback: (metrics: any) => void): void;
export { ErrorCodes } from './types';
//# sourceMappingURL=murmuraba.d.ts.map