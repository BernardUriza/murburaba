// Optimized exports with tree-shaking support
export { useMurmubaraEngineOptimized as useMurmubaraEngine } from './hooks/useMurmubaraEngineOptimized';
export { getOptimizedAudioConverter as getAudioConverter } from './utils/audioConverterOptimized';

// Export only used types
export type { 
  ProcessedChunk, 
  RecordingState,
  UseMurmubaraEngineOptions,
  UseMurmubaraEngineReturn 
} from './hooks/useMurmubaraEngine';

export type {
  MurmubaraConfig,
  EngineState,
  ProcessingMetrics,
  ChunkMetrics,
  DiagnosticInfo
} from './types';

// Lazy load API functions
export const initializeAudioEngine = () => import('./api').then(m => m.initializeAudioEngine);
export const destroyEngine = () => import('./api').then(m => m.destroyEngine);
export const processStream = () => import('./api').then(m => m.processStream);
export const processStreamChunked = () => import('./api').then(m => m.processStreamChunked);

// Performance utilities
export { AudioCache, debounce, throttle, PerformanceMarker } from './utils/performance';