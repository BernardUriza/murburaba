import { EventEmitter } from './EventEmitter';
import { MurmubaraConfig, EngineEvents, StreamController, DiagnosticInfo, ProcessingMetrics, ChunkConfig } from '../types';
export declare class MurmubaraEngine extends EventEmitter<EngineEvents> {
    private config;
    private stateManager;
    private logger;
    private workerManager;
    private metricsManager;
    private audioContext?;
    private activeStreams;
    private wasmModule?;
    private rnnoiseState?;
    private inputPtr?;
    private outputPtr?;
    private initPromise?;
    private cleanupTimer?;
    private errorHistory;
    constructor(config?: MurmubaraConfig);
    private setupEventForwarding;
    private setupAutoCleanup;
    initialize(): Promise<void>;
    private performInitialization;
    private loadWasmModule;
    private warmupModel;
    private processFrame;
    processStream(stream: MediaStream, chunkConfig?: ChunkConfig): Promise<StreamController>;
    private createStreamController;
    private getReductionFactor;
    private generateStreamId;
    destroy(force?: boolean): Promise<void>;
    getMetrics(): ProcessingMetrics;
    onMetricsUpdate(callback: (metrics: ProcessingMetrics) => void): void;
    getDiagnostics(): DiagnosticInfo;
    private recordError;
}
//# sourceMappingURL=MurmubaraEngine.d.ts.map