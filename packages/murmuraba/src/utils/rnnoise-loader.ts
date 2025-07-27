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
    modulePromise = (async () => {
      try {
        // Import the base64 encoded WASM
        const { decodeWasmBase64 } = await import('./wasm-data');
        const wasmBuffer = await decodeWasmBase64();

        console.log('[RNNoise Loader] Loading WASM from base64 bundle');

        // Import the RNNoise module
        const rnnoiseModule = await import('@jitsi/rnnoise-wasm');
        const { createRNNWasmModule } = rnnoiseModule as any;

        // Create the module with the decoded WASM buffer
        const module = await createRNNWasmModule({
          wasmBinary: new Uint8Array(wasmBuffer),
          locateFile: (filename: string) => {
            if (filename.endsWith('.wasm')) {
              // Return empty string to prevent additional fetch
              return '';
            }
            return filename;
          },
        });

        return module as unknown as RNNoiseModule;
      } catch (error) {
        console.error('[RNNoise Loader] Failed to load WASM from base64:', error);
        throw error;
      }
    })();
  }
  return modulePromise;
}
