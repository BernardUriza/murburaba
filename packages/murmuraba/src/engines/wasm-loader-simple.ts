/**
 * Simple WASM Loader - Carga WASM desde archivo
 */

import type { RNNoiseModule } from '../utils/rnnoise-loader';

let moduleInstance: RNNoiseModule | null = null;
let initPromise: Promise<RNNoiseModule> | null = null;

export async function loadRNNoiseWASM(): Promise<RNNoiseModule> {
  if (moduleInstance) return moduleInstance;

  if (!initPromise) {
    initPromise = initializeWASM();
  }

  return initPromise;
}

async function initializeWASM(): Promise<RNNoiseModule> {
  console.log('[WASM Loader] Starting simple initialization...');
  const startTime = performance.now();

  try {
    // Importar el módulo RNNoise de @jitsi
    const rnnoiseModule = await import('@jitsi/rnnoise-wasm');

    // Verificar que tenemos la función de creación
    let createModule: any;

    if ('createRNNWasmModule' in rnnoiseModule) {
      createModule = (rnnoiseModule as any).createRNNWasmModule;
    } else if ('default' in rnnoiseModule && typeof (rnnoiseModule as any).default === 'function') {
      createModule = (rnnoiseModule as any).default;
    } else {
      throw new Error('No se encontró función de creación en @jitsi/rnnoise-wasm');
    }

    // Crear el módulo con configuración para cargar WASM desde public
    console.log('[WASM Loader] Creating module...');
    const moduleStart = performance.now();

    // Debug: verificar el tipo de createModule
    console.log('[WASM Loader] createModule type:', typeof createModule);
    console.log('[WASM Loader] createModule:', createModule);

    const module = await createModule({
      locateFile: (path: string) => {
        console.log('[WASM Loader] locateFile called with:', path);
        if (path.endsWith('.wasm')) {
          const wasmPath = '/rnnoise.wasm';
          console.log('[WASM Loader] Returning WASM path:', wasmPath);
          return wasmPath;
        }
        return path;
      },
      onRuntimeInitialized: () => {
        console.log('[WASM Loader] Runtime initialized!');
      },
      print: (text: string) => {
        console.log('[WASM Module]', text);
      },
      printErr: (text: string) => {
        console.error('[WASM Module Error]', text);
      },
    });
    console.log(
      '[WASM Loader] Module created in',
      (performance.now() - moduleStart).toFixed(2),
      'ms'
    );
    console.log('[WASM Loader] Module type:', typeof module);
    console.log('[WASM Loader] Module keys:', Object.keys(module).slice(0, 10));

    // Validar que el módulo tiene las funciones necesarias
    const requiredFunctions = [
      '_malloc',
      '_free',
      '_rnnoise_create',
      '_rnnoise_destroy',
      '_rnnoise_process_frame',
    ];

    for (const func of requiredFunctions) {
      if (typeof module[func] !== 'function') {
        throw new Error(`Función requerida ${func} no encontrada en el módulo`);
      }
    }

    // Validar heaps
    if (!module.HEAPU8 || !module.HEAPF32) {
      throw new Error('Heaps de memoria no encontrados en el módulo');
    }

    moduleInstance = module as RNNoiseModule;
    const totalTime = performance.now() - startTime;
    console.log(
      '[WASM Loader] ✅ Módulo inicializado correctamente en',
      totalTime.toFixed(2),
      'ms'
    );

    return moduleInstance;
  } catch (error) {
    console.error('[WASM Loader] Error durante inicialización:', error);
    throw new Error(
      `Fallo al cargar WASM: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function resetWASMModule(): void {
  moduleInstance = null;
  initPromise = null;
}
