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
    
    // Crear el módulo con configuración por defecto
    console.log('[WASM Loader] Creating module...');
    const moduleStart = performance.now();
    const module = await createModule();
    console.log('[WASM Loader] Module created in', (performance.now() - moduleStart).toFixed(2), 'ms');
    
    // Validar que el módulo tiene las funciones necesarias
    const requiredFunctions = [
      '_malloc', '_free', 
      '_rnnoise_create', '_rnnoise_destroy', 
      '_rnnoise_process_frame'
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
    console.log('[WASM Loader] ✅ Módulo inicializado correctamente en', totalTime.toFixed(2), 'ms');
    
    return moduleInstance;
    
  } catch (error) {
    console.error('[WASM Loader] Error durante inicialización:', error);
    throw new Error(`Fallo al cargar WASM: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function resetWASMModule(): void {
  moduleInstance = null;
  initPromise = null;
}