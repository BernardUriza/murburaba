import { MurmubaraConfig } from '../types';
export interface UseMurmubaraEngineOptions extends MurmubaraConfig {
    autoInitialize?: boolean;
    defaultChunkDuration?: number;
    fallbackToManual?: boolean;
    onInitError?: (error: Error) => void;
    react19Mode?: boolean;
}
export declare function useMurmubaraEngineOptimized(config?: UseMurmubaraEngineOptions): any;
//# sourceMappingURL=useMurmubaraEngineOptimized.d.ts.map