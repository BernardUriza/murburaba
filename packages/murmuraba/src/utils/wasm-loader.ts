// Modern WASM loader with lazy loading and Web Worker support (2025 best practices)

export interface WASMLoaderOptions {
  useWorker?: boolean;
  cacheModule?: boolean;
  streamingEnabled?: boolean;
}

// Cache for compiled modules
const moduleCache = new Map<string, WebAssembly.Module>();

/**
 * Optimized WASM loader with modern best practices
 * - Streaming instantiation
 * - Module caching
 * - Lazy loading support
 * - Web Worker integration
 */
export class WASMLoader {
  private static instance: WASMLoader;
  
  private constructor() {}
  
  static getInstance(): WASMLoader {
    if (!WASMLoader.instance) {
      WASMLoader.instance = new WASMLoader();
    }
    return WASMLoader.instance;
  }
  
  /**
   * Load WASM module with optimized streaming
   */
  async loadModule(
    url: string, 
    imports: WebAssembly.Imports = {},
    options: WASMLoaderOptions = {}
  ): Promise<WebAssembly.Instance> {
    const {
      cacheModule = true,
      streamingEnabled = true
    } = options;
    
    try {
      // Check cache first
      if (cacheModule && moduleCache.has(url)) {
        console.log(`[WASMLoader] Using cached module for ${url}`);
        const cachedModule = moduleCache.get(url)!;
        return new WebAssembly.Instance(cachedModule, imports);
      }
      
      // Fetch and instantiate
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status}`);
      }
      
      let result: WebAssembly.WebAssemblyInstantiatedSource;
      
      // Use streaming instantiation when available
      if (streamingEnabled && 'instantiateStreaming' in WebAssembly) {
        console.log(`[WASMLoader] Using streaming instantiation for ${url}`);
        result = await WebAssembly.instantiateStreaming(response, imports);
      } else {
        console.log(`[WASMLoader] Using standard instantiation for ${url}`);
        const buffer = await response.arrayBuffer();
        result = await WebAssembly.instantiate(buffer, imports);
      }
      
      // Cache the module
      if (cacheModule) {
        moduleCache.set(url, result.module);
      }
      
      return result.instance;
    } catch (error) {
      console.error(`[WASMLoader] Failed to load module ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Preload WASM module for later use
   */
  async preloadModule(url: string): Promise<void> {
    if (moduleCache.has(url)) {
      return;
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status}`);
      }
      
      let module: WebAssembly.Module;
      
      if ('compileStreaming' in WebAssembly) {
        console.log(`[WASMLoader] Precompiling with streaming for ${url}`);
        module = await WebAssembly.compileStreaming(response);
      } else {
        const buffer = await response.arrayBuffer();
        module = await WebAssembly.compile(buffer);
      }
      
      moduleCache.set(url, module);
      console.log(`[WASMLoader] Module preloaded and cached: ${url}`);
    } catch (error) {
      console.error(`[WASMLoader] Failed to preload module ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Clear module cache
   */
  clearCache(url?: string): void {
    if (url) {
      moduleCache.delete(url);
    } else {
      moduleCache.clear();
    }
  }
  
  /**
   * Get cache size
   */
  getCacheSize(): number {
    return moduleCache.size;
  }
}

/**
 * Lazy loading wrapper for WASM modules
 */
export function createLazyWASMLoader<T>(
  loadFn: () => Promise<T>
): () => Promise<T> {
  let modulePromise: Promise<T> | null = null;
  
  return async () => {
    if (!modulePromise) {
      modulePromise = loadFn();
    }
    return modulePromise;
  };
}

/**
 * Load WASM in Web Worker for CPU-intensive tasks
 */
export async function loadWASMInWorker(
  workerUrl: string,
  wasmUrl: string,
  data?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl);
    
    worker.onmessage = (event) => {
      if (event.data.type === 'ready') {
        worker.postMessage({ 
          type: 'loadWASM', 
          wasmUrl,
          data 
        });
      } else if (event.data.type === 'result') {
        resolve(event.data.result);
        worker.terminate();
      } else if (event.data.type === 'error') {
        reject(new Error(event.data.error));
        worker.terminate();
      }
    };
    
    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };
  });
}