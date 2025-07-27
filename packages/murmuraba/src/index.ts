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
export type { AudioEngine } from './engines/types';

// Type exports
export * from './types';

// API functions
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


// Modern API exports - Use MurmurabaSuite for all functionality
// Legacy hooks have been removed in favor of the DI-based MurmurabaSuite

// Utils
export { AudioConverter, getAudioConverter } from './utils/audioConverter';

// Version
export const VERSION = '1.5.0';
export const MURMURABA_VERSION = VERSION;

// 🧨 MODERN MURMURABA API - MurmurabaSuite Architecture 🧨
// All functionality now available through MurmurabaSuite
export { 
  MurmurabaSuite, 
  useMurmurabaSuite, 
  useAudioProcessor, 
  useSuiteLogger,
  useAudioProcessing,
  TOKENS,
  SUITE_TOKENS
} from './react/MurmurabaSuite';
export { DIContainer } from './core/DIContainer';
export { AudioProcessorService } from './services/AudioProcessorService';
export type { IAudioProcessor, AudioProcessingOptions, AudioProcessingResult } from './core/interfaces/IAudioProcessor';
export type { ILogger, IMetricsManager, IStateManager, IEventEmitter } from './core/interfaces';

// UI Components - Export from components directory
export { 
  SimpleWaveformAnalyzer,
  WaveformAnalyzer,
  SyncedWaveforms,
  ChunkProcessingResults,
  AudioPlayer,
  AdvancedMetricsPanel,
  ErrorBoundary,
  withErrorBoundary,
  BuildInfo,
  BuildInfoBadge,
  BuildInfoBlock,
  BuildInfoInline
} from './components';

// Component types
export type {
  SimpleWaveformAnalyzerProps,
  ChunkProcessingResultsProps,
  AdvancedMetricsPanelProps,
  AudioPlayerProps,
  BuildInfoProps
} from './components';