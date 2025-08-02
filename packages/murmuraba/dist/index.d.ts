/**
 * Murmuraba v1.5.0
 * Real-time audio noise reduction with comprehensive UI component library
 */
export { MurmubaraEngine } from './core/murmubara-engine';
export { EventEmitter } from './core/event-emitter';
export { StateManager } from './core/state-manager';
export { Logger } from './core/logger';
export { WorkerManager } from './managers/worker-manager';
export { MetricsManager } from './managers/metrics-manager';
export { AudioWorkletEngine } from './engines/audio-worklet-engine';
export { RNNoiseEngine } from './engines/rnnoise-engine';
export type { AudioEngine } from './engines/types';
export * from './types';
export { initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate, processFile } from './api';
export { processFileWithMetrics, type ProcessingMetrics, type ProcessFileWithMetricsResult } from './api/process-file-with-metrics';
export declare const VERSION = "3.0.0";
export declare const MURMURABA_VERSION = "3.0.0";
export { ErrorCodes } from './types';
export { AudioPlayer } from './components/audio-player/audio-player';
export { AdvancedMetricsPanel } from './components/advanced-metrics-panel/advanced-metrics-panel';
export { ChunkProcessingResults } from './components/chunk-processing-results/chunk-processing-results';
export { SimpleWaveformAnalyzer } from './components/simple-waveform-analyzer/simple-waveform-analyzer';
export { WaveformAnalyzer } from './components/waveform-analyzer/waveform-analyzer';
export { SyncedWaveforms } from './components/synced-waveforms/synced-waveforms';
export { ErrorBoundary, withErrorBoundary } from './components/error-boundary/error-boundary';
export { BuildInfo, BuildInfoBadge, BuildInfoBlock, BuildInfoInline, getPackageVersion, formatBuildDate } from './components/build-info/build-info';
export { useMurmubaraEngine } from './hooks/use-murmubara-engine';
export { useAudioEngine } from './hooks/use-audio-engine';
export { AudioConverter, getAudioConverter } from './utils/audio-converter';
export type { ProcessedChunk, RecordingState, UseMurmubaraEngineOptions, UseMurmubaraEngineReturn } from './hooks/use-murmubara-engine';
import { useMurmubaraEngine } from './hooks/use-murmubara-engine';
import { MurmubaraEngine } from './core/murmubara-engine';
declare const murmurabaExports: {
    useMurmubaraEngine: typeof useMurmubaraEngine;
    useAudioEngine: (config?: import("./engines/types").AudioEngineConfig) => {
        isInitialized: boolean;
        isLoading: boolean;
        error: string | null;
        processStream: (stream: MediaStream) => Promise<MediaStream>;
        cleanup: () => void;
        initializeAudioEngine: () => Promise<void>;
        getMetrics: () => {
            inputSamples: number;
            outputSamples: number;
            noiseReductionLevel: number;
            silenceFrames: number;
            activeFrames: number;
            averageInputEnergy: number;
            averageOutputEnergy: number;
            peakInputLevel: number;
            peakOutputLevel: number;
            processingTimeMs: number;
            chunkOffset: number;
            totalFramesProcessed: number;
        };
        resetMetrics: () => void;
    };
    MurmubaraEngine: typeof MurmubaraEngine;
};
export default murmurabaExports;
//# sourceMappingURL=index.d.ts.map