// Optimized exports with tree-shaking support
export { useMurmubaraEngineOptimized as useMurmubaraEngine } from './hooks/useMurmubaraEngineOptimized';
export { getOptimizedAudioConverter as getAudioConverter } from './utils/audioConverterOptimized';
// Lazy load API functions
export const initializeAudioEngine = () => import('./api').then(m => m.initializeAudioEngine);
export const destroyEngine = () => import('./api').then(m => m.destroyEngine);
export const processStream = () => import('./api').then(m => m.processStream);
export const processStreamChunked = () => import('./api').then(m => m.processStreamChunked);
// Performance utilities
export { AudioCache, debounce, throttle, PerformanceMarker } from './utils/performance';
