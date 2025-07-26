import { engineRegistry } from './core/EngineRegistry';
import { MurmubaraConfig } from './types';

export async function initializeAudioEngine(config?: MurmubaraConfig & { id?: string }): Promise<void> {
  const engine = engineRegistry.createEngine(config);
  await engine.initialize();
}

export function getEngine(id?: string): ReturnType<typeof engineRegistry.getEngine> {
  return engineRegistry.getEngine(id);
}

export async function processStream(stream: MediaStream) {
  const engine = getEngine();
  return engine.processStream(stream);
}

export async function processStreamChunked(
  stream: MediaStream,
  config: {
    chunkDuration: number;
    onChunkProcessed?: (chunk: import('./types').ProcessedChunk) => void;
  }
) {
  const engine = getEngine();
  return engine.processStream(stream, config);
}

export async function destroyEngine(idOrOptions?: string | { force?: boolean; id?: string }): Promise<void> {
  const id = typeof idOrOptions === 'string' ? idOrOptions : idOrOptions?.id;
  await engineRegistry.destroyEngine(id);
}

export function getEngineStatus(id?: string) {
  try {
    const engine = engineRegistry.getEngine(id);
    return engine.getDiagnostics().engineState;
  } catch {
    return 'uninitialized';
  }
}

export function getDiagnostics() {
  const engine = getEngine();
  return engine.getDiagnostics();
}

export function onMetricsUpdate(callback: (metrics: import('./types').ProcessingMetrics) => void) {
  const engine = getEngine();
  engine.onMetricsUpdate(callback);
}

export async function processFile(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const engine = getEngine();
  return engine.processFile(arrayBuffer);
}