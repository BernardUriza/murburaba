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
      
      // Configure the module to load WASM from the correct path
      const module = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            // Try to load WASM from the murmuraba package export
            try {
              // This will be resolved by bundlers (webpack, vite, etc)
              // to the correct URL with proper MIME type
              return new URL('murmuraba/rnnoise.wasm', import.meta.url).href;
            } catch (e) {
              // Fallback for environments that don't support import.meta.url
              if (typeof window !== 'undefined' && window.location) {
                // In development with Vite, the WASM should be in public
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                  const devPath = `/rnnoise.wasm`;
                  console.log('[RNNoise Loader] Development mode, trying:', devPath);
                  return devPath;
                }
                
                // In production, try common locations
                const prodPath = `/dist/rnnoise.wasm`;
                console.log('[RNNoise Loader] Production mode, trying:', prodPath);
                return prodPath;
              }
            }
          }
          return filename;
        }
      });
      
      return module as unknown as RNNoiseModule;
    });
  }
  return modulePromise;
}