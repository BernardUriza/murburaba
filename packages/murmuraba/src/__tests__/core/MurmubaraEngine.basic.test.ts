import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MurmubaraEngine } from '../../core/MurmubaraEngine';
import { MurmubaraConfig, EngineState, MurmubaraError, ErrorCodes } from '../../types';

// Mock all dependencies
vi.mock('../../core/StateManager');
vi.mock('../../core/Logger');
vi.mock('../../managers/WorkerManager');
vi.mock('../../managers/MetricsManager');
vi.mock('../../managers/ChunkProcessor');
vi.mock('../../utils/SimpleAGC');
vi.mock('../../utils/AudioResampler');

// Import mocks after vi.mock
import { StateManager } from '../../core/StateManager';
import { Logger } from '../../core/Logger';
import { WorkerManager } from '../../managers/WorkerManager';
import { MetricsManager } from '../../managers/MetricsManager';

describe('MurmubaraEngine - Basic Tests', () => {
  let engine: MurmubaraEngine;
  let mockStateManager: any;
  let mockLogger: any;
  let mockWorkerManager: any;
  let mockMetricsManager: any;
  let mockAudioContext: any;
  let mockWasmModule: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock instances
    mockStateManager = {
      on: vi.fn(),
      off: vi.fn(),
      transitionTo: vi.fn(),
      canTransitionTo: vi.fn().mockReturnValue(true),
      isInState: vi.fn().mockReturnValue(false),
      getState: vi.fn().mockReturnValue('uninitialized' as EngineState),
      reset: vi.fn()
    };
    
    mockLogger = {
      setLevel: vi.fn(),
      setLogHandler: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
    
    mockWorkerManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      terminate: vi.fn().mockResolvedValue(undefined)
    };
    
    mockMetricsManager = {
      on: vi.fn(),
      off: vi.fn(),
      startAutoUpdate: vi.fn(),
      stopAutoUpdate: vi.fn(),
      reset: vi.fn(),
      getMetrics: vi.fn().mockReturnValue({
        frameCount: 0,
        droppedFrames: 0,
        processingLatency: 0,
        inputLevel: 0,
        outputLevel: 0,
        noiseReductionLevel: 0,
        timestamp: Date.now()
      })
    };

    // Mock constructors
    vi.mocked(StateManager).mockReturnValue(mockStateManager);
    vi.mocked(Logger).mockReturnValue(mockLogger);
    vi.mocked(WorkerManager).mockReturnValue(mockWorkerManager);
    vi.mocked(MetricsManager).mockReturnValue(mockMetricsManager);

    // Mock WASM module
    mockWasmModule = {
      _rnnoise_create: vi.fn().mockReturnValue(12345),
      _rnnoise_destroy: vi.fn(),
      _rnnoise_process_frame: vi.fn().mockReturnValue(0.8),
      _malloc: vi.fn((size) => size),
      _free: vi.fn(),
      HEAPF32: new Float32Array(10000)
    };

    // Mock AudioContext
    mockAudioContext = {
      state: 'running',
      sampleRate: 48000,
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }),
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createMediaStreamDestination: vi.fn().mockReturnValue({
        stream: new MediaStream()
      }),
      createBiquadFilter: vi.fn().mockReturnValue({
        type: '',
        frequency: { value: 0 },
        Q: { value: 0 },
        gain: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
        getByteTimeDomainData: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined)
    };

    // Mock globals
    global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
    global.window = {
      AudioContext: global.AudioContext,
      webkitAudioContext: global.AudioContext,
      WebAssembly: {},
      createRNNWasmModule: vi.fn().mockResolvedValue(mockWasmModule)
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      engine = new MurmubaraEngine();
      
      expect(StateManager).toHaveBeenCalled();
      expect(Logger).toHaveBeenCalledWith('[Murmuraba]');
      expect(WorkerManager).toHaveBeenCalledWith(mockLogger);
      expect(MetricsManager).toHaveBeenCalled();
      
      expect(mockLogger.setLevel).toHaveBeenCalledWith('info');
    });

    it('should create instance with custom config', () => {
      const config: MurmubaraConfig = {
        logLevel: 'debug',
        noiseReductionLevel: 'high',
        bufferSize: 8192,
        algorithm: 'rnnoise',
        autoCleanup: false,
        cleanupDelay: 60000,
        useWorker: true,
        workerPath: '/custom/worker.js',
        allowDegraded: true,
        onLog: vi.fn()
      };
      
      engine = new MurmubaraEngine(config);
      
      expect(mockLogger.setLevel).toHaveBeenCalledWith('debug');
      expect(mockLogger.setLogHandler).toHaveBeenCalledWith(config.onLog);
    });

    it('should setup event forwarding', () => {
      engine = new MurmubaraEngine();
      
      expect(mockStateManager.on).toHaveBeenCalledWith('state-change', expect.any(Function));
      expect(mockMetricsManager.on).toHaveBeenCalledWith('metrics-update', expect.any(Function));
    });

    it('should forward state change events', () => {
      engine = new MurmubaraEngine();
      const stateChangeSpy = vi.fn();
      engine.on('state-change', stateChangeSpy);
      
      // Get the state change handler
      const stateChangeHandler = mockStateManager.on.mock.calls[0][1];
      stateChangeHandler('uninitialized', 'initializing');
      
      expect(mockLogger.info).toHaveBeenCalledWith('State transition: uninitialized -> initializing');
      expect(stateChangeSpy).toHaveBeenCalledWith('uninitialized', 'initializing');
    });

    it('should forward metrics update events', () => {
      engine = new MurmubaraEngine();
      const metricsUpdateSpy = vi.fn();
      engine.on('metrics-update', metricsUpdateSpy);
      
      // Get the metrics update handler
      const metricsHandler = mockMetricsManager.on.mock.calls[0][1];
      const mockMetrics = { frameCount: 100 };
      metricsHandler(mockMetrics);
      
      expect(metricsUpdateSpy).toHaveBeenCalledWith(mockMetrics);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      // Mock document for script loading
      global.document = {
        createElement: vi.fn(() => {
          const script = {
            onload: null,
            onerror: null,
            src: ''
          };
          return script;
        }),
        head: {
          appendChild: vi.fn((script: any) => {
            // Simulate successful script load
            setTimeout(() => script.onload?.(), 0);
          })
        }
      } as any;
      
      engine = new MurmubaraEngine();
    });

    it('should initialize successfully', async () => {
      const initSpy = vi.fn();
      engine.on('initialized', initSpy);
      
      await engine.initialize();
      
      expect(mockStateManager.canTransitionTo).toHaveBeenCalledWith('initializing');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('initializing');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('creating-context');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('loading-wasm');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('ready');
      expect(mockMetricsManager.startAutoUpdate).toHaveBeenCalledWith(100);
      expect(initSpy).toHaveBeenCalled();
    });

    it('should handle concurrent initialization', async () => {
      // Start first initialization
      const promise1 = engine.initialize();
      
      // Immediately start second initialization
      const promise2 = engine.initialize();
      
      // Both should be the same promise
      expect(promise1).toBe(promise2);
      
      // Wait for completion
      await Promise.all([promise1, promise2]);
      
      // Verify only initialized once
      expect(mockStateManager.transitionTo).toHaveBeenCalledTimes(5); // initializing, creating-context, loading-wasm, ready + one for constructor
    });

    it('should throw if already initialized', async () => {
      mockStateManager.canTransitionTo.mockReturnValue(false);
      
      await expect(engine.initialize()).rejects.toThrow(MurmubaraError);
      await expect(engine.initialize()).rejects.toMatchObject({
        code: ErrorCodes.ALREADY_INITIALIZED
      });
    });

    it('should check environment support', async () => {
      delete (global.window as any).WebAssembly;
      
      await expect(engine.initialize()).rejects.toThrow('Environment not supported');
      expect(mockLogger.error).toHaveBeenCalledWith('WebAssembly not supported');
    });

    it('should handle suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      
      await engine.initialize();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should handle AudioContext creation failure', async () => {
      global.AudioContext = vi.fn().mockImplementation(() => {
        throw new Error('AudioContext failed');
      });
      
      await expect(engine.initialize()).rejects.toThrow('Failed to create AudioContext');
    });

    it('should load WASM module with timeout', async () => {
      // Make WASM loading slow
      (global.window as any).createRNNWasmModule = vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve(mockWasmModule), 100))
      );
      
      await engine.initialize();
      
      expect((global.window as any).createRNNWasmModule).toHaveBeenCalled();
    });

    it('should handle WASM loading timeout', async () => {
      // Make WASM loading hang
      (global.window as any).createRNNWasmModule = vi.fn(() => 
        new Promise(() => {}) // Never resolves
      );
      
      await expect(engine.initialize()).rejects.toThrow('WASM loading timeout');
    });

    it('should handle degraded mode when allowed', async () => {
      // Create new mocks for degraded engine
      const degradedStateManager = {
        ...mockStateManager,
        transitionTo: vi.fn()
      };
      const degradedLogger = {
        ...mockLogger
      };
      
      vi.mocked(StateManager).mockReturnValueOnce(degradedStateManager);
      vi.mocked(Logger).mockReturnValueOnce(degradedLogger);
      
      const degradedEngine = new MurmubaraEngine({ allowDegraded: true });
      
      // Make WASM fail
      delete (global.window as any).createRNNWasmModule;
      
      await degradedEngine.initialize();
      
      expect(degradedLogger.warn).toHaveBeenCalledWith('Attempting degraded mode initialization...');
      expect(degradedStateManager.transitionTo).toHaveBeenCalledWith('degraded');
    });

    it('should create RNNoise state', async () => {
      await engine.initialize();
      
      expect(mockWasmModule._rnnoise_create).toHaveBeenCalledWith(0);
      expect(mockWasmModule._malloc).toHaveBeenCalledTimes(2); // input and output buffers
    });

    it('should handle RNNoise state creation failure', async () => {
      mockWasmModule._rnnoise_create.mockReturnValue(null);
      
      await expect(engine.initialize()).rejects.toThrow('Failed to create RNNoise state');
    });

    it('should warm up WASM module', async () => {
      await engine.initialize();
      
      // Should process 10 silent frames
      expect(mockWasmModule._rnnoise_process_frame).toHaveBeenCalledTimes(10);
    });
  });

  describe('processStream', () => {
    let mockStream: MediaStream;

    beforeEach(async () => {
      engine = new MurmubaraEngine();
      mockStream = new MediaStream();
      
      // Initialize engine first
      mockStateManager.isInState.mockReturnValue(true); // ready state
      await engine.initialize();
    });

    it('should process stream successfully', async () => {
      const controller = await engine.processStream(mockStream);
      
      expect(controller).toBeDefined();
      expect(controller.streamId).toBeDefined();
      expect(controller.stream).toBeInstanceOf(MediaStream);
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
    });

    it('should throw if not initialized', async () => {
      const uninitializedEngine = new MurmubaraEngine();
      mockStateManager.isInState.mockReturnValue(false);
      
      await expect(uninitializedEngine.processStream(mockStream)).rejects.toThrow('not in a valid state');
    });

    it('should emit processing events', async () => {
      const startSpy = vi.fn();
      const endSpy = vi.fn();
      engine.on('processing-start', startSpy);
      engine.on('processing-end', endSpy);
      
      const controller = await engine.processStream(mockStream);
      expect(startSpy).toHaveBeenCalledWith(controller.streamId);
      
      controller.stop();
      expect(endSpy).toHaveBeenCalledWith(controller.streamId);
    });
  });

  describe('destroy', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });

    it('should destroy engine cleanly', async () => {
      await engine.destroy();
      
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('destroying');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('destroyed');
      expect(mockWasmModule._rnnoise_destroy).toHaveBeenCalled();
      expect(mockWasmModule._free).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockMetricsManager.stopAutoUpdate).toHaveBeenCalled();
    });

    it('should handle errors during cleanup', async () => {
      mockAudioContext.close.mockRejectedValue(new Error('Close failed'));
      
      await engine.destroy();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to close audio context'));
    });

    it('should allow force destroy', async () => {
      mockStateManager.canTransitionTo.mockReturnValue(false);
      
      await engine.destroy(true);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Force destroying engine');
    });
  });

  describe('auto cleanup', () => {
    it('should setup cleanup timer when enabled', () => {
      vi.useFakeTimers();
      engine = new MurmubaraEngine({ autoCleanup: true, cleanupDelay: 1000 });
      
      // Simulate ready state with no active streams
      mockStateManager.isInState.mockReturnValue(true);
      
      // Trigger processing end
      const processingEndHandler = engine['listeners'].get('processing-end')?.[0];
      if (processingEndHandler) processingEndHandler('test-stream');
      
      // Fast forward time
      vi.advanceTimersByTime(1000);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-cleanup triggered due to inactivity');
      
      vi.useRealTimers();
    });

    it('should cancel cleanup timer on new processing', () => {
      vi.useFakeTimers();
      engine = new MurmubaraEngine({ autoCleanup: true, cleanupDelay: 1000 });
      
      // Setup cleanup timer
      mockStateManager.isInState.mockReturnValue(true);
      const processingEndHandler = engine['listeners'].get('processing-end')?.[0];
      if (processingEndHandler) processingEndHandler('test-stream');
      
      // Start new processing before cleanup
      const processingStartHandler = engine['listeners'].get('processing-start')?.[0];
      if (processingStartHandler) processingStartHandler('new-stream');
      
      // Fast forward time
      vi.advanceTimersByTime(2000);
      
      // Should not trigger cleanup
      expect(mockLogger.info).not.toHaveBeenCalledWith('Auto-cleanup triggered due to inactivity');
      
      vi.useRealTimers();
    });
  });

  describe('getters', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });

    it('should get current state', () => {
      mockStateManager.getState.mockReturnValue('ready');
      expect(engine.state).toBe('ready');
    });

    it('should check if initialized', () => {
      mockStateManager.isInState.mockReturnValue(true);
      expect(engine.isInitialized).toBe(true);
    });

    it('should get active stream count', async () => {
      const stream = new MediaStream();
      await engine.processStream(stream);
      
      expect(engine.activeStreamCount).toBe(1);
    });

    it('should get diagnostics', async () => {
      const diagnostics = await engine.getDiagnostics();
      
      expect(diagnostics).toHaveProperty('engineVersion');
      expect(diagnostics).toHaveProperty('state');
      expect(diagnostics).toHaveProperty('config');
      expect(diagnostics).toHaveProperty('environment');
      expect(diagnostics).toHaveProperty('performance');
    });
  });
});