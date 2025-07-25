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
            // In production, the WASM file should be in the same directory as the bundle
            // In development, it might be served from node_modules
            if (typeof window !== 'undefined' && window.location) {
              // Try multiple possible locations
              const paths = [
                `/node_modules/@jitsi/rnnoise-wasm/dist/${filename}`,
                `/node_modules/.vite/deps/${filename}`,
                `/${filename}`,
                `/dist/${filename}`,
                filename
              ];
              
              // In development with Vite, the WASM should be in public
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const devPath = `/${filename}`;
                console.log('[RNNoise Loader] Development mode, trying:', devPath);
                return devPath;
              }
              
              // In production, assume the file is in the root or dist
              console.log('[RNNoise Loader] Production mode, trying:', paths[3]);
              return paths[3];
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