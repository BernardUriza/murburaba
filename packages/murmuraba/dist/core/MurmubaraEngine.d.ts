import { EventEmitter } from './EventEmitter';
import { MurmubaraConfig, EngineEvents, StreamController, DiagnosticInfo, DiagnosticReport, ProcessingMetrics, ChunkConfig } from '../types';
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
    private agcEnabled;
    private agc?;
    constructor(config?: MurmubaraConfig);
    private setupEventForwarding;
    private setupAutoCleanup;
    initialize(): Promise<void>;
    private performInitialization;
    private checkEnvironmentSupport;
    private initializeAudioContext;
    private loadWasmModuleWithTimeout;
    private recordError;
    private initializeDegraded;
    private loadWasmModule;
    private warmupModel;
    private processFrame;
    processStream(stream: MediaStream, chunkConfig?: ChunkConfig): Promise<StreamController>;
    private createStreamController;
    isAGCEnabled(): boolean;
    setAGCEnabled(enabled: boolean): void;
    getAGCConfig(): {
        targetLevel: number;
        maxGain: number;
        enabled: boolean;
    };
    getReductionFactor(level?: string): number;
    private generateStreamId;
    destroy(force?: boolean): Promise<void>;
    getMetrics(): ProcessingMetrics;
    onMetricsUpdate(callback: (metrics: ProcessingMetrics) => void): void;
    isActive(): boolean;
    getDiagnostics(): DiagnosticInfo;
    updateConfig(newConfig: Partial<MurmubaraConfig>): void;
    private getBrowserName;
    private getBrowserVersion;
    private getAudioAPIsSupported;
    runDiagnosticTests(): Promise<DiagnosticReport>;
    /**
     * Process a WAV file with RNNoise
     * @param arrayBuffer WAV file as ArrayBuffer
     * @returns Processed WAV file as ArrayBuffer
     */
    processFile(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer>;
}
//# sourceMappingURL=MurmubaraEngine.d.ts.map