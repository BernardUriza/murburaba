export { useMurmubaraEngineOptimized as useMurmubaraEngine } from './hooks/useMurmubaraEngineOptimized';
export { getOptimizedAudioConverter as getAudioConverter } from './utils/audioConverterOptimized';
export type { ProcessedChunk, RecordingState, UseMurmubaraEngineOptions, UseMurmubaraEngineReturn } from './hooks/useMurmubaraEngine';
export type { MurmubaraConfig, EngineState, ProcessingMetrics, ChunkMetrics, DiagnosticInfo } from './types';
export declare const initializeAudioEngine: () => Promise<typeof import("./api").initializeAudioEngine>;
export declare const destroyEngine: () => Promise<typeof import("./api").destroyEngine>;
export declare const processStream: () => Promise<typeof import("./api").processStream>;
export declare const processStreamChunked: () => Promise<typeof import("./api").processStreamChunked>;
export { AudioCache, debounce, throttle, PerformanceMarker } from './utils/performance';
//# sourceMappingURL=index.optimized.d.ts.map