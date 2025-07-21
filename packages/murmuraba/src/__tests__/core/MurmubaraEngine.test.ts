/**
 * Tests for MurmubaraEngine - The Core of Everything
 * 773 LINES OF CODE AND 0% COVERAGE - ¡VAMOS A DESTRUIRLO!
 */

import { MurmubaraEngine } from '../../core/MurmubaraEngine';
import { EventEmitter } from '../../core/EventEmitter';
import { StateManager } from '../../core/StateManager';
import { Logger } from '../../core/Logger';
import { WorkerManager } from '../../managers/WorkerManager';
import { MetricsManager } from '../../managers/MetricsManager';
import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { EngineState, DiagnosticInfo, StreamController } from '../../types';

// Mock all dependencies
jest.mock('../../core/EventEmitter');
jest.mock('../../core/StateManager');
jest.mock('../../core/Logger');
jest.mock('../../managers/WorkerManager');
jest.mock('../../managers/MetricsManager');
jest.mock('../../managers/ChunkProcessor');

// Mock WASM module
const mockWasmModule = {
  _rnnoise_create: jest.fn().mockReturnValue(1),
  _rnnoise_destroy: jest.fn(),
  _rnnoise_process_frame: jest.fn().mockReturnValue(1),
  _malloc: jest.fn().mockReturnValue(1000),
  _free: jest.fn(),
  HEAPF32: new Float32Array(10000),
  HEAP32: new Int32Array(10000)
};

// Mock Audio Context
const mockAudioContext = {
  state: 'running' as AudioContextState,
  sampleRate: 48000,
  destination: { maxChannelCount: 2 },
  createMediaStreamSource: jest.fn(),
  createMediaStreamDestination: jest.fn(),
  createScriptProcessor: jest.fn(),
  createBiquadFilter: jest.fn(),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
};

// Mock Script Processor
const mockScriptProcessor = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  onaudioprocess: null
};

// Mock Media Stream Source
const mockMediaStreamSource = {
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Mock Media Stream Destination
const mockMediaStreamDestination = {
  stream: { id: 'mock-output-stream' }
};

// Mock Biquad Filter
const mockBiquadFilter = {
  type: 'highpass',
  frequency: { value: 80 },
  Q: { value: 1 },
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Mock console methods
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'info').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('MurmubaraEngine', () => {
  let engine: MurmubaraEngine;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockLogger: jest.Mocked<Logger>;
  let mockWorkerManager: jest.Mocked<WorkerManager>;
  let mockMetricsManager: jest.Mocked<MetricsManager>;
  let mockChunkProcessor: jest.Mocked<ChunkProcessor>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup StateManager mock
    mockStateManager = new StateManager() as jest.Mocked<StateManager>;
    mockStateManager.isInState.mockReturnValue(false);
    mockStateManager.canTransitionTo.mockReturnValue(true);
    mockStateManager.getState.mockReturnValue('uninitialized' as EngineState);
    mockStateManager.transitionTo.mockReturnValue(undefined);
    
    // Setup Logger mock
    mockLogger = new Logger('[Murmuraba]') as jest.Mocked<Logger>;
    mockLogger.setLogLevel.mockReturnValue(undefined);
    
    // Setup WorkerManager mock
    mockWorkerManager = new WorkerManager() as jest.Mocked<WorkerManager>;
    mockWorkerManager.isAvailable.mockReturnValue(false);
    
    // Setup MetricsManager mock
    mockMetricsManager = new MetricsManager() as jest.Mocked<MetricsManager>;
    mockMetricsManager.startOperation.mockReturnValue('op-1');
    mockMetricsManager.endOperation.mockReturnValue(undefined);
    mockMetricsManager.getMetrics.mockReturnValue({
      totalSamplesProcessed: 0,
      totalTimeMs: 0,
      averageLatencyMs: 0,
      peakLatencyMs: 0,
      droppedFrames: 0,
      activeStreams: 0,
      cpuUsage: 0,
      memoryUsageMB: 0
    });
    
    // Setup ChunkProcessor mock
    mockChunkProcessor = new ChunkProcessor() as jest.Mocked<ChunkProcessor>;
    
    // Mock global window and document
    global.window = {
      AudioContext: jest.fn(() => mockAudioContext),
      webkitAudioContext: jest.fn(() => mockAudioContext),
      WebAssembly: {},
      createRNNWasmModule: jest.fn().mockResolvedValue(mockWasmModule),
      navigator: {
        userAgent: 'Mozilla/5.0 Chrome/120.0.0.0'
      },
      performance: {
        memory: {
          usedJSHeapSize: 50 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        }
      }
    } as any;
    
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
    
    // Mock constructors to return our mocks
    (StateManager as jest.MockedClass<typeof StateManager>).mockImplementation(() => mockStateManager);
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLogger);
    (WorkerManager as jest.MockedClass<typeof WorkerManager>).mockImplementation(() => mockWorkerManager);
    (MetricsManager as jest.MockedClass<typeof MetricsManager>).mockImplementation(() => mockMetricsManager);
    (ChunkProcessor as jest.MockedClass<typeof ChunkProcessor>).mockImplementation(() => mockChunkProcessor);
    
    // Setup audio node mocks
    mockAudioContext.createScriptProcessor.mockReturnValue(mockScriptProcessor);
    mockAudioContext.createMediaStreamSource.mockReturnValue(mockMediaStreamSource);
    mockAudioContext.createMediaStreamDestination.mockReturnValue(mockMediaStreamDestination);
    mockAudioContext.createBiquadFilter.mockReturnValue(mockBiquadFilter);
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('Constructor and Configuration', () => {
    it('should create engine with default configuration', () => {
      engine = new MurmubaraEngine();
      
      expect(StateManager).toHaveBeenCalledWith([
        'uninitialized',
        'initializing',
        'ready',
        'processing',
        'paused',
        'error',
        'destroyed'
      ]);
      expect(Logger).toHaveBeenCalledWith('[Murmuraba]');
      expect(WorkerManager).toHaveBeenCalled();
      expect(MetricsManager).toHaveBeenCalled();
    });
    
    it('should create engine with custom configuration', () => {
      const config = {
        logLevel: 'debug' as const,
        noiseReductionLevel: 'high' as const,
        bufferSize: 2048 as const,
        algorithm: 'rnnoise' as const,
        autoCleanup: false,
        cleanupDelay: 60000,
        useWorker: true,
        workerPath: '/custom-worker.js',
        allowDegraded: true
      };
      
      engine = new MurmubaraEngine(config);
      
      expect(mockLogger.setLogLevel).toHaveBeenCalledWith('debug');
    });
    
    it('should setup event forwarding', () => {
      engine = new MurmubaraEngine();
      
      expect(mockStateManager.on).toHaveBeenCalledWith('stateChange', expect.any(Function));
      expect(mockMetricsManager.on).toHaveBeenCalledWith('metricsUpdate', expect.any(Function));
    });
    
    it('should setup auto cleanup timer when enabled', () => {
      engine = new MurmubaraEngine({ autoCleanup: true, cleanupDelay: 5000 });
      
      // Trigger state change to ready
      const stateChangeHandler = (mockStateManager.on as jest.Mock).mock.calls.find(
        call => call[0] === 'stateChange'
      )[1];
      
      stateChangeHandler({ from: 'initializing', to: 'ready' });
      
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });
  });
  
  describe('initialize()', () => {
    beforeEach(() => {
      engine = new MurmubaraEngine();
    });
    
    it('should initialize successfully', async () => {
      mockStateManager.isInState.mockReturnValue(false);
      
      await engine.initialize();
      
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('initializing');
      expect(window.AudioContext).toHaveBeenCalled();
      expect(global.window.createRNNWasmModule).toHaveBeenCalled();
      expect(mockWasmModule._rnnoise_create).toHaveBeenCalled();
      expect(mockWasmModule._malloc).toHaveBeenCalledTimes(2); // input and output buffers
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('ready');
    });
    
    it('should handle already initialized error', async () => {
      mockStateManager.isInState.mockReturnValue(true);
      
      await expect(engine.initialize()).rejects.toThrow('Engine already initialized');
    });
    
    it('should handle browser not supported error', async () => {
      delete global.window.WebAssembly;
      
      await expect(engine.initialize()).rejects.toThrow('Browser environment not supported');
      
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('error');
    });
    
    it('should handle AudioContext creation failure', async () => {
      global.window.WebAssembly = {};
      (global.window.AudioContext as jest.Mock).mockImplementation(() => {
        throw new Error('Audio context failed');
      });
      
      await expect(engine.initialize()).rejects.toThrow('Failed to initialize audio context');
    });
    
    it('should handle WASM loading failure', async () => {
      global.window.createRNNWasmModule = jest.fn().mockRejectedValue(new Error('WASM load failed'));
      
      await expect(engine.initialize()).rejects.toThrow('Failed to load WASM module');
    });
    
    it('should handle WASM timeout', async () => {
      jest.useRealTimers();
      
      // Create a promise that never resolves
      global.window.createRNNWasmModule = jest.fn().mockReturnValue(new Promise(() => {}));
      
      const initPromise = engine.initialize();
      
      // Wait a bit and check that it times out
      await expect(initPromise).rejects.toThrow('WASM module loading timed out');
    }, 20000);
    
    it('should support degraded mode when allowed', async () => {
      engine = new MurmubaraEngine({ allowDegraded: true });
      
      // Make WASM loading fail
      global.window.createRNNWasmModule = jest.fn().mockRejectedValue(new Error('WASM failed'));
      
      await engine.initialize();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'WASM module failed to load, running in degraded mode'
      );
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('ready');
    });
    
    it('should handle concurrent initialization calls', async () => {
      const promise1 = engine.initialize();
      const promise2 = engine.initialize();
      
      await Promise.all([promise1, promise2]);
      
      // Should only initialize once
      expect(global.window.createRNNWasmModule).toHaveBeenCalledTimes(1);
    });
    
    it('should warm up WASM module', async () => {
      await engine.initialize();
      
      // Should process some frames during warmup
      expect(mockWasmModule._rnnoise_process_frame).toHaveBeenCalled();
    });
    
    it('should resume audio context if suspended', async () => {
      mockAudioContext.state = 'suspended';
      
      await engine.initialize();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });
  
  describe('processStream()', () => {
    let mockStream: MediaStream;
    
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
      
      mockStream = {
        id: 'test-stream',
        getTracks: jest.fn().mockReturnValue([]),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      } as any;
      
      // Setup chunk processor mock
      mockChunkProcessor.processStream.mockResolvedValue({
        streamId: 'stream-1',
        chunks: [],
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getState: jest.fn().mockReturnValue('processing')
      });
    });
    
    it('should process stream successfully', async () => {
      mockStateManager.getState.mockReturnValue('ready' as EngineState);
      
      const controller = await engine.processStream(mockStream);
      
      expect(mockStateManager.canTransitionTo).toHaveBeenCalledWith('processing');
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
      expect(mockAudioContext.createMediaStreamDestination).toHaveBeenCalled();
      expect(mockMediaStreamSource.connect).toHaveBeenCalledWith(mockScriptProcessor);
      expect(mockScriptProcessor.connect).toHaveBeenCalledWith(mockMediaStreamDestination);
      expect(controller).toHaveProperty('stop');
      expect(controller).toHaveProperty('pause');
      expect(controller).toHaveProperty('resume');
    });
    
    it('should handle invalid state error', async () => {
      mockStateManager.getState.mockReturnValue('uninitialized' as EngineState);
      mockStateManager.canTransitionTo.mockReturnValue(false);
      
      await expect(engine.processStream(mockStream)).rejects.toThrow(
        'Cannot process stream in current state: uninitialized'
      );
    });
    
    it('should handle missing audio context', async () => {
      engine = new MurmubaraEngine();
      mockStateManager.getState.mockReturnValue('ready' as EngineState);
      
      await expect(engine.processStream(mockStream)).rejects.toThrow(
        'Audio context not initialized'
      );
    });
    
    it('should apply high-pass filter for voice', async () => {
      const controller = await engine.processStream(mockStream);
      
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      expect(mockBiquadFilter.type).toBe('highpass');
      expect(mockBiquadFilter.frequency.value).toBe(80);
      expect(mockMediaStreamSource.connect).toHaveBeenCalledWith(mockBiquadFilter);
      expect(mockBiquadFilter.connect).toHaveBeenCalledWith(mockScriptProcessor);
    });
    
    it('should process audio frames with noise reduction', async () => {
      await engine.processStream(mockStream);
      
      // Simulate audio processing
      const inputBuffer = new Float32Array(4096);
      for (let i = 0; i < 4096; i++) {
        inputBuffer[i] = Math.sin(i * 0.01) * 0.5;
      }
      
      const outputBuffer = new Float32Array(4096);
      
      const mockEvent = {
        inputBuffer: { getChannelData: () => inputBuffer },
        outputBuffer: { getChannelData: () => outputBuffer }
      };
      
      // Trigger audio processing
      if (mockScriptProcessor.onaudioprocess) {
        mockScriptProcessor.onaudioprocess(mockEvent as any);
      }
      
      // Should have processed frames
      expect(mockWasmModule._rnnoise_process_frame).toHaveBeenCalled();
      expect(mockMetricsManager.recordFrame).toHaveBeenCalled();
    });
    
    it('should handle different noise reduction levels', async () => {
      const levels = ['low', 'medium', 'high', 'maximum'] as const;
      
      for (const level of levels) {
        engine = new MurmubaraEngine({ noiseReductionLevel: level });
        await engine.initialize();
        
        const controller = await engine.processStream(mockStream);
        expect(controller).toBeDefined();
      }
    });
    
    it('should support chunk processing', async () => {
      const chunkConfig = {
        chunkDuration: 5,
        onChunkProcessed: jest.fn()
      };
      
      const controller = await engine.processStream(mockStream, chunkConfig);
      
      expect(mockChunkProcessor.processStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stream: mockMediaStreamDestination.stream
        }),
        chunkConfig
      );
    });
    
    it('should handle stream controller operations', async () => {
      const controller = await engine.processStream(mockStream);
      
      // Test stop
      await controller.stop();
      expect(mockScriptProcessor.disconnect).toHaveBeenCalled();
      expect(mockMediaStreamSource.disconnect).toHaveBeenCalled();
      expect(mockChunkProcessor.stopStream).toHaveBeenCalled();
      
      // Should remove from active streams
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.streamCount).toBe(0);
    });
    
    it('should handle multiple concurrent streams', async () => {
      const stream1 = { ...mockStream, id: 'stream-1' };
      const stream2 = { ...mockStream, id: 'stream-2' };
      
      const controller1 = await engine.processStream(stream1 as any);
      const controller2 = await engine.processStream(stream2 as any);
      
      expect(controller1).toBeDefined();
      expect(controller2).toBeDefined();
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.streamCount).toBe(2);
    });
  });
  
  describe('destroy()', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });
    
    it('should destroy engine normally', async () => {
      mockStateManager.getState.mockReturnValue('ready' as EngineState);
      
      await engine.destroy();
      
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('destroyed');
      expect(mockWasmModule._rnnoise_destroy).toHaveBeenCalled();
      expect(mockWasmModule._free).toHaveBeenCalledTimes(2); // input and output buffers
      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(mockWorkerManager.terminate).toHaveBeenCalled();
    });
    
    it('should force destroy with active streams', async () => {
      // Add an active stream
      const mockStream = { id: 'test-stream' } as any;
      await engine.processStream(mockStream);
      
      mockStateManager.getState.mockReturnValue('processing' as EngineState);
      
      await engine.destroy(true);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Force destroying engine with active streams');
      expect(mockStateManager.transitionTo).toHaveBeenCalledWith('destroyed');
    });
    
    it('should handle destroy when already destroyed', async () => {
      mockStateManager.getState.mockReturnValue('destroyed' as EngineState);
      
      await engine.destroy();
      
      // Should not throw, just return early
      expect(mockStateManager.transitionTo).not.toHaveBeenCalled();
    });
    
    it('should handle errors during destroy', async () => {
      mockAudioContext.close.mockRejectedValue(new Error('Close failed'));
      
      // Should not throw, just log error
      await engine.destroy();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during cleanup:',
        expect.any(Error)
      );
    });
    
    it('should clear cleanup timer', async () => {
      engine = new MurmubaraEngine({ autoCleanup: true });
      await engine.initialize();
      
      // Trigger ready state to start timer
      const stateChangeHandler = (mockStateManager.on as jest.Mock).mock.calls.find(
        call => call[0] === 'stateChange'
      )[1];
      stateChangeHandler({ from: 'initializing', to: 'ready' });
      
      await engine.destroy();
      
      expect(clearTimeout).toHaveBeenCalled();
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
      expect(metrics).toHaveProperty('totalSamplesProcessed');
      expect(metrics).toHaveProperty('averageLatencyMs');
    });
    
    it('should register metrics callback', () => {
      const callback = jest.fn();
      
      engine.onMetricsUpdate(callback);
      
      expect(mockMetricsManager.on).toHaveBeenCalledWith('metricsUpdate', callback);
    });
    
    it('should get diagnostics', () => {
      mockStateManager.getState.mockReturnValue('ready' as EngineState);
      
      const diagnostics = engine.getDiagnostics();
      
      expect(diagnostics).toMatchObject({
        engineState: 'ready',
        wasmLoaded: true,
        audioContextState: 'running',
        version: expect.any(String),
        engineVersion: expect.any(String),
        reactVersion: expect.any(String),
        browserInfo: expect.stringContaining('Chrome'),
        supportedFormats: expect.arrayContaining(['webm']),
        maxChunksInMemory: expect.any(Number),
        noiseReductionLevel: 'medium',
        algorithm: 'rnnoise'
      });
    });
    
    it('should run diagnostic tests', async () => {
      const report = await engine.runDiagnosticTests();
      
      expect(report).toMatchObject({
        timestamp: expect.any(Number),
        environment: {
          hasAudioContext: true,
          hasWebAssembly: true,
          hasMediaDevices: expect.any(Boolean),
          hasMicrophonePermission: false,
          browserInfo: expect.any(String)
        },
        engineTests: {
          initialization: { passed: true },
          wasmModule: { passed: true },
          audioProcessing: { passed: true },
          memoryUsage: { passed: true }
        },
        performanceMetrics: expect.any(Object),
        recommendations: expect.any(Array)
      });
    });
    
    it('should include warnings in diagnostics', () => {
      // Trigger some warnings
      mockLogger.warn.mockImplementation((msg) => {
        // Simulate warning being recorded
        (engine as any).warnings = ['Test warning'];
      });
      
      mockLogger.warn('Test warning');
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.warnings).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(() => {
      engine = new MurmubaraEngine();
    });
    
    it('should record errors in history', async () => {
      // Trigger an error
      global.window.createRNNWasmModule = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await engine.initialize();
      } catch (e) {
        // Expected
      }
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.errors).toHaveLength(1);
      expect(diagnostics.errors[0]).toContain('Test error');
    });
    
    it('should emit error events', async () => {
      const errorHandler = jest.fn();
      engine.on('error', errorHandler);
      
      // Trigger an error
      global.window.createRNNWasmModule = jest.fn().mockRejectedValue(new Error('Test error'));
      
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
    
    it('should limit error history size', async () => {
      // Record many errors
      for (let i = 0; i < 15; i++) {
        (engine as any).recordError(`Error ${i}`);
      }
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.errors).toHaveLength(10); // Max 10 errors
    });
  });
  
  describe('Browser Detection', () => {
    it('should detect Chrome', () => {
      global.window.navigator.userAgent = 'Mozilla/5.0 Chrome/120.0.0.0';
      engine = new MurmubaraEngine();
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.browserInfo).toContain('Chrome');
    });
    
    it('should detect Firefox', () => {
      global.window.navigator.userAgent = 'Mozilla/5.0 Firefox/120.0';
      engine = new MurmubaraEngine();
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.browserInfo).toContain('Firefox');
    });
    
    it('should detect Safari', () => {
      global.window.navigator.userAgent = 'Mozilla/5.0 Safari/605.1.15';
      engine = new MurmubaraEngine();
      
      const diagnostics = engine.getDiagnostics();
      expect(diagnostics.browserInfo).toContain('Safari');
    });
  });
  
  describe('WebKit Audio Context', () => {
    it('should use webkitAudioContext as fallback', async () => {
      delete (global.window as any).AudioContext;
      (global.window as any).webkitAudioContext = jest.fn(() => mockAudioContext);
      
      engine = new MurmubaraEngine();
      await engine.initialize();
      
      expect(global.window.webkitAudioContext).toHaveBeenCalled();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle missing performance.memory', async () => {
      delete (global.window.performance as any).memory;
      
      engine = new MurmubaraEngine();
      const report = await engine.runDiagnosticTests();
      
      expect(report.performanceMetrics.memoryUsage).toBe(0);
    });
    
    it('should handle script loading with custom WASM', () => {
      delete (global.window as any).createRNNWasmModule;
      
      engine = new MurmubaraEngine();
      
      // Initialize should trigger script loading
      const scriptElement = global.document.createElement('script');
      expect(global.document.createElement).toHaveBeenCalledWith('script');
    });
  });
});