/**
 * Shared Utilities
 * 
 * Common utility functions and helpers
 * 
 * @module shared/utils
 */

// Functional programming utilities
export * from './functional';

// Re-export existing utilities
export { AudioResampler } from '../../utils/AudioResampler';
export { AudioConverter, getAudioConverter } from '../../utils/audioConverter';
export { SimpleAGC } from '../../utils/SimpleAGC';
export { CircularBuffer, MetricsBuffer } from '../../utils/CircularBuffer';
export { createDefaultMetrics } from '../../utils/defaultMetrics';
export {
  retry,
  retryWithTimeout,
  withRetry,
  CircuitBreaker,
  type RetryOptions,
  RetryError,
} from '../../utils/retry';

// Performance utilities
export {
  PerformanceMonitor,
  PerformanceMarker,
  debounce,
  throttle,
  AudioCache,
  getBlobHash,
  batchUpdates,
  requestIdleCallback,
  getMemoryUsage,
  measureExecutionTime,
  calculateAverageTime,
  formatBytes,
  formatDuration,
} from '../../utils/performance';
