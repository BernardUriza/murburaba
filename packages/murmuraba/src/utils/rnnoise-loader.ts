// Import WASM file to include it in the bundle
import wasmUrl from '@jitsi/rnnoise-wasm/dist/rnnoise.wasm';

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

export async function loadRNNoiseModule(): Promise<RNNoiseModule> {
  if (!modulePromise) {
    // Dynamic import to avoid TypeScript issues
    modulePromise = import('@jitsi/rnnoise-wasm').then(async (rnnoiseModule) => {
      const { createRNNWasmModule } = rnnoiseModule as any;
      
      // Configure the module to load WASM from the bundle
      const module = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            console.log('[RNNoise Loader] Loading WASM from bundle:', wasmUrl);
            return wasmUrl;
          }
          return filename;
        }
      });
      
      return module as unknown as RNNoiseModule;
    });
  }
  return modulePromise;
}