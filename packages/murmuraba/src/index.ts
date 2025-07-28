/**
 * Murmuraba v2.3.6
 * Real-time audio noise reduction with modular architecture
 */

// Core exports
export { MurmubaraEngine } from './core/MurmubaraEngine';
export { MurmubaraEngineFactory } from './core/MurmubaraEngineFactory';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
export { engineRegistry } from './core/EngineRegistry';

// Manager exports
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';
export { LoggingManager, logging } from './managers/LoggingManager';

// Audio Module exports - Removed modular architecture in favor of v2.3.1 approach

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
  processFile,
} from './api';

// Modern API exports - Use MurmurabaSuite for all functionality
// Legacy hooks have been removed in favor of the DI-based MurmurabaSuite

// Utils
export { AudioConverter, getAudioConverter } from './utils/audioConverter';

// Version
export const VERSION = '2.3.6';
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
  SUITE_TOKENS,
} from './react/MurmurabaSuite';
export { DIContainer } from './core/DIContainer';
export { AudioProcessorService } from './services/AudioProcessorService';
export type {
  IAudioProcessor,
  AudioProcessingOptions,
  AudioProcessingResult,
} from './core/interfaces/IAudioProcessor';
export type { ILogger, IMetricsManager, IStateManager, IEventEmitter } from './core/interfaces';

// UI Components - Export from components directory
export {
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
  BuildInfoInline,
} from './components';

// Component types
export type {
  ChunkProcessingResultsProps,
  AdvancedMetricsPanelProps,
  AudioPlayerProps,
  BuildInfoProps,
} from './components';

// Configuration validation exports
export {
  ConfigValidationService,
  getConfigValidator,
} from './features/configuration/services/ConfigValidationService';
export {
  MurmubaraConfigSchema,
  ChunkConfigSchema,
  validateConfig,
  safeValidateConfig,
  ConfigBuilder,
  ConfigPresets,
} from './features/configuration/schemas/configSchema';
export type {
  ValidatedMurmubaraConfig,
  ValidatedChunkConfig,
  ValidatedAudioConstraints,
  ValidatedWorkerConfig,
  ValidatedPerformanceConfig,
  ValidatedCompleteConfig,
} from './features/configuration/schemas/configSchema';
export type { ValidationError } from './features/configuration/services/ConfigValidationService';

// Additional type-safe exports
export * from './types/branded';
export * from './types/result';
export { TypedEventEmitter } from './core/TypedEventEmitter';
export type { EventMap, EventKey, EventReceiver, TypedEmitter } from './core/TypedEventEmitter';

// Performance utilities
export { CircularBuffer, MetricsBuffer } from './utils/CircularBuffer';
export { retry, retryWithTimeout, withRetry, CircuitBreaker } from './utils/retry';
export type { RetryOptions, RetryError } from './utils/retry';
