export type EngineState = 
  | 'uninitialized'
  | 'initializing' 
  | 'ready'
  | 'processing'
  | 'paused'
  | 'destroying'
  | 'destroyed'
  | 'error';

export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';
export type NoiseReductionLevel = 'low' | 'medium' | 'high' | 'auto';
export type Algorithm = 'rnnoise' | 'spectral' | 'adaptive';
export type BufferSize = 256 | 512 | 1024 | 2048 | 4096;

export interface MurmubaraConfig {
  logLevel?: LogLevel;
  onLog?: (level: LogLevel, message: string, data?: any) => void;
  noiseReductionLevel?: NoiseReductionLevel;
  bufferSize?: BufferSize;
  algorithm?: Algorithm;
  autoCleanup?: boolean;
  cleanupDelay?: number;
  useWorker?: boolean;
  workerPath?: string;
}

export interface StreamController {
  stream: MediaStream;
  processor: AudioProcessor;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getState: () => EngineState;
}

export interface AudioProcessor {
  id: string;
  state: EngineState;
  inputNode?: AudioNode;
  outputNode?: AudioNode;
}

export interface ProcessingMetrics {
  noiseReductionLevel: number;
  processingLatency: number;
  inputLevel: number;
  outputLevel: number;
  timestamp: number;
  frameCount: number;
  droppedFrames: number;
}

export interface ChunkMetrics {
  originalSize: number;
  processedSize: number;
  noiseRemoved: number;
  metrics: ProcessingMetrics;
  duration: number;
  startTime: number;
  endTime: number;
}

export interface ChunkConfig {
  chunkDuration: number;
  onChunkProcessed?: (chunk: ChunkMetrics) => void;
  overlap?: number;
}

export interface DiagnosticInfo {
  engineVersion: string;
  wasmLoaded: boolean;
  activeProcessors: number;
  memoryUsage: number;
  processingTime: number;
  engineState: EngineState;
  errors: Array<{ timestamp: number; error: string }>;
}

export interface EngineEvents {
  initialized: () => void;
  'processing-start': () => void;
  'processing-end': () => void;
  destroyed: () => void;
  error: (error: MurmubaraError) => void;
  'state-change': (oldState: EngineState, newState: EngineState) => void;
  'metrics-update': (metrics: ProcessingMetrics) => void;
  [key: string]: (...args: any[]) => void;
}

export class MurmubaraError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'MurmubaraError';
    this.code = code;
    this.details = details;
  }
}

export const ErrorCodes = {
  WASM_NOT_LOADED: 'WASM_NOT_LOADED',
  INVALID_STREAM: 'INVALID_STREAM',
  ENGINE_BUSY: 'ENGINE_BUSY',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  CLEANUP_FAILED: 'CLEANUP_FAILED',
  WORKER_ERROR: 'WORKER_ERROR',
  INVALID_CONFIG: 'INVALID_CONFIG',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  ALREADY_INITIALIZED: 'ALREADY_INITIALIZED',
} as const;