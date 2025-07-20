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
export declare const VERSION = "1.3.0";
export declare const MURMURABA_VERSION = "1.3.0";
export { ErrorCodes } from './types';
export { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
export { useAudioEngine } from './hooks/useAudioEngine';
export { AudioConverter, getAudioConverter } from './utils/audioConverter';
export type { ProcessedChunk, RecordingState, UseMurmubaraEngineOptions, UseMurmubaraEngineReturn } from './hooks/useMurmubaraEngine';
import { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
import { MurmubaraEngine } from './core/MurmubaraEngine';
declare const _default: {
    useMurmubaraEngine: typeof useMurmubaraEngine;
    useAudioEngine: (config?: import("./engines").AudioEngineConfig) => {
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
export default _default;
//# sourceMappingURL=index.d.ts.map