/**
 * WasmManager - Centralized WASM lifecycle management
 * 
 * CONSOLIDATION: Eliminates duplication between wasm-loader-simple and wasm-loader-unified
 * PHILOSOPHY: One module = one responsibility (WASM lifecycle)
 */

import type { RNNoiseModule } from '../utils/rnnoise-loader';
import type { Logger } from '../core/Logger';

export interface WasmManagerConfig {
  timeoutMs?: number;
  logger?: Logger;
  enableFallback?: boolean;
}

export class WasmManager {
  private module: RNNoiseModule | null = null;
  private initPromise: Promise<RNNoiseModule> | null = null;
  private logger?: Logger;
  private config: Required<WasmManagerConfig>;

  constructor(config: WasmManagerConfig = {}) {
    this.config = {
      timeoutMs: config.timeoutMs || 10000,
      logger: config.logger,
      enableFallback: config.enableFallback ?? false,
    };
    this.logger = config.logger;
  }

  async initialize(): Promise<RNNoiseModule> {
    if (this.module) return this.module;

    if (!this.initPromise) {
      this.initPromise = this.performInitialization();
    }

    return this.initPromise;
  }

  private async performInitialization(): Promise<RNNoiseModule> {
    this.logger?.info('Starting WASM initialization...');
    const startTime = performance.now();

    // Timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`WASM loading timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);
    });

    try {
      const module = await Promise.race([this.loadWasmModule(), timeoutPromise]);
      this.module = module;

      const loadTime = performance.now() - startTime;
      this.logger?.info(`WASM module loaded successfully in ${loadTime.toFixed(2)}ms`);

      return module;
    } catch (error) {
      this.logger?.error('WASM initialization failed:', error);
      
      if (this.config.enableFallback) {
        return this.createFallbackModule();
      }
      
      throw error;
    }
  }

  private async loadWasmModule(): Promise<RNNoiseModule> {
    // Check WebAssembly support
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not supported in this environment');
    }

    // Import the unified WASM loader (consolidating both loaders)
    const { loadRNNoiseWASM } = await import('../engines/wasm-loader-unified');
    return await loadRNNoiseWASM();
  }

  private createFallbackModule(): RNNoiseModule {
    this.logger?.warn('Creating fallback WASM module (no noise reduction)');
    
    // Mock module for degraded mode
    return {
      _malloc: (size: number) => 0,
      _free: () => {},
      _rnnoise_create: () => 1,
      _rnnoise_destroy: () => {},
      _rnnoise_process_frame: () => 0,
      HEAPU8: new Uint8Array(0),
      HEAPF32: new Float32Array(0),
    };
  }

  isInitialized(): boolean {
    return this.module !== null;
  }

  getModule(): RNNoiseModule | null {
    return this.module;
  }

  createState(): number {
    if (!this.module) {
      throw new Error('WASM module not initialized');
    }
    return this.module._rnnoise_create(0);
  }

  destroyState(state: number): void {
    if (this.module && state) {
      this.module._rnnoise_destroy(state);
    }
  }

  allocateMemory(samples: number): number {
    if (!this.module) {
      throw new Error('WASM module not initialized');
    }
    return this.module._malloc(samples * 4); // Float32 = 4 bytes
  }

  freeMemory(ptr: number): void {
    if (this.module && ptr) {
      this.module._free(ptr);
    }
  }

  cleanup(): void {
    this.module = null;
    this.initPromise = null;
    this.logger?.debug('WasmManager cleaned up');
  }
}