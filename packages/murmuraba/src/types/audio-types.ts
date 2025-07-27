export type EngineState =
  | 'uninitialized'
  | 'initializing'
  | 'loading-wasm'
  | 'creating-context'
  | 'ready'
  | 'processing'
  | 'paused'
  | 'destroying'
  | 'destroyed'
  | 'error'
  | 'degraded';

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
  allowDegraded?: boolean;
  enableAGC?: boolean;
  workerCount?: number;
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
  vadData?: Array<{ time: number; vad: number }>;
  averageVad?: number;
}

export interface ProcessedChunk {
  id: string;
  blob?: Blob;
  startTime: number;
  endTime: number;
  duration: number;
  vadScore: number;
  averageVad: number;
  processedAudioUrl?: string;
  originalAudioUrl?: string;
  vadData: Array<{ time: number; vad: number }>;
  metrics: ProcessingMetrics;
  originalSize: number;
  processedSize: number;
  noiseRemoved: number;
  isPlaying: boolean;
  isValid?: boolean;
  errorMessage?: string;
  currentlyPlayingType?: 'processed' | 'original' | null;
  // Additional fields from hook version
  isPlayingOriginal?: boolean;
  isPlayingProcessed?: boolean;
}

export interface ChunkConfig {
  chunkDuration: number;
  onChunkProcessed?: (chunk: ChunkMetrics) => void;
  overlap?: number;
}

export interface DiagnosticInfo {
  version: string;
  engineVersion: string;
  reactVersion: string;
  browserInfo?: {
    name: string;
    version: string;
    audioAPIsSupported: string[];
  };
  wasmLoaded: boolean;
  activeProcessors: number;
  memoryUsage: number;
  processingTime: number;
  engineState: EngineState;
  capabilities?: {
    hasWASM: boolean;
    hasAudioContext: boolean;
    hasWorklet: boolean;
    maxChannels: number;
  };
  errors?: Array<{ timestamp: number; error: string }>;
  initializationLog?: string[];
  performanceMetrics?: {
    wasmLoadTime: number;
    contextCreationTime: number;
    totalInitTime: number;
  };
  systemInfo?: {
    memory?: number;
  };
  // Real-time metrics for v2 Engine Diagnostics
  bufferUsage?: number;
  currentLatency?: number;
  frameRate?: number;
  activeStreams?: number;
  noiseReductionLevel?: number;
  audioQuality?: string;
  // Additional fields for tests
  errorCount?: number;
  lastError?: string;
  audioContextState?: AudioContextState;
}

export interface EngineEvents {
  initialized: () => void;
  'processing-start': () => void;
  'processing-end': () => void;
  destroyed: () => void;
  error: (error: MurmubaraError) => void;
  'state-change': (oldState: EngineState, newState: EngineState) => void;
  'metrics-update': (metrics: ProcessingMetrics) => void;
  'degraded-mode': () => void;
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

export interface DiagnosticReport {
  timestamp: number;
  tests: Array<{
    name: string;
    passed: boolean;
    message: string;
    duration: number;
  }>;
  passed: number;
  failed: number;
  warnings: number;
}

// Import Logger for type definitions
import type { Logger } from '../core/Logger';

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

// Modular Audio Types (from audio modules)
export interface FrameProcessingResult {
  output: Float32Array;
  vad: number;
}

export interface FrameProcessorConfig {
  enableValidation?: boolean;
  enableScaling?: boolean;
}

export interface WasmManagerConfig {
  timeoutMs?: number;
  logger?: Logger;
  enableFallback?: boolean;
}

export interface StreamProcessorConfig {
  bufferSize?: number;
  enableAGC?: boolean;
  logger?: Logger;
}

export interface FileProcessorConfig {
  logger?: Logger;
  enableResampling?: boolean;
  chunkSize?: number;
}

export interface ProcessingProgress {
  frameIndex: number;
  totalFrames: number;
  progress: number; // 0-100
  vad: number;
  noiseReduction: number;
}

// Re-export core Logger class instead of interface
export type { Logger } from '../core/Logger';
