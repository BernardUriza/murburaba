import { AudioEngine } from './types';
export declare class RNNoiseEngine implements AudioEngine {
    name: string;
    description: string;
    isInitialized: boolean;
    private module;
    private state;
    private inputPtr;
    private outputPtr;
    initialize(): Promise<void>;
    process(inputBuffer: Float32Array): Float32Array;
    cleanup(): void;
}
//# sourceMappingURL=RNNoiseEngine.d.ts.map