import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  initializeAudioEngine,
  getEngine,
  processStream,
  processStreamChunked,
  destroyEngine,
  getEngineStatus,
  getDiagnostics,
  onMetricsUpdate,
  processFile
} from '../../api';
import { MurmubaraEngine } from '../../core/MurmubaraEngine';

// Mock MurmubaraEngine
vi.mock('../../core/MurmubaraEngine', () => ({
  MurmubaraEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    processStream: vi.fn().mockResolvedValue({}),
    processStreamChunked: vi.fn().mockResolvedValue([]),
    destroy: vi.fn().mockResolvedValue(undefined),
    processFile: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
    getEngineStatus: vi.fn().mockReturnValue('ready'),
    getDiagnostics: vi.fn().mockReturnValue({
      initialized: true,
      audioContextState: 'running',
      sampleRate: 48000,
      rnnoiseSampleRate: 48000,
      resamplerEnabled: false,
      wasmLoaded: true,
      degradedMode: false,
      currentLatency: 10,
      processingLoad: 0.1
    }),
    on: vi.fn(),
    off: vi.fn()
  }))
}));

describe('API', () => {
  let mockEngine: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    (global as any).__murmurabaEngine = undefined;
  });

  describe('initializeAudioEngine', () => {
    it('should initialize engine with default config', async () => {
      await initializeAudioEngine();
      
      expect(MurmubaraEngine).toHaveBeenCalledWith({});
      
      const engine = getEngine();
      expect(engine.initialize).toHaveBeenCalled();
    });

    it('should initialize engine with custom config', async () => {
      const config = { 
        enableAGC: true,
        targetLevel: 0.8
      };
      
      await initializeAudioEngine(config);
      
      expect(MurmubaraEngine).toHaveBeenCalledWith(config);
    });

    it('should reuse existing engine', async () => {
      await initializeAudioEngine();
      await initializeAudioEngine();
      
      expect(MurmubaraEngine).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      vi.mocked(MurmubaraEngine).mockImplementationOnce(() => ({
        initialize: vi.fn().mockRejectedValue(error),
        destroy: vi.fn()
      } as any));
      
      await expect(initializeAudioEngine()).rejects.toThrow('Init failed');
    });
  });

  describe('getEngine', () => {
    it('should throw if engine not initialized', () => {
      expect(() => getEngine()).toThrow('Murmuraba engine not initialized');
    });

    it('should return engine after initialization', async () => {
      await initializeAudioEngine();
      
      const engine = getEngine();
      expect(engine).toBeDefined();
      expect(engine.initialize).toBeDefined();
    });
  });

  describe('processStream', () => {
    it('should process stream through engine', async () => {
      await initializeAudioEngine();
      
      const stream = new MediaStream();
      const options = { enableVAD: true };
      
      const result = await processStream(stream, options);
      
      const engine = getEngine();
      expect(engine.processStream).toHaveBeenCalledWith(stream, options);
    });

    it('should throw if engine not initialized', async () => {
      const stream = new MediaStream();
      
      await expect(processStream(stream)).rejects.toThrow('Murmuraba engine not initialized');
    });
  });

  describe('processStreamChunked', () => {
    it('should process stream in chunks', async () => {
      await initializeAudioEngine();
      
      const stream = new MediaStream();
      const options = { chunkDuration: 5000 };
      
      const result = await processStreamChunked(stream, options);
      
      const engine = getEngine();
      expect(engine.processStreamChunked).toHaveBeenCalledWith(stream, options);
    });
  });

  describe('processFile', () => {
    it('should process file through engine', async () => {
      await initializeAudioEngine();
      
      const buffer = new ArrayBuffer(1000);
      const result = await processFile(buffer);
      
      const engine = getEngine();
      expect(engine.processFile).toHaveBeenCalledWith(buffer);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('destroyEngine', () => {
    it('should destroy engine if initialized', async () => {
      await initializeAudioEngine();
      await destroyEngine();
      
      const engine = (global as any).__murmurabaEngine;
      expect(engine.destroy).toHaveBeenCalled();
      expect((global as any).__murmurabaEngine).toBeUndefined();
    });

    it('should handle destroying non-initialized engine', async () => {
      await expect(destroyEngine()).resolves.toBeUndefined();
    });
  });

  describe('getEngineStatus', () => {
    it('should return engine status', async () => {
      await initializeAudioEngine();
      
      const status = getEngineStatus();
      expect(status).toBe('ready');
    });

    it('should return uninitialized if engine not created', () => {
      const status = getEngineStatus();
      expect(status).toBe('uninitialized');
    });
  });

  describe('getDiagnostics', () => {
    it('should return engine diagnostics', async () => {
      await initializeAudioEngine();
      
      const diagnostics = getDiagnostics();
      expect(diagnostics).toMatchObject({
        initialized: true,
        audioContextState: 'running',
        sampleRate: 48000,
        wasmLoaded: true
      });
    });

    it('should return basic diagnostics if engine not initialized', () => {
      const diagnostics = getDiagnostics();
      expect(diagnostics).toMatchObject({
        initialized: false,
        audioContextState: 'uninitialized'
      });
    });
  });

  describe('onMetricsUpdate', () => {
    it('should register metrics listener', async () => {
      await initializeAudioEngine();
      
      const callback = vi.fn();
      const unsubscribe = onMetricsUpdate(callback);
      
      const engine = getEngine();
      expect(engine.on).toHaveBeenCalledWith('metrics:update', callback);
      
      unsubscribe();
      expect(engine.off).toHaveBeenCalledWith('metrics:update', callback);
    });

    it('should handle listener without engine', () => {
      const callback = vi.fn();
      const unsubscribe = onMetricsUpdate(callback);
      
      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle engine creation failure', async () => {
      vi.mocked(MurmubaraEngine).mockImplementationOnce(() => {
        throw new Error('Failed to create engine');
      });
      
      await expect(initializeAudioEngine()).rejects.toThrow('Failed to create engine');
    });

    it('should cleanup on initialization failure', async () => {
      const mockDestroy = vi.fn();
      vi.mocked(MurmubaraEngine).mockImplementationOnce(() => ({
        initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
        destroy: mockDestroy
      } as any));
      
      await expect(initializeAudioEngine()).rejects.toThrow('Init failed');
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});