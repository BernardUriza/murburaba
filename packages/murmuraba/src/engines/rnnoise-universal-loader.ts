/**
 * Universal RNNoise Loader
 * Works with any bundler without manual file copying
 */

// Use dynamic imports that bundlers can understand
async function loadWasmModule() {
  // Just let the @jitsi/rnnoise-wasm handle its own WASM loading
  const module = await import('@jitsi/rnnoise-wasm');
  return await module.default();
}

export async function initializeRNNoise(): Promise<any> {
  console.log('[RNNoise] Initializing with universal loader...');
  
  try {
    const module = await loadWasmModule();
    
    // Create and return the RNNoise state
    const state = module._rnnoise_create(0);
    if (!state) {
      throw new Error('Failed to create RNNoise state');
    }
    
    return {
      module,
      state,
      // Helper methods
      processFrame: (input: Float32Array): Float32Array => {
        const frameSize = 480;
        if (input.length !== frameSize) {
          throw new Error(`Input must be ${frameSize} samples`);
        }
        
        // Allocate memory
        const inputPtr = module._malloc(frameSize * 4);
        const outputPtr = module._malloc(frameSize * 4);
        
        // Copy input to WASM memory
        (module as any).HEAPF32.set(input, inputPtr / 4);
        
        // Process
        module._rnnoise_process_frame(state, outputPtr, inputPtr);
        
        // Copy output from WASM memory
        const output = new Float32Array(
          (module as any).HEAPF32.buffer,
          outputPtr,
          frameSize
        );
        
        const result = new Float32Array(output);
        
        // Free memory
        module._free(inputPtr);
        module._free(outputPtr);
        
        return result;
      },
      destroy: () => {
        module._rnnoise_destroy(state);
      }
    };
  } catch (error) {
    console.error('[RNNoise] Initialization failed:', error);
    throw error;
  }
}