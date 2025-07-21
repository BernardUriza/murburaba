/**
 * BOSS FIGHT: MurmubaraEngine
 * 773 lines of pure complexity
 * This is where boys become men
 */

import { MurmubaraEngine } from '../../core/MurmubaraEngine';
import { StateManager } from '../../core/StateManager';
import { Logger } from '../../core/Logger';
import { WorkerManager } from '../../managers/WorkerManager';
import { MetricsManager } from '../../managers/MetricsManager';
import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { MurmubaraConfig, EngineState } from '../../types';

// Mock all dependencies
jest.mock('../../core/StateManager');
jest.mock('../../core/Logger');
jest.mock('../../managers/WorkerManager');
jest.mock('../../managers/MetricsManager');
jest.mock('../../managers/ChunkProcessor');

// Mock WASM
const mockWasmModule = {
  _rnnoise_create: jest.fn().mockReturnValue(123),
  _rnnoise_destroy: jest.fn(),
  _rnnoise_process_frame: jest.fn().mockReturnValue(1),
  _malloc: jest.fn().mockReturnValue(1000),
  _free: jest.fn(),
  HEAPF32: new Float32Array(10000),
  HEAP32: new Int32Array(10000)
};

// Mock AudioContext
const mockAudioContext = {
  state: 'running' as AudioContextState,
  sampleRate: 48000,
  destination: { maxChannelCount: 2 },
  createScriptProcessor: jest.fn(),
  createMediaStreamSource: jest.fn(),
  createMediaStreamDestination: jest.fn(),
  createBiquadFilter: jest.fn(),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
};

// Mock nodes
const mockScriptProcessor = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  onaudioprocess: null as any,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockMediaStreamSource = {
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockMediaStreamDestination = {
  stream: { 
    id: 'mock-output-stream',
    getTracks: jest.fn().mockReturnValue([]),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
};

const mockBiquadFilter = {
  type: '' as BiquadFilterType,
  frequency: { value: 0 },
  Q: { value: 0 },
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Setup global mocks
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  
  // Note: jest.useFakeTimers() already mocks setTimeout/clearTimeout
  // We don't need to mock them again
  
  // Mock window - need to properly mock these for checkEnvironmentSupport
  global.window = Object.assign(global.window || {}, {
    AudioContext: jest.fn(() => mockAudioContext),
    webkitAudioContext: jest.fn(() => mockAudioContext),
    WebAssembly: {},
    createRNNWasmModule: jest.fn().mockResolvedValue(mockWasmModule)
  });
  
  // Mock document
  global.document = {
    createElement: jest.fn().mockReturnValue({
      onload: null,
      onerror: null,
      src: ''
    }),
    head: {
      appendChild: jest.fn()
    }
  } as any;
  
  // Reset audio nodes
  mockAudioContext.createScriptProcessor.mockReturnValue(mockScriptProcessor);
  mockAudioContext.createMediaStreamSource.mockReturnValue(mockMediaStreamSource);
  mockAudioContext.createMediaStreamDestination.mockReturnValue(mockMediaStreamDestination);
  mockAudioContext.createBiquadFilter.mockReturnValue(mockBiquadFilter);
  
  mockScriptProcessor.onaudioprocess = null;
  mockScriptProcessor.connect.mockClear();
  mockScriptProcessor.disconnect.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MurmubaraEngine - The Final Boss', () => {
  let engine: MurmubaraEngine;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockLogger: jest.Mocked<Logger>;
  let mockWorkerManager: jest.Mocked<WorkerManager>;
  let mockMetricsManager: jest.Mocked<MetricsManager>;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    mockStateManager = {
      getState: jest.fn().mockReturnValue('uninitialized'),
      canTransitionTo: jest.fn().mockReturnValue(true),
      transitionTo: jest.fn().mockReturnValue(true),
      isInState: jest.fn().mockReturnValue(false),
      requireState: jest.fn(),
      reset: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      listenerCount: jest.fn().mockReturnValue(0)
    } as any;
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
      setLogHandler: jest.fn()
    } as any;
    
    mockWorkerManager = {
      createWorker: jest.fn(),
      getWorker: jest.fn(),
      sendMessage: jest.fn(),
      terminateWorker: jest.fn(),
      terminateAll: jest.fn(),
      getActiveWorkerCount: jest.fn().mockReturnValue(0),
      getWorkerIds: jest.fn().mockReturnValue([])
    } as any;
    
    mockMetricsManager = {
      startAutoUpdate: jest.fn(),
      stopAutoUpdate: jest.fn(),
      updateInputLevel: jest.fn(),
      updateOutputLevel: jest.fn(),
      updateNoiseReduction: jest.fn(),
      recordFrame: jest.fn(),
      recordDroppedFrame: jest.fn(),
      recordChunk: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({
        noiseReductionLevel: 0,
        processingLatency: 0,
        inputLevel: 0,
        outputLevel: 0,
        timestamp: Date.now(),
        frameCount: 0,
        droppedFrames: 0
      }),
      reset: jest.fn(),
      calculateRMS: jest.fn().mockReturnValue(0.5),
      calculatePeak: jest.fn().mockReturnValue(0.8),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      listenerCount: jest.fn().mockReturnValue(0)
    } as any;
    
    // Mock constructors
    (StateManager as jest.MockedClass<typeof StateManager>).mockImplementation(() => mockStateManager);
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
    (WorkerManager as jest.MockedClass<typeof WorkerManager>).mockImplementation(() => mockWorkerManager);
    (MetricsManager as jest.MockedClass<typeof MetricsManager>).mockImplementation(() => mockMetricsManager);
    
    // Ensure ChunkProcessor is properly mocked if needed
    (ChunkProcessor as jest.MockedClass<typeof ChunkProcessor>).mockImplementation(
      (sampleRate, config, logger, metrics) => ({
        addSamples: jest.fn(),
        flush: jest.fn(),
        reset: jest.fn(),
        getStatus: jest.fn().mockReturnValue({
          currentSampleCount: 0,
          samplesPerChunk: 48000,
          chunkIndex: 0,
          bufferFillPercentage: 0
        }),
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn(),
        removeAllListeners: jest.fn(),
        listenerCount: jest.fn().mockReturnValue(0)
      } as any)
    );
  });
  
  describe('Constructor', () => {
    it('should create engine with default config', () => {
      engine = new MurmubaraEngine();
      
      expect(StateManager).toHaveBeenCalled();
      expect(Logger).toHaveBeenCalledWith('[Murmuraba]');
      expect(WorkerManager).toHaveBeenCalledWith(mockLogger);
      expect(MetricsManager).toHaveBeenCalled();
    });
    
    it('should create engine with custom config', () => {
      const config: MurmubaraConfig = {
        logLevel: 'debug',
        noiseReductionLevel: 'high',
        bufferSize: 2048,
        algorithm: 'rnnoise',
        autoCleanup: true,
        cleanupDelay: 30000,
        useWorker: true,
        workerPath: '/custom-worker.js',
        allowDegraded: true,
        onLog: jest.fn()
      };
      
      engine = new MurmubaraEngine(config);
      
      expect(mockLogger.setLevel).toHaveBeenCalledWith('debug');
      expect(mockLogger.setLogHandler).toHaveBeenCalledWith(config.onLog);
    });
    
    it('should setup event forwarding', () => {
      engine = new MurmubaraEngine();
      
      // Should forward state changes
      expect(mockStateManager.on).toHaveBeenCalledWith('state-change', expect.any(Function));
      
      // Should forward metrics updates
      expect(mockMetricsManager.on).toHaveBeenCalledWith('metrics-update', expect.any(Function));
      
      // Test forwarding
      const stateHandler = mockStateManager.on.mock.calls.find(c => c[0] === 'state-change')?.[1];
      const metricsHandler = mockMetricsManager.on.mock.calls.find(c => c[0] === 'metrics-update')?.[1];
      
      expect(stateHandler).toBeDefined();
      expect(metricsHandler).toBeDefined();
    });
    
    it('should setup auto cleanup when enabled', () => {
      engine = new MurmubaraEngine({ autoCleanup: true, cleanupDelay: 5000 });
      
      // Mock state as ready
      mockStateManager.isInState.mockReturnValue(true);
      
      // Emit processing-end event to trigger cleanup timer
      engine.emit('processing-end');
      
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
    
    it('should not setup auto cleanup when disabled', () => {
      engine = new MurmubaraEngine({ autoCleanup: false });
      
      // Mock state as ready
      mockStateManager.isInState.mockReturnValue(true);
      
      // Emit processing-end event - should NOT trigger timer
      engine.emit('processing-end');
      
      expect(setTimeout).not.toHaveBeenCalled();
    });
  });
  
  describe('Environment support', () => {
    it('should detect missing AudioContext', async () => {
      delete (global.window as any).AudioContext;
      delete (global.window as any).webkitAudioContext;
      
      engine = new MurmubaraEngine();
      
      await expect(engine.initialize()).rejects.toThrow('Environment not supported: Missing required APIs');
    });
    
    it('should detect missing WebAssembly', async () => {
      delete (global.window as any).WebAssembly;
      
      engine = new MurmubaraEngine();
      
      await expect(engine.initialize()).rejects.toThrow('Environment not supported: Missing required APIs');
    });
    
    it('should use webkitAudioContext fallback', async () => {
      delete (global.window as any).AudioContext;
      
      engine = new MurmubaraEngine();
      await engine.initialize();
      
      expect((global.window as any).webkitAudioContext).toHaveBeenCalled();
    });
  });
  
  describe('initialize()', () => {
    beforeEach(() => {
      engine = new MurmubaraEngine();
    });
    
    it('should initialize successfully', async () => {
      await engine.initialize();
      
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('initializing');
      expect(global.window.AudioContext).toHaveBeenCalled();
      expect((global.window as any).createRNNWasmModule).toHaveBeenCalled();
      expect(mockWasmModule._rnnoise_create).toHaveBeenCalled();
      expect(mockWasmModule._malloc).toHaveBeenCalledTimes(2); // input and output buffers
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('ready');
      expect(mockMetricsManager.startAutoUpdate).toHaveBeenCalled();
    });
    
    it('should handle concurrent initialization', async () => {
      const promise1 = engine.initialize();
      const promise2 = engine.initialize();
      
      await Promise.all([promise1, promise2]);
      
      // Should only initialize once
      expect((global.window as any).createRNNWasmModule).toHaveBeenCalledTimes(1);
    });
    
    it('should handle already initialized error', async () => {
      mockStateManager.canTransitionTo.mockReturnValue(false);
      mockStateManager.getState.mockReturnValue('ready');
      
      await expect(engine.initialize()).rejects.toThrow('Engine is already initialized or in an invalid state');
    });
    
    it('should handle WASM loading failure', async () => {
      (global.window as any).createRNNWasmModule = jest.fn().mockRejectedValue(new Error('WASM load failed'));
      
      await expect(engine.initialize()).rejects.toThrow('Failed to load RNNoise WASM module');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('error');
    });
    
    it('should handle AudioContext creation failure', async () => {
      (global.window as any).AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('AudioContext failed');
      });
      
      await expect(engine.initialize()).rejects.toThrow('Failed to create audio context');
    });
    
    it('should resume suspended audio context', async () => {
      mockAudioContext.state = 'suspended';
      await engine.initialize();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
    
    it('should handle degraded mode when allowed', async () => {
      engine = new MurmubaraEngine({ allowDegraded: true });
      
      // Make WASM fail
      (global.window as any).createRNNWasmModule = jest.fn().mockRejectedValue(new Error('WASM failed'));
      
      await engine.initialize();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Running in degraded mode without WASM');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('ready');
    });
    
    it('should warm up WASM module', async () => {
      await engine.initialize();
      
      // Should process frames during warmup
      expect(mockWasmModule._rnnoise_process_frame).toHaveBeenCalledTimes(10);
    });
    
    it('should handle rnnoise state creation failure', async () => {
      mockWasmModule._rnnoise_create.mockReturnValueOnce(0); // Return null/0
      
      await expect(engine.initialize()).rejects.toThrow('Failed to create RNNoise state');
    });
    
    it('should load script when createRNNWasmModule not available', async () => {
      delete (global.window as any).createRNNWasmModule;
      
      const mockScript = { onload: null as any, onerror: null as any, src: '' };
      (global.document.createElement as jest.Mock).mockReturnValue(mockScript);
      
      const initPromise = engine.initialize();
      
      // Simulate script load
      setTimeout(() => {
        (global.window as any).createRNNWasmModule = jest.fn().mockResolvedValue(mockWasmModule);
        mockScript.onload?.();
      }, 10);
      
      await initPromise;
      
      expect(global.document.createElement).toHaveBeenCalledWith('script');
      expect(mockScript.src).toBe('/rnnoise-fixed.js');
      expect(global.document.head.appendChild).toHaveBeenCalledWith(mockScript);
    });
    
    it('should handle script loading failure', async () => {
      delete (global.window as any).createRNNWasmModule;
      
      const mockScript = { onload: null as any, onerror: null as any, src: '' };
      (global.document.createElement as jest.Mock).mockReturnValue(mockScript);
      
      const initPromise = engine.initialize();
      
      // Simulate script error
      setTimeout(() => {
        mockScript.onerror?.(new Error('Script failed'));
      }, 10);
      
      await expect(initPromise).rejects.toThrow('Failed to load RNNoise script');
    });
  });
  
  describe('processStream()', () => {
    let mockStream: MediaStream;
    
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
      
      mockStream = {
        id: 'test-stream',
        getTracks: jest.fn().mockReturnValue([
          { stop: jest.fn(), addEventListener: jest.fn() }
        ]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any;
    });
    
    it('should process stream successfully', async () => {
      mockStateManager.getState.mockReturnValue('ready');
      
      const controller = await engine.processStream(mockStream);
      
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
      expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalled();
      expect(mockScriptProcessor.connect).toHaveBeenCalled();
      expect(controller).toHaveProperty('stop');
      expect(controller).toHaveProperty('pause');
      expect(controller).toHaveProperty('resume');
    });
    
    it('should handle invalid state', async () => {
      mockStateManager.getState.mockReturnValue('uninitialized');
      mockStateManager.canTransitionTo.mockReturnValue(false);
      
      await expect(engine.processStream(mockStream)).rejects.toThrow(
        'Cannot process stream in current state: uninitialized'
      );
    });
    
    it('should apply highpass filter', async () => {
      await engine.processStream(mockStream);
      
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      expect(mockBiquadFilter.type).toBe('highpass');
      expect(mockBiquadFilter.frequency.value).toBe(80);
      expect(mockBiquadFilter.Q.value).toBe(1);
    });
    
    it('should process audio frames', async () => {
      await engine.processStream(mockStream);
      
      // Create test audio data
      const inputBuffer = new Float32Array(4096);
      for (let i = 0; i < 4096; i++) {
        inputBuffer[i] = Math.sin(i * 0.01) * 0.5;
      }
      
      const outputBuffer = new Float32Array(4096);
      
      const mockEvent = {
        inputBuffer: { getChannelData: () => inputBuffer },
        outputBuffer: { getChannelData: () => outputBuffer }
      };
      
      // Process audio
      mockScriptProcessor.onaudioprocess?.(mockEvent as any);
      
      // Should have called WASM processing
      expect(mockWasmModule._rnnoise_process_frame).toHaveBeenCalled();
      expect(mockMetricsManager.recordFrame).toHaveBeenCalled();
    });
    
    it('should handle chunk processing', async () => {
      const onChunkProcessed = jest.fn();
      const controller = await engine.processStream(mockStream, {
        chunkDuration: 1000,
        onChunkProcessed
      });
      
      expect(controller).toBeDefined();
      
      // ChunkProcessor should be created
      expect(ChunkProcessor).toHaveBeenCalledWith(
        48000,
        expect.objectContaining({ chunkDuration: 1000 }),
        mockLogger,
        mockMetricsManager
      );
    });
    
    it('should track active streams', async () => {
      const controller1 = await engine.processStream(mockStream);
      
      const mockStream2 = { ...mockStream, id: 'stream-2' };
      const controller2 = await engine.processStream(mockStream2);
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.activeProcessors).toBe(2);
      
      await controller1.stop();
      
      const diagnostics2 = engine.getDiagnostics();
      expect(diagnostics2.activeProcessors).toBe(1);
    });
    
    it('should handle stream stop', async () => {
      const controller = await engine.processStream(mockStream);
      
      await controller.stop();
      
      expect(mockScriptProcessor.disconnect).toHaveBeenCalled();
      expect(mockMediaStreamSource.disconnect).toHaveBeenCalled();
      expect(mockBiquadFilter.disconnect).toHaveBeenCalled();
    });
    
    it('should handle pause/resume', async () => {
      const controller = await engine.processStream(mockStream);
      
      controller.pause();
      expect(controller.getState()).toBe('paused');
      
      controller.resume();
      expect(controller.getState()).toBe('processing');
    });
  });
  
  describe('destroy()', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });
    
    it('should destroy engine normally', async () => {
      mockStateManager.getState.mockReturnValue('ready');
      
      await engine.destroy();
      
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('destroying');
      expect(mockWasmModule._rnnoise_destroy).toHaveBeenCalled();
      expect(mockWasmModule._free).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockWorkerManager.terminateAll).toHaveBeenCalled();
      expect(mockMetricsManager.stopAutoUpdate).toHaveBeenCalled();
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('destroyed');
    });
    
    it('should force destroy with active streams', async () => {
      await engine.processStream({ id: 'test' } as any);
      mockStateManager.getState.mockReturnValue('processing');
      
      await engine.destroy(true);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Force destroying engine with 1 active streams');
    });
    
    it('should handle already destroyed state', async () => {
      mockStateManager.getState.mockReturnValue('destroyed');
      
      await engine.destroy();
      
      expect(mockStateManager.transitionTo).not.toHaveBeenCalledWith('destroying');
    });
    
    it('should handle errors during cleanup', async () => {
      mockAudioContext.close.mockRejectedValueOnce(new Error('Close failed'));
      
      await engine.destroy();
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error during engine cleanup:', expect.any(Error));
    });
    
    it('should clear cleanup timer', async () => {
      engine = new MurmubaraEngine({ autoCleanup: true });
      await engine.initialize();
      
      // Start cleanup timer
      mockStateManager.isInState.mockReturnValue(true);
      engine.emit('processing-end');
      
      const timerId = (setTimeout as unknown as jest.Mock).mock.results[0].value;
      
      await engine.destroy();
      
      expect(clearTimeout).toHaveBeenCalledWith(timerId);
    });
  });
  
  describe('Metrics and Diagnostics', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });
    
    it('should get metrics', () => {
      const metrics = engine.getMetrics();
      
      expect(mockMetricsManager.getMetrics).toHaveBeenCalled();
      expect(metrics).toHaveProperty('noiseReductionLevel');
      expect(metrics).toHaveProperty('processingLatency');
    });
    
    it('should register metrics callback', () => {
      const callback = jest.fn();
      engine.onMetricsUpdate(callback);
      
      expect(mockMetricsManager.on).toHaveBeenCalledWith('metrics-update', callback);
    });
    
    it('should get diagnostics', () => {
      mockStateManager.getState.mockReturnValue('ready');
      
      const diagnostics = engine.getDiagnostics();
      
      expect(diagnostics).toMatchObject({
        engineState: 'ready',
        wasmLoaded: true,
        processingTime: expect.any(Number),
        memoryUsage: expect.any(Number),
        activeProcessors: 0,
        version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
        browserInfo: expect.any(Object)
      });
    });
    
    it('should include browser info', () => {
      global.navigator = { userAgent: 'Mozilla/5.0 Chrome/120.0.0.0' } as any;
      
      engine = new MurmubaraEngine();
      const diagnostics = engine.getDiagnostics();
      
      expect(diagnostics.browserInfo.name).toBe('Chrome');
    });
    
    it('should handle performance.memory absence', () => {
      delete (global as any).performance;
      
      engine = new MurmubaraEngine();
      const diagnostics = engine.getDiagnostics();
      
      expect(diagnostics.memoryUsage).toBe(0);
    });
  });
  
  describe('Error handling', () => {
    beforeEach(() => {
      engine = new MurmubaraEngine();
    });
    
    it('should emit error events', async () => {
      const errorHandler = jest.fn();
      engine.on('error', errorHandler);
      
      // Trigger error
      (global.window as any).createRNNWasmModule = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await engine.initialize();
      } catch (e) {
        // Expected
      }
      
      expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INIT_FAILED',
        message: expect.stringContaining('Test error')
      }));
    });
    
    it('should record error history', async () => {
      (global.window as any).createRNNWasmModule = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await engine.initialize();
      } catch (e) {
        // Expected
      }
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.errors).toHaveLength(1);
      expect(diagnostics.errors[0].error).toContain('Test error');
    });
    
    it('should limit error history', async () => {
      // Trigger many errors by repeatedly trying to initialize with failing WASM
      for (let i = 0; i < 15; i++) {
        (global.window as any).createRNNWasmModule = jest.fn().mockRejectedValue(new Error(`Error ${i}`));
        try {
          await engine.initialize();
        } catch (e) {
          // Expected
        }
      }
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.errors).toHaveLength(10); // Max 10
    });
  });
  
  describe('Noise reduction levels', () => {
    it.each(['low', 'medium', 'high', 'auto'] as const)('should handle %s level', async (level) => {
      engine = new MurmubaraEngine({ noiseReductionLevel: level });
      await engine.initialize();
      
      // Noise reduction level is stored in config, not diagnostics
      expect(engine['config'].noiseReductionLevel).toBe(level);
    });
  });
  
  describe('Buffer sizes', () => {
    it.each([256, 512, 1024, 2048, 4096] as const)('should handle buffer size %d', async (bufferSize) => {
      engine = new MurmubaraEngine({ bufferSize });
      await engine.initialize();
      await engine.processStream({ id: 'test' } as any);
      
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(bufferSize, 1, 1);
    });
  });
});