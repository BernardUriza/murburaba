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

export type {
  WasmManagerConfig,
  FrameProcessingResult,
  FrameProcessorConfig,
  StreamProcessorConfig,
  StreamController,
  FileProcessorConfig,
  ProcessingProgress,
} from './WasmManager';

export type {
  FrameProcessingResult as FrameResult,
  FrameProcessorConfig as FrameConfig,
} from './FrameProcessor';

export type {
  StreamProcessorConfig as StreamConfig,
  StreamController,
} from './StreamProcessor';

export type {
  FileProcessorConfig as FileConfig,
  ProcessingProgress,
} from './FileProcessor';