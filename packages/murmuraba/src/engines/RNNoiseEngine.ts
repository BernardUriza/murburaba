import { AudioEngine } from './types';

export interface RNNoiseConfig {
  wasmPath?: string;
  scriptPath?: string;
}

export class RNNoiseEngine implements AudioEngine {
  name = 'RNNoise';
  description = 'Neural network-based noise suppression';
  isInitialized = false;
  
  private module: any = null;
  private state: any = null;
  private inputPtr: number = 0;
  private outputPtr: number = 0;
  private config: RNNoiseConfig;
  
  constructor(config?: RNNoiseConfig) {
    this.config = {
      wasmPath: config?.wasmPath || '',
      scriptPath: config?.scriptPath || ''
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[RNNoiseEngine] Starting initialization...');
    
    try {
      // Option 1: Try dynamic import with bundler resolution
      const rnnoiseModule = await import('@jitsi/rnnoise-wasm');
      
      // Option 2: Use fetch to load WASM from package
      if (typeof window !== 'undefined' && !this.config.wasmPath) {
        // Create a blob URL for the WASM module
        const wasmUrl = new URL(
          'node_modules/@jitsi/rnnoise-wasm/dist/rnnoise.wasm',
          import.meta.url
        ).href;
        
        try {
          const wasmResponse = await fetch(wasmUrl);
          const wasmArrayBuffer = await wasmResponse.arrayBuffer();
          
          // Initialize with the fetched WASM
          this.module = await rnnoiseModule.default({
            wasmBinary: wasmArrayBuffer
          });
        } catch (fetchError) {
          console.warn('[RNNoiseEngine] Could not fetch WASM from package, using default loader');
          this.module = await rnnoiseModule.default();
        }
      } else {
        this.module = await rnnoiseModule.default();
      }
    } catch (error) {
      console.error('[RNNoiseEngine] Failed to load from import, trying embedded loader...', error);
      
      // Option 3: Use embedded WASM loader
      try {
        const { initializeRNNoise } = await import('./rnnoise-universal-loader');
        const rnnoiseInstance = await initializeRNNoise();
        this.module = rnnoiseInstance.module;
        this.state = rnnoiseInstance.state;
      } catch (embeddedError) {
        console.error('[RNNoiseEngine] Failed to load embedded, trying script tag...', embeddedError);
      
      // Fallback to script tag if import fails
      const script = document.createElement('script');
      script.src = this.config.scriptPath || '/rnnoise-fixed.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      // Create module
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      this.module = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            return this.config.wasmPath ? 
              `${this.config.wasmPath}/${filename}` : 
              `/dist/${filename}`;
          }
          return filename;
        }
      });
    }
    
    // Create state
    this.state = this.module._rnnoise_create(0);
    if (!this.state) {
      throw new Error('Failed to create RNNoise state');
    }
    
    // Allocate memory for float32 samples
    this.inputPtr = this.module._malloc(480 * 4);
    this.outputPtr = this.module._malloc(480 * 4);
    
    // Warm up
    const silentFrame = new Float32Array(480);
    for (let i = 0; i < 10; i++) {
      this.module.HEAPF32.set(silentFrame, this.inputPtr >> 2);
      this.module._rnnoise_process_frame(this.state, this.outputPtr, this.inputPtr);
    }
    
    this.isInitialized = true;
    console.log('[RNNoiseEngine] Initialization complete!');
  }
  
  process(inputBuffer: Float32Array): Float32Array {
    if (!this.isInitialized) {
      throw new Error('RNNoiseEngine not initialized');
    }
    
    if (inputBuffer.length !== 480) {
      throw new Error('RNNoise requires exactly 480 samples per frame');
    }
    
    // Copy to WASM heap
    this.module.HEAPF32.set(inputBuffer, this.inputPtr >> 2);
    
    // Process with RNNoise
    this.module._rnnoise_process_frame(
      this.state, 
      this.outputPtr, 
      this.inputPtr
    );
    
    // Get output
    const outputData = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      outputData[i] = this.module.HEAPF32[(this.outputPtr >> 2) + i];
    }
    
    return outputData;
  }
  
  cleanup(): void {
    if (this.module && this.state) {
      this.module._free(this.inputPtr);
      this.module._free(this.outputPtr);
      this.module._rnnoise_destroy(this.state);
      this.state = null;
      this.module = null;
      this.isInitialized = false;
    }
  }
}