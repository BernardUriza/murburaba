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


// Hook exports
export { useMurmubaraEngine } from './hooks/murmuraba-engine';
export { useAudioEngine } from './hooks/useAudioEngine';
export type { 
  RecordingState, 
  UseMurmubaraEngineOptions, 
  UseMurmubaraEngineReturn 
} from './hooks/murmuraba-engine';

// Utils
export { AudioConverter, getAudioConverter } from './utils/audioConverter';

// Version
export const VERSION = '1.5.0';
export const MURMURABA_VERSION = VERSION;

// React/DI exports for easier imports
export { MurmurabaSuite, useMurmurabaSuite, useAudioProcessor as useMurmurabaAudioProcessor, useAudioProcessing } from './react/MurmurabaSuite';
export { DIContainer, TOKENS } from './core/DIContainer';
export { AudioProcessorService } from './services/AudioProcessorService';
export type { IAudioProcessor, AudioProcessingOptions, AudioProcessingResult } from './core/interfaces/IAudioProcessor';

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