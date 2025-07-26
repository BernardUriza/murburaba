/**
 * Murmuraba v1.5.0
 * Real-time audio noise reduction
 */
// Core exports
export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
export { engineRegistry } from './core/EngineRegistry';
// Manager exports
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';
// Engine exports
export { RNNoiseEngine } from './engines/RNNoiseEngine';
// Type exports
export * from './types';
// API functions
export { initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate, processFile } from './api';
// Enhanced processing functions
export { processFileWithMetrics } from './api/processFileWithMetrics';
// Hook exports
export { useMurmubaraEngine } from './hooks/murmuraba-engine';
export { useAudioEngine } from './hooks/useAudioEngine';
// Utils
export { AudioConverter, getAudioConverter } from './utils/audioConverter';
// Version
export const VERSION = '1.5.0';
export const MURMURABA_VERSION = VERSION;
