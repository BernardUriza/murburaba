/**
 * Murmuraba v1.2.1
 * Real-time audio noise reduction with advanced chunked processing
 */
export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';
export * from './types';
export { initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate } from './api';
export declare const VERSION = "1.2.1";
export declare const MURMURABA_VERSION = "1.2.1";
export { ErrorCodes } from './types';
export { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
//# sourceMappingURL=index.d.ts.map