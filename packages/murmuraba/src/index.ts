/**
 * Murmuraba v1.2.1
 * Real-time audio noise reduction with advanced chunked processing
 */

// Core exports
export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';

// Manager exports
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';

// Type exports
export * from './types';

// Re-export API functions
export {
  initializeAudioEngine,
  getEngine,
  processStream,
  processStreamChunked,
  destroyEngine,
  getEngineStatus,
  getDiagnostics,
  onMetricsUpdate
} from './api';

// Export version
export const VERSION = '1.3.0';
export const MURMURABA_VERSION = VERSION;

// Re-export error codes
export { ErrorCodes } from './types';

// Hook exports at the end to avoid circular dependency
export { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
export { useAudioEngine } from './hooks/useAudioEngine';

// Audio converter utility export
export { AudioConverter, getAudioConverter } from './utils/audioConverter';

// Export types from the hook
export type { 
  ProcessedChunk, 
  RecordingState, 
  UseMurmubaraEngineOptions, 
  UseMurmubaraEngineReturn 
} from './hooks/useMurmubaraEngine';

// Import for default export
import { useMurmubaraEngine } from './hooks/useMurmubaraEngine';
import { useAudioEngine } from './hooks/useAudioEngine';
import { MurmubaraEngine } from './core/MurmubaraEngine';

// Default export for easier usage
export default {
  useMurmubaraEngine,
  useAudioEngine,
  MurmubaraEngine
};