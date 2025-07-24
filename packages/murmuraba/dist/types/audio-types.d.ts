export type EngineState = 'uninitialized' | 'initializing' | 'loading-wasm' | 'creating-context' | 'ready' | 'processing' | 'paused' | 'destroying' | 'destroyed' | 'error' | 'degraded';
export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';
export type NoiseReductionLevel = 'low' | 'medium' | 'high' | 'auto';
export type Algorithm = 'rnnoise' | 'spectral' | 'adaptive';
export type BufferSize = 256 | 512 | 1024 | 2048 | 4096;
export interface MurmubaraConfig {
    logLevel?: LogLevel;
    onLog?: (level: LogLevel, message: string, data?: any) => void;
    noiseReductionLevel?: NoiseReductionLevel;
    bufferSize?: BufferSize;
    algorithm?: Algorithm;
    autoCleanup?: boolean;
    cleanupDelay?: number;
    useWorker?: boolean;
    workerPath?: string;
    allowDegraded?: boolean;
}
export interface StreamController {
    stream: MediaStream;
    processor: AudioProcessor;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    getState: () => EngineState;
}
export interface AudioProcessor {
    id: string;
    state: EngineState;
    inputNode?: AudioNode;
    outputNode?: AudioNode;
}
export interface ProcessingMetrics {
    noiseReductionLevel: number;
    processingLatency: number;
    inputLevel: number;
    outputLevel: number;
    timestamp: number;
    frameCount: number;
    droppedFrames: number;
}
export interface ChunkMetrics {
    originalSize: number;
    processedSize: number;
    noiseRemoved: number;
    metrics: ProcessingMetrics;
    duration: number;
    startTime: number;
    endTime: number;
    vadData?: Array<{
        time: number;
        vad: number;
    }>;
    averageVad?: number;
}
export interface ChunkConfig {
    chunkDuration: number;
    onChunkProcessed?: (chunk: ChunkMetrics) => void;
    overlap?: number;
}
export interface DiagnosticInfo {
    version: string;
    engineVersion: string;
    reactVersion: string;
    browserInfo?: {
        name: string;
        version: string;
        audioAPIsSupported: string[];
    };
    wasmLoaded: boolean;
    activeProcessors: number;
    memoryUsage: number;
    processingTime: number;
    engineState: EngineState;
    capabilities?: {
        hasWASM: boolean;
        hasAudioContext: boolean;
        hasWorklet: boolean;
        maxChannels: number;
    };
    errors?: Array<{
        timestamp: number;
        error: string;
    }>;
    initializationLog?: string[];
    performanceMetrics?: {
        wasmLoadTime: number;
        contextCreationTime: number;
        totalInitTime: number;
    };
    systemInfo?: {
        memory?: number;
    };
    bufferUsage?: number;
    currentLatency?: number;
    frameRate?: number;
    activeStreams?: number;
    noiseReductionLevel?: number;
    audioQuality?: string;
}
export interface EngineEvents {
    initialized: () => void;
    'processing-start': () => void;
    'processing-end': () => void;
    destroyed: () => void;
    error: (error: MurmubaraError) => void;
    'state-change': (oldState: EngineState, newState: EngineState) => void;
    'metrics-update': (metrics: ProcessingMetrics) => void;
    'degraded-mode': () => void;
    [key: string]: (...args: any[]) => void;
}
export declare class MurmubaraError extends Error {
    code: string;
    details?: any;
    constructor(code: string, message: string, details?: any);
}
export interface DiagnosticReport {
    timestamp: number;
    tests: Array<{
        name: string;
        passed: boolean;
        message: string;
        duration: number;
    }>;
    passed: number;
    failed: number;
    warnings: number;
}
export declare const ErrorCodes: {
    readonly WASM_NOT_LOADED: "WASM_NOT_LOADED";
    readonly INVALID_STREAM: "INVALID_STREAM";
    readonly ENGINE_BUSY: "ENGINE_BUSY";
    readonly INITIALIZATION_FAILED: "INITIALIZATION_FAILED";
    readonly PROCESSING_FAILED: "PROCESSING_FAILED";
    readonly CLEANUP_FAILED: "CLEANUP_FAILED";
    readonly WORKER_ERROR: "WORKER_ERROR";
    readonly INVALID_CONFIG: "INVALID_CONFIG";
    readonly NOT_INITIALIZED: "NOT_INITIALIZED";
    readonly ALREADY_INITIALIZED: "ALREADY_INITIALIZED";
};
//# sourceMappingURL=audio-types.d.ts.map