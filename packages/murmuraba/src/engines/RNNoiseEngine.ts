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
    
    // Check WebAssembly support first
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not supported in this environment');
    }
    
    const errors: string[] = [];
    
    try {
      // Option 1: Try dynamic import with bundler resolution
      const rnnoiseModule = await import('@jitsi/rnnoise-wasm');
      
      // Initialize with default loader - let the module handle its own WASM loading
      this.module = await rnnoiseModule.default();
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('[RNNoiseEngine] Failed to load from import:', errorMsg);
      errors.push(`Import method: ${errorMsg}`);
      
      // Option 2: Use embedded WASM loader
      try {
        const { initializeRNNoise } = await import('./rnnoise-universal-loader');
        const rnnoiseInstance = await initializeRNNoise();
        this.module = rnnoiseInstance.module;
        this.state = rnnoiseInstance.state;
      } catch (embeddedError: any) {
        const embeddedErrorMsg = embeddedError?.message || String(embeddedError);
        console.error('[RNNoiseEngine] Failed to load embedded:', embeddedErrorMsg);
        errors.push(`Embedded loader: ${embeddedErrorMsg}`);
        
        // Option 3: Fallback to script tag if import fails
        try {
          const script = document.createElement('script');
          script.src = this.config.scriptPath || '/rnnoise-fixed.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = (e) => reject(new Error('Failed to load RNNoise script'));
            document.head.appendChild(script);
          });
          
          // Create module
          const createRNNWasmModule = (window as any).createRNNWasmModule;
          if (!createRNNWasmModule) {
            throw new Error('createRNNWasmModule not found on window after script load');
          }
          
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
        } catch (scriptError: any) {
          const scriptErrorMsg = scriptError?.message || String(scriptError);
          console.error('[RNNoiseEngine] Failed to load via script tag:', scriptErrorMsg);
          errors.push(`Script tag method: ${scriptErrorMsg}`);
          
          // Check for specific WASM loading error
          if (scriptErrorMsg.includes('Aborted') && scriptErrorMsg.includes('wasm')) {
            throw new Error(`Failed to initialize RNNoise: WASM file could not be loaded. Please ensure rnnoise.wasm is accessible at the correct path. Original error: ${scriptErrorMsg}`);
          }
          
          // All methods failed
          throw new Error(`Failed to initialize RNNoise: Unable to load WASM module through any available method. Errors: ${errors.join('; ')}`);
        }
      }
    }
    
    // Create state if not already created
    if (!this.state) {
      this.state = this.module._rnnoise_create(0);
      if (!this.state) {
        throw new Error('Failed to create RNNoise state');
      }
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
    
    // Process with RNNoise and capture VAD
    const vad = this.module._rnnoise_process_frame(
      this.state, 
      this.outputPtr, 
      this.inputPtr
    );
    
    // Get output
    const outputData = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      outputData[i] = this.module.HEAPF32[(this.outputPtr >> 2) + i];
    }
    
    // Return both audio and VAD
    return { audio: outputData, vad: vad || 0 };
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