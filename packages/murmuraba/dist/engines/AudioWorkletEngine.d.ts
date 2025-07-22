import { AudioEngine } from './types';
export interface AudioWorkletEngineConfig {
    enableRNNoise?: boolean;
    rnnoiseWasmUrl?: string;
}
export declare class AudioWorkletEngine implements AudioEngine {
    name: string;
    description: string;
    isInitialized: boolean;
    private audioContext;
    private workletNode;
    private config;
    private performanceCallback?;
    constructor(config?: AudioWorkletEngineConfig);
    isAudioWorkletSupported(): boolean;
    initialize(): Promise<void>;
    private getProcessorCode;
    process(inputBuffer: Float32Array): Float32Array;
    createWorkletNode(): AudioWorkletNode;
    processWithWorklet(inputBuffer: Float32Array): Promise<Float32Array>;
    createStreamProcessor(stream: MediaStream): Promise<MediaStreamAudioSourceNode>;
    sendToWorklet(message: any): void;
    onPerformanceMetrics(callback: (metrics: any) => void): void;
    createProcessingPipeline(constraints?: any): Promise<{
        input: MediaStreamAudioSourceNode;
        output: MediaStream;
        workletNode: AudioWorkletNode;
    }>;
    getSupportedFeatures(): Record<string, boolean>;
    cleanup(): void;
}
//# sourceMappingURL=AudioWorkletEngine.d.ts.map