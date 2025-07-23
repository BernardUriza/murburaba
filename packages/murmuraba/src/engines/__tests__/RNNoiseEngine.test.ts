import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RNNoiseEngine } from '../RNNoiseEngine';

describe('RNNoiseEngine', () => {
  let engine: RNNoiseEngine;

  beforeEach(() => {
    // Mock window object
    global.window = {} as any;
    global.document = {
      createElement: vi.fn(() => ({
        onload: null,
        onerror: null,
        src: ''
      })),
      head: {
        appendChild: vi.fn()
      }
    } as any;
  });

  afterEach(() => {
    if (engine) {
      engine.cleanup();
    }
  });

  describe('WASM Loading Error Handling', () => {
    it('should handle "Aborted(both async and sync fetching of the wasm failed)" error gracefully', async () => {
      // Mock all loading methods to fail
      vi.doMock('@jitsi/rnnoise-wasm', () => {
        throw new Error('Aborted(both async and sync fetching of the wasm failed). Build with -sASSERTIONS for more info.');
      });

      vi.doMock('../rnnoise-universal-loader', () => ({
        initializeRNNoise: vi.fn().mockRejectedValue(new Error('WASM loading failed'))
      }));

      // Mock script loading to fail
      const mockScript = {
        onload: null as any,
        onerror: null as any,
        src: ''
      };
      
      (global.document.createElement as any).mockReturnValue(mockScript);
      (global.document.head.appendChild as any).mockImplementation(() => {
        // Simulate script loading error
        setTimeout(() => mockScript.onerror && mockScript.onerror(new Error('Script failed to load')), 0);
      });

      engine = new RNNoiseEngine();
      
      // Should throw a meaningful error, not the cryptic WASM error
      await expect(engine.initialize()).rejects.toThrow('Failed to initialize RNNoise: Unable to load WASM module through any available method');
    });

    it('should provide fallback when WASM is not available', async () => {
      // Mock WASM check
      const originalWebAssembly = global.WebAssembly;
      delete (global as any).WebAssembly;

      engine = new RNNoiseEngine();
      
      await expect(engine.initialize()).rejects.toThrow('WebAssembly is not supported in this environment');

      // Restore
      global.WebAssembly = originalWebAssembly;
    });

    it('should handle CORS errors when loading WASM', async () => {
      vi.doMock('@jitsi/rnnoise-wasm', () => {
        throw new Error('Failed to fetch');
      });

      engine = new RNNoiseEngine();
      
      // Mock successful script loading but module creation fails
      const mockScript = {
        onload: null as any,
        onerror: null as any,
        src: ''
      };
      
      (global.document.createElement as any).mockReturnValue(mockScript);
      (global.document.head.appendChild as any).mockImplementation(() => {
        // Simulate successful script load
        setTimeout(() => {
          (global.window as any).createRNNWasmModule = vi.fn().mockRejectedValue(
            new Error('Failed to load WASM: CORS policy')
          );
          mockScript.onload && mockScript.onload();
        }, 0);
      });

      await expect(engine.initialize()).rejects.toThrow(/Failed to load WASM/);
    });

    it('should work with proper WASM configuration', async () => {
      // Mock successful loading
      const mockModule = {
        _rnnoise_create: vi.fn(() => 12345), // Return a valid state pointer
        _rnnoise_process_frame: vi.fn(),
        _rnnoise_destroy: vi.fn(),
        _malloc: vi.fn(() => 1000),
        _free: vi.fn(),
        HEAPF32: new Float32Array(10000)
      };

      vi.doMock('@jitsi/rnnoise-wasm', () => ({
        default: vi.fn().mockResolvedValue(mockModule)
      }));

      engine = new RNNoiseEngine();
      await engine.initialize();

      expect(engine.isInitialized).toBe(true);
      expect(mockModule._rnnoise_create).toHaveBeenCalled();
    });
  });

  describe('Process Method', () => {
    it('should throw error if not initialized', () => {
      engine = new RNNoiseEngine();
      const input = new Float32Array(480);
      
      expect(() => engine.process(input)).toThrow('RNNoiseEngine not initialized');
    });

    it('should require exactly 480 samples', async () => {
      engine = new RNNoiseEngine();
      
      // Mock successful initialization
      const mockModule = {
        _rnnoise_create: vi.fn(() => 12345),
        _rnnoise_process_frame: vi.fn(),
        _rnnoise_destroy: vi.fn(),
        _malloc: vi.fn(() => 1000),
        _free: vi.fn(),
        HEAPF32: new Float32Array(10000)
      };

      vi.doMock('@jitsi/rnnoise-wasm', () => ({
        default: vi.fn().mockResolvedValue(mockModule)
      }));

      await engine.initialize();

      const wrongSizeInput = new Float32Array(100);
      expect(() => engine.process(wrongSizeInput)).toThrow('RNNoise requires exactly 480 samples per frame');
    });
  });
});