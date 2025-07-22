import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MurmubaraEngine } from '../../core/MurmubaraEngine';
import { ErrorCodes } from '../../types';

// Advanced test suite to push coverage higher
describe('MurmubaraEngine Advanced Coverage', () => {
  let mockAudioContext: any;
  let mockScriptProcessor: any;
  let mockMediaStreamSource: any;

  beforeEach(() => {
    // Mock AudioContext
    mockScriptProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      addEventListener: vi.fn(),
      onaudioprocess: null
    };

    mockMediaStreamSource = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockAudioContext = {
      state: 'running',
      createMediaStreamSource: vi.fn(() => mockMediaStreamSource),
      createScriptProcessor: vi.fn(() => mockScriptProcessor),
      destination: {},
      close: vi.fn(() => Promise.resolve()),
      resume: vi.fn(() => Promise.resolve()),
      suspend: vi.fn(() => Promise.resolve()),
      sampleRate: 48000,
      currentTime: 0
    };

    // Setup global environment
    global.window = {
      AudioContext: vi.fn(() => mockAudioContext),
      webkitAudioContext: vi.fn(() => mockAudioContext),
      WebAssembly: {
        instantiate: vi.fn(),
        compile: vi.fn(),
        Module: vi.fn() as any,
        Instance: vi.fn() as any
      },
      navigator: {
        userAgent: 'test-agent',
        mediaDevices: {
          getUserMedia: vi.fn(),
          enumerateDevices: vi.fn(() => Promise.resolve([]))
        }
      },
      URL: {
        createObjectURL: vi.fn(() => 'blob:test'),
        revokeObjectURL: vi.fn()
      },
      performance: {
        memory: {
          usedJSHeapSize: 1000000,
          totalJSHeapSize: 2000000,
          jsHeapSizeLimit: 4000000
        }
      }
    } as any;

    global.AudioContext = global.window.AudioContext;
    global.WebAssembly = global.window.WebAssembly;
    global.navigator = global.window.navigator;
    global.URL = global.window.URL;
    global.performance = global.window.performance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization branches', () => {
    it('should handle already initialized state', async () => {
      const engine = new MurmubaraEngine();
      
      // Mock state to simulate already initialized
      engine['stateManager']['currentState'] = 'ready';
      
      await expect(engine.initialize()).rejects.toThrow('already initialized');
    });

    it('should return existing promise if initialization in progress', async () => {
      const engine = new MurmubaraEngine();
      
      // Start initialization
      const promise1 = engine.initialize();
      const promise2 = engine.initialize();
      
      expect(promise1).toBe(promise2);
    });

    it('should handle suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume = vi.fn(() => Promise.resolve());

      const engine = new MurmubaraEngine();
      
      // Mock WASM loading
      global.document = {
        createElement: vi.fn(() => ({
          onload: null,
          onerror: null,
          setAttribute: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (event === 'load') setTimeout(handler, 0);
          })
        })),
        head: {
          appendChild: vi.fn()
        }
      } as any;

      // This will fail but we're testing the resume call
      try {
        await engine.initialize();
      } catch {}

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should handle AudioContext creation failure', async () => {
      global.window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext failed');
      });

      const engine = new MurmubaraEngine();
      
      await expect(engine.initialize()).rejects.toThrow('AudioContext failed');
      expect(engine['stateManager'].getState()).toBe('error');
    });

    it('should handle WebAssembly not supported', async () => {
      global.window.WebAssembly = undefined as any;

      const engine = new MurmubaraEngine();
      
      await expect(engine.initialize()).rejects.toThrow('Environment not supported');
    });
  });

  describe('Degraded mode', () => {
    it('should initialize in degraded mode when configured', async () => {
      const engine = new MurmubaraEngine({ allowDegraded: true });
      const degradedHandler = vi.fn();
      
      engine.on('degraded-mode', degradedHandler);
      
      // Force failure
      global.window.WebAssembly = undefined as any;
      
      await engine.initialize();
      
      expect(degradedHandler).toHaveBeenCalled();
      expect(engine['stateManager'].getState()).toBe('degraded');
    });

    it('should handle audio context failure in degraded mode', async () => {
      const engine = new MurmubaraEngine({ allowDegraded: true });
      
      // Force WebAssembly failure
      global.window.WebAssembly = undefined as any;
      
      // Also fail audio context
      global.window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext failed');
      });
      
      await engine.initialize();
      
      // Should still enter degraded mode but log error
      expect(engine['stateManager'].getState()).toBe('degraded');
    });
  });

  describe('Error history', () => {
    it('should maintain error history limit of 10', () => {
      const engine = new MurmubaraEngine();
      
      // Add 15 errors
      for (let i = 0; i < 15; i++) {
        engine['recordError'](new Error(`Error ${i}`));
      }
      
      expect(engine['errorHistory'].length).toBe(10);
      expect(engine['errorHistory'][0].error).toBe('Error 5');
      expect(engine['errorHistory'][9].error).toBe('Error 14');
    });

    it('should handle non-Error objects', () => {
      const engine = new MurmubaraEngine();
      
      engine['recordError']('String error');
      engine['recordError'](123);
      engine['recordError']({ message: 'Object error' });
      
      expect(engine['errorHistory'].length).toBe(3);
      expect(engine['errorHistory'][0].error).toBe('String error');
      expect(engine['errorHistory'][1].error).toBe('123');
    });
  });

  describe('Auto cleanup', () => {
    it('should not setup cleanup when disabled', () => {
      const engine = new MurmubaraEngine({ autoCleanup: false });
      
      engine.emit('processing-end', 'test');
      
      expect(engine['cleanupTimer']).toBeUndefined();
    });

    it('should clear cleanup timer on processing start', () => {
      vi.useFakeTimers();
      
      const engine = new MurmubaraEngine({ 
        autoCleanup: true,
        cleanupDelay: 1000 
      });
      
      // Set a fake timer
      engine['cleanupTimer'] = setTimeout(() => {}, 1000) as any;
      
      engine.emit('processing-start', 'test');
      
      expect(engine['cleanupTimer']).toBeUndefined();
      
      vi.useRealTimers();
    });

    it('should trigger cleanup after delay when no active streams', () => {
      vi.useFakeTimers();
      
      const engine = new MurmubaraEngine({ 
        autoCleanup: true,
        cleanupDelay: 1000 
      });
      
      const destroySpy = vi.spyOn(engine, 'destroy');
      
      // Set ready state
      engine['stateManager']['currentState'] = 'ready';
      
      engine.emit('processing-end', 'test');
      
      vi.advanceTimersByTime(1000);
      
      expect(destroySpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Metrics forwarding', () => {
    it('should forward metrics updates', () => {
      const engine = new MurmubaraEngine();
      const metricsHandler = vi.fn();
      
      engine.on('metrics-update', metricsHandler);
      
      const mockMetrics = {
        processed: 100,
        latency: 5,
        cpuUsage: 20,
        memoryUsage: 1000000,
        queuedFrames: 0,
        droppedFrames: 0,
        processingLatency: 5
      };
      
      engine['metricsManager'].emit('metrics-update', mockMetrics);
      
      expect(metricsHandler).toHaveBeenCalledWith(mockMetrics);
    });
  });

  describe('Destroy method', () => {
    it('should force destroy from any state', async () => {
      const engine = new MurmubaraEngine();
      const destroyHandler = vi.fn();
      
      engine.on('destroyed', destroyHandler);
      
      await engine.destroy(true);
      
      expect(destroyHandler).toHaveBeenCalled();
      expect(engine['stateManager'].getState()).toBe('destroyed');
    });

    it('should cleanup resources on destroy', async () => {
      const engine = new MurmubaraEngine();
      
      // Mock some resources
      engine['audioContext'] = mockAudioContext;
      engine['wasmModule'] = {
        _rnnoise_destroy: vi.fn(),
        _free: vi.fn()
      };
      engine['rnnoiseState'] = {};
      engine['inputPtr'] = 123;
      engine['outputPtr'] = 456;
      
      // Add an active stream
      const mockStream = {
        cleanup: vi.fn()
      };
      engine['activeStreams'].set('test', mockStream as any);
      
      // Set state to allow destroy
      engine['stateManager']['currentState'] = 'ready';
      
      await engine.destroy();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(engine['wasmModule']._rnnoise_destroy).toHaveBeenCalled();
      expect(engine['wasmModule']._free).toHaveBeenCalledWith(123);
      expect(engine['wasmModule']._free).toHaveBeenCalledWith(456);
      expect(mockStream.cleanup).toHaveBeenCalled();
    });

    it('should handle errors during cleanup', async () => {
      const engine = new MurmubaraEngine();
      
      engine['audioContext'] = {
        close: vi.fn(() => Promise.reject(new Error('Close failed')))
      } as any;
      
      engine['stateManager']['currentState'] = 'ready';
      
      // Should not throw
      await engine.destroy();
      
      expect(engine['stateManager'].getState()).toBe('destroyed');
    });
  });

  describe('Configuration variations', () => {
    it('should handle all log levels', () => {
      const levels = ['none', 'error', 'warn', 'info', 'debug'] as const;
      
      levels.forEach(level => {
        const engine = new MurmubaraEngine({ logLevel: level });
        expect(engine['logger']['level']).toBe(level);
      });
    });

    it('should handle custom log handler', () => {
      const logHandler = vi.fn();
      const engine = new MurmubaraEngine({ 
        logLevel: 'info',
        onLog: logHandler 
      });
      
      engine['logger'].info('Test');
      
      expect(logHandler).toHaveBeenCalled();
    });

    it('should handle all algorithms', () => {
      const algorithms = ['rnnoise'] as const;
      
      algorithms.forEach(algorithm => {
        const engine = new MurmubaraEngine({ algorithm });
        expect(engine['config'].algorithm).toBe(algorithm);
      });
    });

    it('should handle worker configuration', () => {
      const engine = new MurmubaraEngine({
        useWorker: true,
        workerPath: '/custom/worker.js'
      });
      
      expect(engine['config'].useWorker).toBe(true);
      expect(engine['config'].workerPath).toBe('/custom/worker.js');
    });
  });

  describe('getDiagnostics coverage', () => {
    it('should return comprehensive diagnostics', () => {
      const engine = new MurmubaraEngine();
      
      // Add some state
      engine['activeStreams'].set('stream1', {} as any);
      engine['errorHistory'].push({
        timestamp: Date.now(),
        error: 'Test error'
      });
      
      const diagnostics = engine.getDiagnostics();
      
      expect(diagnostics).toBeDefined();
      expect(diagnostics.engineVersion).toBeDefined();
      expect(diagnostics.state).toBe('uninitialized');
      expect(diagnostics.activeStreams).toBe(1);
      expect(diagnostics.errorHistory).toHaveLength(1);
      expect(diagnostics.config).toMatchObject({
        noiseReductionLevel: 'medium',
        bufferSize: 4096,
        algorithm: 'rnnoise'
      });
    });

    it('should handle missing performance.memory', () => {
      global.performance = {} as any;
      
      const engine = new MurmubaraEngine();
      const diagnostics = engine.getDiagnostics();
      
      expect(diagnostics.systemInfo.memory).toBeUndefined();
    });
  });

  describe('WASM loading', () => {
    it('should handle WASM loading timeout', async () => {
      const engine = new MurmubaraEngine();
      
      // Mock slow WASM loading
      engine['loadWasmModule'] = vi.fn(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );
      
      await expect(engine.initialize()).rejects.toThrow('timeout');
    });

    it('should handle missing createRNNWasmModule', async () => {
      const engine = new MurmubaraEngine();
      
      global.document = {
        createElement: vi.fn(() => ({
          onload: null,
          onerror: null,
          setAttribute: vi.fn()
        })),
        head: {
          appendChild: vi.fn((script: any) => {
            setTimeout(() => script.onload(), 0);
          })
        }
      } as any;
      
      await expect(engine.initialize()).rejects.toThrow('RNNoise WASM module creator not found');
    });
  });
});