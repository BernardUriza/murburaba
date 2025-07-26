/**
 * Murmuraba v1.5.0
 * Real-time audio noise reduction
 */
export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
export { engineRegistry } from './core/EngineRegistry';
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';
export { RNNoiseEngine } from './engines/RNNoiseEngine';
export type { AudioEngine } from './engines/types';
export * from './types';
export { initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate, processFile } from './api';
export { AudioConverter, getAudioConverter } from './utils/audioConverter';
export declare const VERSION = "1.5.0";
export declare const MURMURABA_VERSION = "1.5.0";
export { MurmurabaSuite, useMurmurabaSuite, useAudioProcessor, useSuiteLogger, useAudioProcessing, TOKENS, SUITE_TOKENS } from './react/MurmurabaSuite';
export { DIContainer } from './core/DIContainer';
export { AudioProcessorService } from './services/AudioProcessorService';
export type { IAudioProcessor, AudioProcessingOptions, AudioProcessingResult } from './core/interfaces/IAudioProcessor';
export { SimpleWaveformAnalyzer, WaveformAnalyzer, SyncedWaveforms, ChunkProcessingResults, AudioPlayer, AdvancedMetricsPanel, ErrorBoundary, withErrorBoundary, BuildInfo, BuildInfoBadge, BuildInfoBlock, BuildInfoInline } from './components';
export type { SimpleWaveformAnalyzerProps, ChunkProcessingResultsProps, AdvancedMetricsPanelProps, AudioPlayerProps, BuildInfoProps } from './components';
//# sourceMappingURL=index.d.ts.map