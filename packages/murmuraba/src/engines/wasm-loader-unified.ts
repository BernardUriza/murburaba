/**
 * Unified WASM Loader - Autocontenido sin dependencias externas
 * NO requiere archivos en /public
 * Funciona en browser, Node.js y workers
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
  console.log('[WASM Loader] Starting unified initialization...');
  const startTime = performance.now();

  try {
    // 1. Importar el WASM embebido en base64
    console.log('[WASM Loader] Importing wasm-data module...');
    const importStart = performance.now();
    const { decodeWasmBase64 } = await import('../utils/wasm-data');
    console.log(
      '[WASM Loader] wasm-data imported in',
      (performance.now() - importStart).toFixed(2),
      'ms'
    );

    console.log('[WASM Loader] Decoding base64...');
    const decodeStart = performance.now();
    const wasmBuffer = await decodeWasmBase64();
    console.log(
      '[WASM Loader] WASM decoded from base64:',
      (wasmBuffer.byteLength / 1024).toFixed(2) + 'KB in',
      (performance.now() - decodeStart).toFixed(2),
      'ms'
    );

    // 2. Importar el módulo RNNoise de @jitsi
    const rnnoiseModule = await import('@jitsi/rnnoise-wasm');

    // 3. Verificar que tenemos la función de creación
    let createModule: any;

    if ('createRNNWasmModule' in rnnoiseModule) {
      createModule = (rnnoiseModule as any).createRNNWasmModule;
    } else if ('default' in rnnoiseModule && typeof (rnnoiseModule as any).default === 'function') {
      createModule = (rnnoiseModule as any).default;
    } else {
      throw new Error('No se encontró función de creación en @jitsi/rnnoise-wasm');
    }

    // 4. Crear el módulo con el WASM embebido
    const moduleConfig = {
      wasmBinary: new Uint8Array(wasmBuffer),
      // Evitar que intente cargar archivos externos
      locateFile: (filename: string) => {
        console.log('[WASM Loader] locateFile called for:', filename);
        // Retornar cadena vacía para evitar fetch
        return '';
      },
      // Configuración adicional para Node.js
      ...(typeof process !== 'undefined' && process.versions?.node
        ? {
            ENVIRONMENT: 'NODE',
          }
        : {}),
    };

    console.log('[WASM Loader] Creating module with config...');
    const moduleStart = performance.now();
    const module = await createModule(moduleConfig);
    console.log(
      '[WASM Loader] Module created in',
      (performance.now() - moduleStart).toFixed(2),
      'ms'
    );

    // 5. Validar que el módulo tiene las funciones necesarias
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

    // 6. Validar heaps
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
