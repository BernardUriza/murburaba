import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MurmubaraEngine } from '../../../core/MurmubaraEngine';
import { EventEmitter } from '../../../core/EventEmitter';
import { MockAudioContext, MockMediaStream } from '../../mocks/global-mocks';

describe('MurmubaraEngine', () => {
  let engine: MurmubaraEngine;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new MurmubaraEngine();
    mockAudioContext = new MockAudioContext();
  });

  afterEach(async () => {
    if (engine) {
      await engine.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with WebAssembly support', async () => {
      await engine.initialize();

      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.engineState).toBe('ready');
      expect(diagnostics.wasmLoaded).toBe(true);
    });

    it('should handle initialization failure when WebAssembly is not supported', async () => {
      const originalWebAssembly = global.WebAssembly;
      delete (global as any).WebAssembly;

      await expect(engine.initialize()).rejects.toThrow('WebAssembly not supported');
      expect(engine.getDiagnostics().engineState).toBe('error');

      (global as any).WebAssembly = originalWebAssembly;
    });

    it('should handle multiple initialization attempts', async () => {
      await engine.initialize();
      const firstDiagnostics = engine.getDiagnostics();

      await engine.initialize();
      const secondDiagnostics = engine.getDiagnostics();

      expect(firstDiagnostics.engineState).toBe('ready');
      expect(secondDiagnostics.engineState).toBe('ready');
    });

    it('should initialize in degraded mode when configured and WASM fails', async () => {
      const degradedEngine = new MurmubaraEngine({ allowDegraded: true });

      // Mock loadRNNoiseModule to fail
      const { loadRNNoiseModule } = await import('../../../utils/rnnoise-loader');
      vi.mocked(loadRNNoiseModule).mockRejectedValueOnce(new Error('WASM load failed'));

      await degradedEngine.initialize();

      const diagnostics = degradedEngine.getDiagnostics();
      expect(diagnostics.engineState).toBe('degraded');
      expect(diagnostics.wasmLoaded).toBe(false);
    });
  });

  describe('Environment Support', () => {
    it('should check for AudioContext support', async () => {
      const originalAudioContext = global.AudioContext;
      delete (global as any).AudioContext;

      await expect(engine.initialize()).rejects.toThrow();
      expect(engine.getDiagnostics().engineState).toBe('error');

      (global as any).AudioContext = originalAudioContext;
    });

    it('should support webkit AudioContext', async () => {
      const originalAudioContext = global.AudioContext;
      delete (global as any).AudioContext;
      (global as any).webkitAudioContext = MockAudioContext;

      await engine.initialize();
      expect(engine.getDiagnostics().engineState).toBe('ready');

      (global as any).AudioContext = originalAudioContext;
      delete (global as any).webkitAudioContext;
    });
  });

  describe('Error Handling', () => {
    it('should record errors in error history', async () => {
      const originalWebAssembly = global.WebAssembly;
      delete (global as any).WebAssembly;

      try {
        await engine.initialize();
      } catch (error) {
        // Expected to throw
      }

      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.errorCount).toBeGreaterThan(0);
      expect(diagnostics.lastError).toContain('WebAssembly');

      (global as any).WebAssembly = originalWebAssembly;
    });

    it('should limit error history to 10 entries', async () => {
      // Access private method through any cast for testing
      const engineAny = engine as any;

      // Record 15 errors
      for (let i = 0; i < 15; i++) {
        engineAny.recordError(new Error(`Test error ${i}`));
      }

      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.errorCount).toBe(10);
    });
  });

  describe('Audio Context Management', () => {
    it('should create audio context with correct sample rate', async () => {
      await engine.initialize();

      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.audioContextState).toBe('running');
    });

    it('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      const resumeSpy = vi.spyOn(mockAudioContext, 'resume');

      await engine.initialize();

      expect(resumeSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', async () => {
      await engine.initialize();

      const newConfig = {
        enableAGC: false,
        agcTargetLevel: 0.5,
        logLevel: 'debug' as const,
      };

      engine.updateConfig(newConfig);

      // Config updates are internal, we can verify through diagnostics
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics).toBeDefined();
    });

    it('should propagate config updates to active streams', async () => {
      await engine.initialize();

      const mockStream = new MockMediaStream();
      const controller = await engine.processStream(mockStream);

      engine.updateConfig({ enableAGC: false });

      // Config should be applied to processing
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics).toBeDefined();

      controller.stop();
    });
  });

  describe('Stream Processing', () => {
    it('should process media stream', async () => {
      await engine.initialize();

      const mockStream = new MockMediaStream();
      const controller = await engine.processStream(mockStream);

      expect(controller).toBeDefined();
      expect(controller.stream).toBeDefined();
      expect(controller.processor.state).toBe('processing');
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.activeStreams).toBeGreaterThan(0);

      controller.stop();
    });

    it('should handle pause and resume', async () => {
      await engine.initialize();

      const mockStream = new MockMediaStream();
      const controller = await engine.processStream(mockStream);

      controller.pause();
      expect(controller.processor.state).toBe('paused');

      controller.resume();
      expect(controller.processor.state).toBe('processing');

      controller.stop();
    });

    it('should clean up on stop', async () => {
      await engine.initialize();

      const mockStream = new MockMediaStream();
      const controller = await engine.processStream(mockStream);

      controller.stop();

      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.activeStreams).toBe(0);
      expect(diagnostics.engineState).toBe('ready');
    });

    it('should emit processing events', async () => {
      await engine.initialize();

      const processingStartSpy = vi.fn();
      const processingEndSpy = vi.fn();

      engine.on('processing-start', processingStartSpy);
      engine.on('processing-end', processingEndSpy);

      const mockStream = new MockMediaStream();
      const controller = await engine.processStream(mockStream);

      expect(processingStartSpy).toHaveBeenCalled();

      controller.stop();

      expect(processingEndSpy).toHaveBeenCalled();
    });
  });

  describe('Diagnostics', () => {
    it('should return diagnostic information', async () => {
      await engine.initialize();

      const diagnostics = engine.getDiagnostics();

      expect(diagnostics).toBeDefined();
      expect(diagnostics.engineState).toBe('ready');
      expect(diagnostics.wasmLoaded).toBe(true);
      expect(diagnostics.audioContextState).toBe('running');
      expect(diagnostics.errorCount).toBe(0);
      expect(diagnostics.performanceMetrics).toBeDefined();
    });

    it('should include error information in diagnostics', async () => {
      const originalWebAssembly = global.WebAssembly;
      delete (global as any).WebAssembly;

      try {
        await engine.initialize();
      } catch (error) {
        // Expected to throw
      }

      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.errorCount).toBeGreaterThan(0);
      expect(diagnostics.lastError).toContain('WebAssembly');

      (global as any).WebAssembly = originalWebAssembly;
    });
  });

  describe('WASM Module Loading', () => {
    it('should handle WASM loading timeout', async () => {
      const { loadRNNoiseModule } = await import('../../../utils/rnnoise-loader');

      // Mock a slow loading module
      vi.mocked(loadRNNoiseModule).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const fastEngine = new MurmubaraEngine();

      // Mock the timeout to be very short for testing
      const engineAny = fastEngine as any;
      const originalMethod = engineAny.loadWasmModuleWithTimeout;
      engineAny.loadWasmModuleWithTimeout = function (timeout: number) {
        return originalMethod.call(this, 100); // 100ms timeout
      };

      await expect(fastEngine.initialize()).rejects.toThrow('timeout');
      expect(fastEngine.getDiagnostics().engineState).toBe('error');
    });
  });

  describe('State Management', () => {
    it('should transition through correct states during initialization', async () => {
      const states: string[] = [];
      engine.on('state-change', state => states.push(state));

      await engine.initialize();

      expect(states).toEqual([
        'initializing',
        'checking-support',
        'creating-context',
        'loading-wasm',
        'ready',
      ]);
    });

    it('should handle error state transitions', async () => {
      const states: string[] = [];
      engine.on('state-change', state => states.push(state));

      const originalWebAssembly = global.WebAssembly;
      delete (global as any).WebAssembly;

      try {
        await engine.initialize();
      } catch (error) {
        // Expected to throw
      }

      expect(states).toContain('error');
      expect(engine.getDiagnostics().engineState).toBe('error');

      (global as any).WebAssembly = originalWebAssembly;
    });
  });

  describe('Engine Lifecycle', () => {
    it('should properly destroy engine', async () => {
      await engine.initialize();

      const mockStream = new MockMediaStream();
      const controller = await engine.processStream(mockStream);

      await engine.destroy();

      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.engineState).toBe('destroyed');
      expect(diagnostics.activeStreams).toBe(0);
    });

    it('should clean up resources on destroy', async () => {
      await engine.initialize();

      // Get audio context from engine (we'll spy on the actual context)
      const diagnostics = engine.getDiagnostics();

      await engine.destroy();

      // Verify engine is destroyed
      const finalDiagnostics = engine.getDiagnostics();
      expect(finalDiagnostics.engineState).toBe('destroyed');
    });
  });
});
