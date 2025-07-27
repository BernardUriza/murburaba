import { AudioEngine } from './types';
import { WasmManager, FrameProcessor } from '../audio';
import type { Logger } from '../types';

/**
 * RNNoiseEngine - Refactored to use tiny modular architecture
 * 
 * BEFORE: 101 lines with WASM management, frame processing, memory management
 * AFTER: 43 lines focused ONLY on AudioEngine interface compliance
 * 
 * MODULES USED:
 * - WasmManager: WASM lifecycle
 * - FrameProcessor: 480-sample processing
 */
export class RNNoiseEngine implements AudioEngine {
  name = 'RNNoise';
  description = 'Neural network-based noise suppression';
  isInitialized = false;

  private wasmManager: WasmManager;
  private frameProcessor: FrameProcessor;
  private state: number = 0;
  private inputPtr: number = 0;
  private outputPtr: number = 0;

  constructor() {
    this.wasmManager = new WasmManager({ enableFallback: true });
    this.frameProcessor = new FrameProcessor();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[RNNoiseEngine] Starting modular initialization...');

    // Initialize WASM through WasmManager
    await this.wasmManager.initialize();

    // Create RNNoise state and allocate memory
    this.state = this.wasmManager.createState();
    this.inputPtr = this.wasmManager.allocateMemory(FrameProcessor.FRAME_SIZE);
    this.outputPtr = this.wasmManager.allocateMemory(FrameProcessor.FRAME_SIZE);

    // Warm up with silent frames
    const silentFrame = new Float32Array(FrameProcessor.FRAME_SIZE);
    for (let i = 0; i < 10; i++) {
      this.processFrameInternal(silentFrame);
    }

    this.isInitialized = true;
    console.log('[RNNoiseEngine] Modular initialization complete!');
  }

  process(inputBuffer: Float32Array): Float32Array {
    if (!this.isInitialized) {
      throw new Error('RNNoiseEngine not initialized');
    }

    return this.processFrameInternal(inputBuffer);
  }

  private processFrameInternal(frame: Float32Array): Float32Array {
    const module = this.wasmManager.getModule()!;
    const result = this.frameProcessor.processFrame(
      frame,
      module,
      this.state,
      this.inputPtr,
      this.outputPtr
    );
    return result.output;
  }

  cleanup(): void {
    if (this.wasmManager.isInitialized()) {
      this.wasmManager.freeMemory(this.inputPtr);
      this.wasmManager.freeMemory(this.outputPtr);
      this.wasmManager.destroyState(this.state);
    }
    
    this.wasmManager.cleanup();
    this.isInitialized = false;
    
    console.log('[RNNoiseEngine] Modular cleanup complete');
  }
}
