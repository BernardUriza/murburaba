export { MurmubaraEngine } from './core/MurmubaraEngine';
export { EventEmitter } from './core/EventEmitter';
export { StateManager } from './core/StateManager';
export { Logger } from './core/Logger';
export { WorkerManager } from './managers/WorkerManager';
export { MetricsManager } from './managers/MetricsManager';

export * from './types';

// Main API
import { MurmubaraEngine } from './core/MurmubaraEngine';
import { MurmubaraConfig } from './types';

let globalEngine: MurmubaraEngine | null = null;

/**
 * Initialize the global audio engine instance
 */
export async function initializeAudioEngine(config?: MurmubaraConfig): Promise<void> {
  if (globalEngine) {
    throw new Error('Audio engine is already initialized. Call destroyEngine() first.');
  }
  
  globalEngine = new MurmubaraEngine(config);
  await globalEngine.initialize();
}

/**
 * Get the global engine instance
 */
export function getEngine(): MurmubaraEngine {
  if (!globalEngine) {
    throw new Error('Audio engine not initialized. Call initializeAudioEngine() first.');
  }
  return globalEngine;
}

/**
 * Process a media stream
 */
export async function processStream(stream: MediaStream) {
  const engine = getEngine();
  return engine.processStream(stream);
}

/**
 * Process stream with chunk callbacks
 */
export async function processStreamChunked(
  stream: MediaStream,
  config: {
    chunkDuration: number;
    onChunkProcessed?: (chunk: any) => void;
  }
) {
  const engine = getEngine();
  return engine.processStream(stream, config);
}

/**
 * Destroy the global engine instance
 */
export async function destroyEngine(options?: { force?: boolean }): Promise<void> {
  if (!globalEngine) {
    return;
  }
  
  await globalEngine.destroy(options?.force || false);
  globalEngine = null;
}

/**
 * Get current engine status
 */
export function getEngineStatus() {
  if (!globalEngine) {
    return 'uninitialized';
  }
  return globalEngine.getDiagnostics().engineState;
}

/**
 * Get engine diagnostics
 */
export function getDiagnostics() {
  const engine = getEngine();
  return engine.getDiagnostics();
}

/**
 * Set up metrics callback
 */
export function onMetricsUpdate(callback: (metrics: any) => void) {
  const engine = getEngine();
  engine.onMetricsUpdate(callback);
}

// Re-export error codes for convenience
export { ErrorCodes } from './types';