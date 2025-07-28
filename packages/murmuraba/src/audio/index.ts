/**
 * Audio Module Exports - Tiny Modular Architecture
 * 
 * BAZAAR PHILOSOPHY: Each module has a single, well-defined responsibility
 * NO MORE god objects - only focused, testable units
 */

export { WasmManager } from './WasmManager';
export { FrameProcessor } from './FrameProcessor';
export { StreamProcessor } from './StreamProcessor';
export { FileProcessor } from './FileProcessor';

// Re-export types from centralized types module
export type {
  WasmManagerConfig,
  FrameProcessingResult,
  FrameProcessorConfig,
  StreamProcessorConfig,
  FileProcessorConfig,
  ProcessingProgress,
  Logger,
} from '../types';

export type {
  StreamController,
} from './StreamProcessor';