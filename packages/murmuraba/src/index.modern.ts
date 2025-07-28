/**
 * Murmuraba - Modern Audio Processing Library
 * 
 * Feature-based exports for modern applications
 * 
 * @packageDocumentation
 */

// ============================================
// Features
// ============================================

/**
 * Configuration Feature
 * Provides validation, presets, and builder patterns
 */
export * from '@features/configuration';

/**
 * Audio Processing Feature  
 * Modern hooks and services for audio processing
 */
export * from '@features/audio-processing';

// ============================================
// Shared Utilities
// ============================================

/**
 * Shared Types
 * Common type definitions and utilities
 */
export * from '@shared/types';

/**
 * Functional Programming Utilities
 * Modern FP helpers for cleaner code
 */
export * from '@shared/utils/functional';

// ============================================
// Core Exports (for advanced usage)
// ============================================

export {
  // Engine
  MurmubaraEngine,
  MurmubaraEngineFactory,
  
  // DI Container
  DIContainer,
  TOKENS,
  
  // Event System
  EventEmitter,
  TypedEventEmitter,
  
  // Logging
  Logger,
  type ILogger,
} from './core';

// ============================================  
// Modern API
// ============================================

/**
 * Main entry point for modern applications
 * 
 * @example
 * ```typescript
 * import { createMurmuraba } from 'murmuraba/modern';
 * 
 * const murmuraba = await createMurmuraba({
 *   preset: 'highQuality',
 *   features: ['audio-processing', 'metrics']
 * });
 * 
 * const result = await murmuraba.processAudio(audioBuffer);
 * ```
 */
export async function createMurmuraba(options?: {
  preset?: 'highQuality' | 'lowLatency' | 'balanced';
  features?: string[];
}) {
  const { MurmubaraEngineFactory } = await import('@core/MurmubaraEngineFactory');
  const { getConfigurationFeature } = await import('@features/configuration');
  const { getAudioProcessingFeature } = await import('@features/audio-processing');
  
  // Initialize configuration
  const config = getConfigurationFeature();
  
  // Create engine with preset
  const engine = options?.preset 
    ? MurmubaraEngineFactory.createWithPreset(options.preset)
    : MurmubaraEngineFactory.create();
    
  // Initialize engine
  await engine.initialize();
  
  // Create feature APIs
  const audioProcessing = getAudioProcessingFeature();
  
  return {
    engine,
    config,
    audio: audioProcessing,
    
    // Convenience methods
    async processAudio(buffer: ArrayBuffer) {
      const service = audioProcessing.createService(engine);
      return service.processAudioBuffer(buffer);
    },
    
    async destroy() {
      await engine.destroy();
    },
  };
}

// ============================================
// React Integration  
// ============================================

/**
 * React hooks and components
 */
export {
  // Hooks
  useAudioProcessor,
  
  // Context
  MurmurabaSuite,
  useMurmurabaSuite,
  
  // Components
  WaveformAnalyzer,
  AudioPlayer,
  ChunkProcessingResults,
  ErrorBoundary,
} from './react';

// ============================================
// Types
// ============================================

export type {
  // Configuration
  MurmubaraConfig,
  
  // Audio
  ProcessedChunk,
  ProcessingMetrics,
  ChunkMetrics,
} from './types';

// Re-export configuration types
export type {
  ValidatedMurmubaraConfig,
} from './features/configuration';

// Re-export utility types
export type {
  Result,
  AsyncResult,
} from './types/result';

// Re-export branded types  
export type {
  StreamId,
  ChunkId,
  SessionId,
} from './types/branded';

// ============================================
// Constants
// ============================================

export const VERSION = '3.0.0';
export const FEATURES = [
  'audio-processing',
  'configuration', 
  'metrics',
  'ui-components',
] as const;

// ============================================
// Deprecation Notices
// ============================================

/**
 * @deprecated Use `createMurmuraba()` instead
 */
export { initializeAudioEngine } from './api';

/**
 * @deprecated Use feature-based imports instead
 */
export * as Legacy from './index';
