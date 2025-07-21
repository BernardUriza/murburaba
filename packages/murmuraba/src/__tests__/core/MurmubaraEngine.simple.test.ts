/**
 * Simplified tests for MurmubaraEngine
 * Let's get some fucking coverage!
 */

import { MurmubaraEngine } from '../../core/MurmubaraEngine';

// Mock all dependencies with simple objects
jest.mock('../../core/EventEmitter', () => ({
  EventEmitter: class {
    on = jest.fn();
    emit = jest.fn();
    off = jest.fn();
  }
}));

jest.mock('../../core/StateManager', () => ({
  StateManager: jest.fn().mockImplementation(() => ({
    isInState: jest.fn().mockReturnValue(false),
    canTransitionTo: jest.fn().mockReturnValue(true),
    getState: jest.fn().mockReturnValue('uninitialized'),
    transitionTo: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    emit: jest.fn()
  }))
}));

jest.mock('../../core/Logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    setLevel: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.mock('../../managers/WorkerManager', () => ({
  WorkerManager: jest.fn().mockImplementation(() => ({
    isReady: jest.fn().mockReturnValue(false),
    initialize: jest.fn().mockResolvedValue(undefined),
    terminate: jest.fn().mockResolvedValue(undefined),
    process: jest.fn()
  }))
}));

jest.mock('../../managers/MetricsManager', () => ({
  MetricsManager: jest.fn().mockImplementation(() => ({
    trackOperation: jest.fn().mockReturnValue('op-1'),
    recordFrame: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      inputSamples: 0,
      outputSamples: 0,
      processingLatency: 0,
      frameCount: 0,
      inputLevel: 0,
      outputLevel: 0,
      noiseReductionLevel: 0,
      timestamp: Date.now(),
      droppedFrames: 0
    }),
    on: jest.fn(),
    emit: jest.fn()
  }))
}));

jest.mock('../../managers/ChunkProcessor', () => ({
  ChunkProcessor: jest.fn().mockImplementation(() => ({
    processStream: jest.fn().mockResolvedValue({
      streamId: 'stream-1',
      chunks: [],
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      getState: jest.fn().mockReturnValue('processing')
    }),
    stopStream: jest.fn()
  }))
}));

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

// Mock nodes
const mockScriptProcessor = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  onaudioprocess: null
};

const mockMediaStreamSource = {
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockMediaStreamDestination = {
  stream: { id: 'mock-output-stream' }
};

const mockBiquadFilter = {
  type: 'highpass',
  frequency: { value: 80 },
  Q: { value: 1 },
  connect: jest.fn(),
  disconnect: jest.fn()
};

// Setup global mocks
(global as any).window = {
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
};

(global as any).document = {
  createElement: jest.fn().mockReturnValue({
    onload: null,
    onerror: null,
    src: ''
  }),
  head: {
    appendChild: jest.fn()
  }
};

// Mock console
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
  jest.spyOn(console, 'info').mockImplementation();
  
  // Setup audio mocks
  mockAudioContext.createScriptProcessor.mockReturnValue(mockScriptProcessor);
  mockAudioContext.createMediaStreamSource.mockReturnValue(mockMediaStreamSource);
  mockAudioContext.createMediaStreamDestination.mockReturnValue(mockMediaStreamDestination);
  mockAudioContext.createBiquadFilter.mockReturnValue(mockBiquadFilter);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('MurmubaraEngine', () => {
  let engine: MurmubaraEngine;
  
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  describe('Constructor', () => {
    it('should create engine with default config', () => {
      engine = new MurmubaraEngine();
      expect(engine).toBeDefined();
    });
    
    it('should create engine with custom config', () => {
      engine = new MurmubaraEngine({
        logLevel: 'debug',
        noiseReductionLevel: 'high',
        bufferSize: 2048,
        autoCleanup: false
      });
      expect(engine).toBeDefined();
    });
  });
  
  describe('initialize()', () => {
    beforeEach(() => {
      engine = new MurmubaraEngine();
    });
    
    it('should initialize successfully', async () => {
      await engine.initialize();
      
      expect((global as any).window.AudioContext).toHaveBeenCalled();
      expect((global as any).window.createRNNWasmModule).toHaveBeenCalled();
      expect(mockWasmModule._rnnoise_create).toHaveBeenCalled();
    });
    
    it('should handle already initialized error', async () => {
      // Get the state manager mock
      const StateManager = require('../../core/StateManager').StateManager;
      const stateManagerInstance = StateManager.mock.results[0].value;
      
      // First initialization
      await engine.initialize();
      
      // Make it return true for isInState
      stateManagerInstance.isInState.mockReturnValue(true);
      
      // Second initialization should fail
      await expect(engine.initialize()).rejects.toThrow('Engine already initialized');
    });
    
    it('should handle browser not supported', async () => {
      delete (global as any).window.WebAssembly;
      
      await expect(engine.initialize()).rejects.toThrow('Browser environment not supported');
      
      // Restore WebAssembly
      (global as any).window.WebAssembly = {};
    });
    
    it('should handle audio context failure', async () => {
      (global as any).window.AudioContext = jest.fn(() => {
        throw new Error('Audio failed');
      });
      
      await expect(engine.initialize()).rejects.toThrow('Failed to initialize audio context');
    });
    
    it('should handle WASM loading failure', async () => {
      (global as any).window.createRNNWasmModule = jest.fn().mockRejectedValue(new Error('WASM failed'));
      
      await expect(engine.initialize()).rejects.toThrow('Failed to load WASM module');
    });
    
    it('should support degraded mode', async () => {
      engine = new MurmubaraEngine({ allowDegraded: true });
      
      (global as any).window.createRNNWasmModule = jest.fn().mockRejectedValue(new Error('WASM failed'));
      
      await engine.initialize(); // Should not throw
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('running in degraded mode')
      );
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
    });
    
    it('should process stream successfully', async () => {
      const controller = await engine.processStream(mockStream);
      
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
      expect(controller).toHaveProperty('stop');
      expect(controller).toHaveProperty('pause');
      expect(controller).toHaveProperty('resume');
    });
    
    it('should handle invalid state', async () => {
      const StateManager = require('../../core/StateManager').StateManager;
      const stateManagerInstance = StateManager.mock.results[0].value;
      
      stateManagerInstance.getState.mockReturnValue('uninitialized');
      stateManagerInstance.canTransitionTo.mockReturnValue(false);
      
      await expect(engine.processStream(mockStream)).rejects.toThrow(
        'Cannot process stream in current state'
      );
    });
    
    it('should process audio frames', async () => {
      await engine.processStream(mockStream);
      
      // Simulate audio processing
      const inputBuffer = new Float32Array(4096);
      const outputBuffer = new Float32Array(4096);
      
      const mockEvent = {
        inputBuffer: { getChannelData: () => inputBuffer },
        outputBuffer: { getChannelData: () => outputBuffer }
      };
      
      // Trigger processing
      if (mockScriptProcessor.onaudioprocess) {
        (mockScriptProcessor.onaudioprocess as any)(mockEvent);
      }
      
      expect(mockWasmModule._rnnoise_process_frame).toHaveBeenCalled();
    });
    
    it('should support chunk processing', async () => {
      const chunkConfig = {
        chunkDuration: 5,
        onChunkProcessed: jest.fn()
      };
      
      const controller = await engine.processStream(mockStream, chunkConfig);
      
      const ChunkProcessor = require('../../managers/ChunkProcessor').ChunkProcessor;
      const chunkProcessorInstance = ChunkProcessor.mock.results[0].value;
      
      expect(chunkProcessorInstance.processStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        chunkConfig
      );
    });
  });
  
  describe('destroy()', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });
    
    it('should destroy engine', async () => {
      await engine.destroy();
      
      expect(mockWasmModule._rnnoise_destroy).toHaveBeenCalled();
      expect(mockWasmModule._free).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
    
    it('should force destroy', async () => {
      await engine.destroy(true);
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Force destroying')
      );
    });
  });
  
  describe('getMetrics()', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });
    
    it('should return metrics', () => {
      const metrics = engine.getMetrics();
      
      expect(metrics).toHaveProperty('inputSamples');
      expect(metrics).toHaveProperty('processingLatency');
    });
  });
  
  describe('getDiagnostics()', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });
    
    it('should return diagnostics', () => {
      const diagnostics = engine.getDiagnostics();
      
      expect(diagnostics).toHaveProperty('engineState');
      expect(diagnostics).toHaveProperty('wasmLoaded');
      expect(diagnostics).toHaveProperty('version');
      expect(diagnostics.browserInfo).toContain('Chrome');
    });
  });
  
  describe('runDiagnosticTests()', () => {
    beforeEach(async () => {
      engine = new MurmubaraEngine();
      await engine.initialize();
    });
    
    it('should run diagnostic tests', async () => {
      const report = await engine.runDiagnosticTests();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('environment');
      expect(report).toHaveProperty('engineTests');
      expect(report).toHaveProperty('environment');
      expect(report).toHaveProperty('engineTests');
    });
  });
  
  describe('Edge Cases', () => {
    it('should use webkitAudioContext fallback', async () => {
      delete (global as any).window.AudioContext;
      (global as any).window.webkitAudioContext = jest.fn(() => mockAudioContext);
      
      engine = new MurmubaraEngine();
      await engine.initialize();
      
      expect((global as any).window.webkitAudioContext).toHaveBeenCalled();
    });
    
    it('should handle missing performance.memory', async () => {
      delete (global as any).window.performance.memory;
      
      engine = new MurmubaraEngine();
      const report = await engine.runDiagnosticTests();
      
      expect(report).toBeDefined();
    });
    
    it('should handle concurrent initialization', async () => {
      engine = new MurmubaraEngine();
      
      const promise1 = engine.initialize();
      const promise2 = engine.initialize();
      
      await Promise.all([promise1, promise2]);
      
      // Should only initialize once
      expect((global as any).window.createRNNWasmModule).toHaveBeenCalledTimes(1);
    });
  });
});