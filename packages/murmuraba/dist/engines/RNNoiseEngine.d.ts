import { AudioEngine } from './types';
export interface RNNoiseConfig {
    wasmPath?: string;
    scriptPath?: string;
}
export declare class RNNoiseEngine implements AudioEngine {
    name: string;
    description: string;
    isInitialized: boolean;
    private module;
    private state;
    private inputPtr;
    private outputPtr;
    private lastVad;
    private config;
    constructor(config?: RNNoiseConfig);
    initialize(): Promise<void>;
    process(inputBuffer: Float32Array): Float32Array;
    cleanup(): void;
}
//# sourceMappingURL=RNNoiseEngine.d.ts.map