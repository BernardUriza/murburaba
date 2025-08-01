// RNNoise Web Worker for offloading audio processing from main thread
// Implements 2025 best practices for WASM in workers

import type { RNNoiseModule } from '../utils/rnnoise-loader';

interface WorkerMessage {
  type: 'init' | 'process' | 'destroy';
  data?: any;
  id?: string;
}

interface ProcessMessage extends WorkerMessage {
  type: 'process';
  data: {
    buffer: Float32Array;
    sampleRate: number;
  };
}

let rnnoiseModule: RNNoiseModule | null = null;
let rnnoiseState: number | null = null;
let inputPtr: number | null = null;
let outputPtr: number | null = null;

// Initialize RNNoise in worker context
async function initializeRNNoise() {
  try {
    console.log('[RNNoise Worker] Initializing...');
    
    // Dynamic import for code splitting
    const { createRNNWasmModule } = await import('@jitsi/rnnoise-wasm') as any;
    
    // Load WASM with worker-optimized settings
    rnnoiseModule = await createRNNWasmModule({
      locateFile: (filename: string) => {
        if (filename.endsWith('.wasm')) {
          // Use absolute path for worker context
          return `/wasm/${filename}`;
        }
        return filename;
      },
      // Worker-specific optimizations
      instantiateWasm: async (imports: any, successCallback: any) => {
        try {
          const response = await fetch('/wasm/rnnoise.wasm');
          
          // Use streaming instantiation in worker
          if ('instantiateStreaming' in WebAssembly) {
            const result = await WebAssembly.instantiateStreaming(response, imports);
            successCallback(result.instance, result.module);
          } else {
            const buffer = await response.arrayBuffer();
            const result = await WebAssembly.instantiate(buffer, imports);
            successCallback(result.instance, result.module);
          }
        } catch (error) {
          console.error('[RNNoise Worker] WASM instantiation failed:', error);
          throw error;
        }
      }
    });
    
    // Initialize RNNoise state
    rnnoiseState = rnnoiseModule._rnnoise_create(0);
    
    // Allocate memory for input/output buffers (480 samples)
    const frameSize = 480;
    inputPtr = rnnoiseModule._malloc(frameSize * 4); // Float32 = 4 bytes
    outputPtr = rnnoiseModule._malloc(frameSize * 4);
    
    console.log('[RNNoise Worker] Initialized successfully');
    
    self.postMessage({ 
      type: 'initialized', 
      success: true 
    });
  } catch (error) {
    console.error('[RNNoise Worker] Initialization failed:', error);
    self.postMessage({ 
      type: 'initialized', 
      success: false, 
      error: (error as Error).message 
    });
  }
}

// Process audio frame
function processAudioFrame(buffer: Float32Array): Float32Array {
  if (!rnnoiseModule || !rnnoiseState || !inputPtr || !outputPtr) {
    throw new Error('RNNoise not initialized');
  }
  
  const frameSize = 480;
  
  // Ensure buffer is exactly 480 samples
  if (buffer.length !== frameSize) {
    throw new Error(`Invalid frame size: ${buffer.length}, expected ${frameSize}`);
  }
  
  // Copy input to WASM memory
  rnnoiseModule.HEAPF32.set(buffer, inputPtr / 4);
  
  // Process frame
  const vadProbability = rnnoiseModule._rnnoise_process_frame(
    rnnoiseState,
    outputPtr,
    inputPtr
  );
  
  // Copy output from WASM memory
  const output = new Float32Array(frameSize);
  output.set(rnnoiseModule.HEAPF32.subarray(
    outputPtr / 4,
    outputPtr / 4 + frameSize
  ));
  
  return output;
}

// Cleanup resources
function cleanup() {
  if (rnnoiseModule && rnnoiseState) {
    rnnoiseModule._rnnoise_destroy(rnnoiseState);
    rnnoiseState = null;
  }
  
  if (rnnoiseModule && inputPtr) {
    rnnoiseModule._free(inputPtr);
    inputPtr = null;
  }
  
  if (rnnoiseModule && outputPtr) {
    rnnoiseModule._free(outputPtr);
    outputPtr = null;
  }
  
  rnnoiseModule = null;
  console.log('[RNNoise Worker] Cleaned up');
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'init':
        await initializeRNNoise();
        break;
        
      case 'process':
        if (!rnnoiseModule) {
          throw new Error('RNNoise not initialized');
        }
        
        const processData = data as ProcessMessage['data'];
        const processed = processAudioFrame(processData.buffer);
        
        self.postMessage({
          type: 'processed',
          id,
          data: {
            buffer: processed,
            timestamp: performance.now()
          }
        }, [processed.buffer]); // Transfer ownership for zero-copy
        break;
        
      case 'destroy':
        cleanup();
        self.postMessage({ type: 'destroyed' });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: (error as Error).message
    });
  }
};

// Handle worker termination
self.addEventListener('beforeunload', cleanup);