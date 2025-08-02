// Removed wasm-loader import - using direct implementation

export interface RNNoiseModule {
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _rnnoise_create: (model: number) => number;
  _rnnoise_destroy: (state: number) => void;
  _rnnoise_process_frame: (state: number, output: number, input: number) => number;
  HEAPU8: Uint8Array;
  HEAPF32: Float32Array;
}

let modulePromise: Promise<RNNoiseModule> | null = null;
// Direct WASM loading implementation

export async function loadRNNoiseModule(): Promise<RNNoiseModule> {
  if (!modulePromise) {
    modulePromise = loadWASMOptimized();
  }
  return modulePromise;
}

// Optimized WASM loading with streaming instantiation (2025 best practices)
async function loadWASMOptimized(): Promise<RNNoiseModule> {
  // Dynamic import for code splitting
  const rnnoiseModule = await import('@jitsi/rnnoise-wasm');
  const { createRNNWasmModule } = rnnoiseModule as any;
  
  // Use streaming instantiation when available
  if ('instantiateStreaming' in WebAssembly) {
    console.log('[RNNoise Loader] Using optimized streaming instantiation');
  }
  
  // Configure module with optimized loading strategy
  const module = await createRNNWasmModule({
    locateFile: (filename: string) => {
      if (filename.endsWith('.wasm')) {
        // Centralized WASM location strategy
        const wasmPath = getOptimizedWASMPath(filename);
        console.log('[RNNoise Loader] Loading WASM from:', wasmPath);
        return wasmPath;
      }
      return filename;
    },
    // Enable streaming compilation when supported
    instantiateWasm: async (imports: any, successCallback: any) => {
      try {
        const wasmPath = getOptimizedWASMPath('rnnoise.wasm');
        const response = await fetch(wasmPath);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM: ${response.status}`);
        }
        
        // Use streaming instantiation for better performance
        if ('instantiateStreaming' in WebAssembly) {
          const result = await WebAssembly.instantiateStreaming(response, imports);
          successCallback(result.instance, result.module);
        } else {
          // Fallback for older browsers
          const buffer = await response.arrayBuffer();
          const result = await WebAssembly.instantiate(buffer, imports);
          successCallback(result.instance, result.module);
        }
      } catch (error) {
        console.error('[RNNoise Loader] WASM instantiation failed:', error);
        throw error;
      }
    }
  });
  
  return module as unknown as RNNoiseModule;
}

// Centralized WASM path resolution
function getOptimizedWASMPath(filename: string): string {
  if (typeof window === 'undefined') {
    return filename;
  }
  
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  // Use centralized /wasm directory as per optimization recommendations
  if (isDevelopment) {
    // In development, serve from public/wasm/
    return `/wasm/${filename}`;
  } else {
    // In production, serve from optimized CDN or dist/wasm/
    return `/dist/wasm/${filename}`;
  }
}

// Lazy loader for RNNoise module
export const lazyLoadRNNoise = () => loadRNNoiseModule();

// Preload WASM for better performance
export async function preloadRNNoiseWASM(): Promise<void> {
  // Preloading is now handled internally by loadRNNoiseModule
  await loadRNNoiseModule();
}