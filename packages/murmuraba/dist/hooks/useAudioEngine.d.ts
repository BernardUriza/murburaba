import { AudioEngineConfig } from '../engines';
export declare const useAudioEngine: (config?: AudioEngineConfig) => {
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
//# sourceMappingURL=useAudioEngine.d.ts.map