/**
 * Murmuraba v1.5.0
 * Real-time audio noise reduction with comprehensive UI component library
 */
export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';
export { AudioWorkletEngine } from './engines/AudioWorkletEngine';
export { RNNoiseEngine } from './engines/RNNoiseEngine';
export type { AudioEngine } from './engines/types';
export * from './types';
export { initializeAudioEngine, getEngine, processStream, processStreamChunked, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate, processFile } from './api';
export { processFileWithMetrics, type ProcessingMetrics, type ProcessFileWithMetricsResult } from './api/processFileWithMetrics';
export declare const VERSION = "1.5.0";
export declare const MURMURABA_VERSION = "1.5.0";
export { ErrorCodes } from './types';
export { AudioPlayer } from './components/AudioPlayer';
export { AdvancedMetricsPanel } from './components/AdvancedMetricsPanel';
export { ChunkProcessingResults } from './components/ChunkProcessingResults';
export { WaveformAnalyzer } from './components/WaveformAnalyzer';
export { SyncedWaveforms } from './components/SyncedWaveforms';
export { ErrorBoundary, withErrorBoundary } from './components/ErrorBoundary';
export { BuildInfo, BuildInfoBadge, BuildInfoBlock, BuildInfoInline, getPackageVersion, formatBuildDate } from './components/BuildInfo';
export { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
export { useAudioEngine } from './hooks/useAudioEngine';
export { AudioConverter, getAudioConverter } from './utils/audioConverter';
export type { ProcessedChunk, RecordingState, UseMurmubaraEngineOptions, UseMurmubaraEngineReturn } from './hooks/useMurmubaraEngine';
import { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
import { MurmubaraEngine } from './core/MurmubaraEngine';
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