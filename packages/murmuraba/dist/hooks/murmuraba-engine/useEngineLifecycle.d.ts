import { EngineState, ProcessingMetrics, DiagnosticInfo } from '../../types';
export interface UseEngineLifecycleOptions {
    autoInitialize?: boolean;
    onInitError?: (error: Error) => void;
    config?: any;
}
export interface UseEngineLifecycleReturn {
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    engineState: EngineState;
    metrics: ProcessingMetrics | null;
    diagnostics: DiagnosticInfo | null;
    initialize: (config?: any) => Promise<void>;
    destroy: (force?: boolean) => Promise<void>;
    updateDiagnostics: () => DiagnosticInfo | null;
    resetError: () => void;
    setError: (error: string) => void;
}
export declare function useEngineLifecycle(options?: UseEngineLifecycleOptions): UseEngineLifecycleReturn;
//# sourceMappingURL=useEngineLifecycle.d.ts.map