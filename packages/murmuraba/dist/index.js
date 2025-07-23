/**
 * Murmuraba v1.5.0
 * Real-time audio noise reduction with comprehensive UI component library
 */
// Core exports
export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
// Manager exports
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';
// Engine exports
export { AudioWorkletEngine } from './engines/AudioWorkletEngine';
export { RNNoiseEngine } from './engines/RNNoiseEngine';
// Type exports
export * from './types';
// Re-export API functions
export { initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate } from './api';
// Export version
export const VERSION = '1.5.0';
export const MURMURABA_VERSION = VERSION;
// Re-export error codes
export { ErrorCodes } from './types';
// UI Component exports - Professional Audio Interface Components
export { AudioPlayer } from './components/AudioPlayer';
export { AdvancedMetricsPanel } from './components/AdvancedMetricsPanel';
export { ChunkProcessingResults } from './components/ChunkProcessingResults';
// Audio Visualization Components
export { WaveformAnalyzer } from './components/WaveformAnalyzer';
export { SyncedWaveforms } from './components/SyncedWaveforms';
// Utility Components
export { ErrorBoundary, withErrorBoundary } from './components/ErrorBoundary';
export { BuildInfo, BuildInfoBadge, BuildInfoBlock, BuildInfoInline, getPackageVersion, formatBuildDate } from './components/BuildInfo';
// Hook exports at the end to avoid circular dependency
export { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
export { useAudioEngine } from './hooks/useAudioEngine';
// Audio converter utility export
export { AudioConverter, getAudioConverter } from './utils/audioConverter';
// Import for default export
import { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
import { useAudioEngine } from './hooks/useAudioEngine';
import { MurmubaraEngine } from './core/MurmubaraEngine';
// Default export for easier usage
const murmurabaExports = {
    // Core functionality
    useMurmubaraEngine,
    useAudioEngine,
    MurmubaraEngine
};
export default murmurabaExports;
