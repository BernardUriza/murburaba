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
export { RNNoiseEngine } from './engines/RNNoiseEngine';
export type { AudioEngine } from './engines/types';

// Type exports
export * from './types';

// Re-export API functions
export {
  initializeAudioEngine,
  getEngine,
  processStream,
  processStreamChunked,
  destroyEngine,
  getEngineStatus,
  getDiagnostics,
  onMetricsUpdate,
  processFile
} from './api';

// Export enhanced processing functions
export { 
  processFileWithMetrics,
  type ProcessingMetrics,
  type ProcessFileWithMetricsResult,
  type ChunkOptions,
  type ProcessedChunk,
  type ProcessFileResult,
  type ProcessFileOptions
} from './api/processFileWithMetrics';

// Export version
export const VERSION = '1.5.0';
export const MURMURABA_VERSION = VERSION;

// Re-export error codes
export { ErrorCodes } from './types';

// UI Component exports - Professional Audio Interface Components
export { AudioPlayer } from './components/AudioPlayer';
export { AdvancedMetricsPanel } from './components/AdvancedMetricsPanel';
export { ChunkProcessingResults } from './components/ChunkProcessingResults';
export { SimpleWaveformAnalyzer } from './components/SimpleWaveformAnalyzer';

// Audio Visualization Components
export { WaveformAnalyzer } from './components/WaveformAnalyzer';
export { SyncedWaveforms } from './components/SyncedWaveforms';

// Utility Components
export { ErrorBoundary, withErrorBoundary } from './components/ErrorBoundary';
export { 
  BuildInfo, 
  BuildInfoBadge, 
  BuildInfoBlock, 
  BuildInfoInline,
  getPackageVersion,
  formatBuildDate 
} from './components/BuildInfo';

// Hook exports at the end to avoid circular dependency
export { useMurmubaraEngine } from './hooks/murmuraba-engine';
export { useAudioEngine } from './hooks/useAudioEngine';

// Audio converter utility export
export { AudioConverter, getAudioConverter } from './utils/audioConverter';

// Export types from the hook (excluding ProcessedChunk to avoid duplication)
export type { 
  RecordingState, 
  UseMurmubaraEngineOptions, 
  UseMurmubaraEngineReturn 
} from './hooks/murmuraba-engine';

// Import for default export
import { useMurmubaraEngine } from './hooks/murmuraba-engine';
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