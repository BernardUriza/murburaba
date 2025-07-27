/**
 * WasmManager Unit Tests
 * 
 * Tests the centralized WASM lifecycle management module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WasmManager } from '../../../audio/WasmManager';

// Mock the WASM loader
vi.mock('../../../engines/wasm-loader-unified', () => ({
  loadRNNoiseWASM: vi.fn(),
}));

describe('WasmManager', () => {
  let wasmManager: WasmManager;
  let mockModule: any;

  beforeEach(() => {
    wasmManager = new WasmManager({ enableFallback: true });
    
    // Mock WASM module
    mockModule = {
      _rnnoise_create: vi.fn().mockReturnValue(123), // Mock state pointer
      _rnnoise_destroy: vi.fn(),
      _rnnoise_process_frame: vi.fn().mockReturnValue(0.8), // Mock VAD
      _malloc: vi.fn().mockReturnValue(456), // Mock memory pointer
      _free: vi.fn(),
      HEAPF32: new Float32Array(1024),
    };
  });

  describe('initialization', () => {
    it('should initialize WASM module successfully', async () => {
      const { loadRNNoiseWASM } = await import('../../../engines/wasm-loader-unified');
      vi.mocked(loadRNNoiseWASM).mockResolvedValue(mockModule);

      await wasmManager.initialize();

      expect(wasmManager.isInitialized()).toBe(true);
      expect(wasmManager.getModule()).toBe(mockModule);
    });

    it('should handle initialization failure gracefully', async () => {
      // Clear previous mocks
      vi.clearAllMocks();
      vi.resetModules();
      
      // Create new manager to test fresh initialization
      const newWasmManager = new WasmManager({ enableFallback: true });
      
      // Re-mock with rejection
      vi.doMock('../../../engines/wasm-loader-unified', () => ({
        loadRNNoiseWASM: vi.fn().mockRejectedValue(new Error('WASM load failed')),
      }));

      await expect(newWasmManager.initialize()).rejects.toThrow('WASM load failed');
      expect(newWasmManager.isInitialized()).toBe(false);
    });

    it('should not initialize twice', async () => {
      const { loadRNNoiseWASM } = await import('../../../engines/wasm-loader-unified');
      vi.mocked(loadRNNoiseWASM).mockResolvedValue(mockModule);

      await wasmManager.initialize();
      await wasmManager.initialize(); // Second call

      expect(loadRNNoiseWASM).toHaveBeenCalledTimes(1);
    });
  });

  describe('state management', () => {
    beforeEach(async () => {
      const { loadRNNoiseWASM } = await import('../../../engines/wasm-loader-unified');
      vi.mocked(loadRNNoiseWASM).mockResolvedValue(mockModule);
      await wasmManager.initialize();
    });

    it('should create RNNoise state', () => {
      const state = wasmManager.createState();
      expect(state).toBe(123);
      expect(mockModule._rnnoise_create).toHaveBeenCalled();
    });

    it('should destroy RNNoise state', () => {
      const state = 123;
      wasmManager.destroyState(state);
      expect(mockModule._rnnoise_destroy).toHaveBeenCalledWith(state);
    });
  });

  describe('memory management', () => {
    beforeEach(async () => {
      const { loadRNNoiseWASM } = await import('../../../engines/wasm-loader-unified');
      vi.mocked(loadRNNoiseWASM).mockResolvedValue(mockModule);
      await wasmManager.initialize();
    });

    it('should allocate memory', () => {
      const size = 480;
      const ptr = wasmManager.allocateMemory(size);
      expect(ptr).toBe(456);
      expect(mockModule._malloc).toHaveBeenCalledWith(size * 4); // Float32 = 4 bytes
    });

    it('should free memory', () => {
      const ptr = 456;
      wasmManager.freeMemory(ptr);
      expect(mockModule._free).toHaveBeenCalledWith(ptr);
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully when initialized', async () => {
      const { loadRNNoiseWASM } = await import('../../../engines/wasm-loader-unified');
      vi.mocked(loadRNNoiseWASM).mockResolvedValue(mockModule);
      
      await wasmManager.initialize();
      wasmManager.cleanup();

      expect(wasmManager.isInitialized()).toBe(false);
      expect(wasmManager.getModule()).toBe(null);
    });

    it('should handle cleanup when not initialized', () => {
      expect(() => wasmManager.cleanup()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw when accessing module before initialization', () => {
      expect(() => wasmManager.createState()).toThrow('WASM module not initialized');
    });

    it('should throw when allocating memory before initialization', () => {
      expect(() => wasmManager.allocateMemory(480)).toThrow('WASM module not initialized');
    });
  });
});