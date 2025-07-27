/**
 * StreamProcessor Unit Tests
 * 
 * Tests the dedicated stream management and processing module
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StreamProcessor } from '../../../audio/StreamProcessor';
import { WasmManager } from '../../../audio/WasmManager';

// Mock AudioContext and related APIs
const mockAudioContext = {
  createMediaStreamSource: vi.fn(),
  createMediaStreamDestination: vi.fn(),
  audioWorklet: {
    addModule: vi.fn(),
  },
  sampleRate: 48000,
};

const mockMediaStreamSource = {
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockMediaStreamDestination = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  stream: {} as MediaStream,
};

const mockAudioWorkletNode = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  port: {
    postMessage: vi.fn(),
    onmessage: null,
  },
};

// Mock global AudioWorkletNode
const MockAudioWorkletNode = vi.fn(() => mockAudioWorkletNode);
global.AudioWorkletNode = MockAudioWorkletNode as any;

describe('StreamProcessor', () => {
  let streamProcessor: StreamProcessor;
  let mockWasmManager: WasmManager;
  let mockStream: MediaStream;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock WasmManager
    mockWasmManager = {
      isInitialized: vi.fn().mockReturnValue(true),
      getModule: vi.fn().mockReturnValue({
        _rnnoise_create: vi.fn().mockReturnValue(123),
        _rnnoise_destroy: vi.fn(),
        _rnnoise_process_frame: vi.fn().mockReturnValue(0.7),
        _malloc: vi.fn().mockReturnValue(456),
        _free: vi.fn(),
        HEAPF32: new Float32Array(1024),
      }),
      createState: vi.fn().mockReturnValue(123),
      destroyState: vi.fn(),
      allocateMemory: vi.fn().mockReturnValue(456),
      freeMemory: vi.fn(),
    } as any;

    // Mock MediaStream
    mockStream = {
      getTracks: vi.fn().mockReturnValue([]),
      getAudioTracks: vi.fn().mockReturnValue([]),
    } as any;

    // Setup AudioContext mocks
    mockAudioContext.createMediaStreamSource.mockReturnValue(mockMediaStreamSource);
    mockAudioContext.createMediaStreamDestination.mockReturnValue(mockMediaStreamDestination);
    mockAudioContext.audioWorklet.addModule.mockResolvedValue(undefined);
    (mockAudioContext as any).createScriptProcessor = vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null,
    });

    streamProcessor = new StreamProcessor(
      mockAudioContext as any,
      mockWasmManager,
      { bufferSize: 4096, enableAGC: true }
    );
  });

  afterEach(() => {
    streamProcessor.cleanup();
  });

  describe('initialization', () => {
    it('should create StreamProcessor with correct config', () => {
      expect(streamProcessor).toBeDefined();
      expect(streamProcessor.getActiveStreams()).toEqual([]);
    });

    it('should handle missing config gracefully', () => {
      const processor = new StreamProcessor(mockAudioContext as any, mockWasmManager);
      expect(processor).toBeDefined();
    });
  });

  describe('stream processing', () => {
    it('should process stream and return controller', async () => {
      const controller = await streamProcessor.processStream(mockStream);

      expect(controller).toBeDefined();
      expect(controller.stream).toBe(mockMediaStreamDestination.stream);
      expect(controller.processor.state).toBe('processing');
      expect(typeof controller.stop).toBe('function');
      expect(typeof controller.pause).toBe('function');
      expect(typeof controller.resume).toBe('function');
    });

    it('should track active streams', async () => {
      const controller = await streamProcessor.processStream(mockStream);
      const activeStreams = streamProcessor.getActiveStreams();

      expect(activeStreams).toHaveLength(1);
      expect(activeStreams[0]).toBe(controller.processor.id);
    });

    it('should create unique stream IDs', async () => {
      const controller1 = await streamProcessor.processStream(mockStream);
      const controller2 = await streamProcessor.processStream(mockStream);

      expect(controller1.processor.id).not.toBe(controller2.processor.id);
      expect(streamProcessor.getActiveStreams()).toHaveLength(2);
    });
  });

  describe('stream control', () => {
    it('should pause and resume stream', async () => {
      const controller = await streamProcessor.processStream(mockStream);

      controller.pause();
      expect(controller.getState()).toBe('paused');

      controller.resume();
      expect(controller.getState()).toBe('processing');
    });

    it('should stop stream and remove from active list', async () => {
      const controller = await streamProcessor.processStream(mockStream);
      expect(streamProcessor.getActiveStreams()).toHaveLength(1);

      controller.stop();
      expect(streamProcessor.getActiveStreams()).toHaveLength(0);
    });
  });

  describe('audio worklet creation', () => {
    it('should create AudioWorklet when supported', async () => {
      // Mock AudioWorklet support
      const processor = streamProcessor as any;
      
      const workletNode = await processor.createWorkletProcessor();
      
      expect(MockAudioWorkletNode).toHaveBeenCalledWith(
        mockAudioContext,
        'rnnoise-processor',
        expect.objectContaining({
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        })
      );
      expect(workletNode).toBe(mockAudioWorkletNode);
    });

    it('should configure worklet with correct options', async () => {
      const processor = streamProcessor as any;
      await processor.createWorkletProcessor();

      expect(mockAudioWorkletNode.port.postMessage).toHaveBeenCalledWith({
        type: 'initialize',
        data: {
          enableRNNoise: true,
          enableAGC: true,
          targetLevel: 0.3,
        },
      });
    });

    it('should handle worklet creation failure', async () => {
      // Mock AudioWorkletNode constructor to throw
      const FailingMockAudioWorkletNode = vi.fn(() => {
        throw new Error('AudioWorklet not supported');
      });
      global.AudioWorkletNode = FailingMockAudioWorkletNode as any;

      const processor = streamProcessor as any;
      const fallbackNode = await processor.createWorkletProcessor();
      
      // Should fallback to ScriptProcessor
      expect(fallbackNode).toBeDefined();
      
      // Restore original mock
      global.AudioWorkletNode = MockAudioWorkletNode as any;
    });
  });

  describe('script processor fallback', () => {
    it('should create ScriptProcessor when AudioWorklet unavailable', () => {
      const processor = streamProcessor as any;
      
      // Mock createScriptProcessor
      const mockScriptProcessor = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null,
      };
      
      const mockContext = {
        ...mockAudioContext,
        createScriptProcessor: vi.fn().mockReturnValue(mockScriptProcessor),
      };
      
      const processorWithFallback = new StreamProcessor(
        mockContext as any,
        mockWasmManager,
        { bufferSize: 4096 }
      );
      
      const scriptProcessor = (processorWithFallback as any).createScriptProcessor();
      expect(scriptProcessor).toBe(mockScriptProcessor);
      expect(mockContext.createScriptProcessor).toHaveBeenCalledWith(4096, 1, 1);
    });
  });

  describe('metrics and events', () => {
    it('should emit stream-started event', async () => {
      const eventSpy = vi.fn();
      streamProcessor.on('stream-started', eventSpy);

      await streamProcessor.processStream(mockStream);

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit stream-stopped event', async () => {
      const eventSpy = vi.fn();
      streamProcessor.on('stream-stopped', eventSpy);

      const controller = await streamProcessor.processStream(mockStream);
      controller.stop();

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle worklet metrics messages', async () => {
      const metricsSpy = vi.fn();
      streamProcessor.on('metrics', metricsSpy);

      await streamProcessor.processStream(mockStream);

      // Simulate worklet sending metrics
      const messageHandler = mockAudioWorkletNode.port.onmessage;
      if (messageHandler) {
        (messageHandler as any)({
          data: {
            type: 'metrics',
            inputLevel: 0.5,
            outputLevel: 0.3,
            vad: 0.8,
          }
        } as any);
      }

      expect(metricsSpy).toHaveBeenCalledWith({
        type: 'metrics',
        inputLevel: 0.5,
        outputLevel: 0.3,
        vad: 0.8,
      });
    });
  });

  describe('cleanup', () => {
    it('should stop all streams on cleanup', async () => {
      const controller1 = await streamProcessor.processStream(mockStream);
      const controller2 = await streamProcessor.processStream(mockStream);

      expect(streamProcessor.getActiveStreams()).toHaveLength(2);

      streamProcessor.cleanup();

      expect(streamProcessor.getActiveStreams()).toHaveLength(0);
    });

    it('should remove all event listeners on cleanup', () => {
      const eventSpy = vi.fn();
      streamProcessor.on('stream-started', eventSpy);

      streamProcessor.cleanup();

      // Verify removeAllListeners was called (EventEmitter method)
      expect(streamProcessor.listenerCount('stream-started')).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle stream processing errors', async () => {
      // Mock audio context to throw error
      mockAudioContext.createMediaStreamSource.mockImplementation(() => {
        throw new Error('Failed to create media stream source');
      });

      await expect(streamProcessor.processStream(mockStream)).rejects.toThrow(
        'Failed to create media stream source'
      );
    });

    it('should handle WASM initialization errors gracefully', async () => {
      // Mock WASM manager as not initialized
      vi.mocked(mockWasmManager.isInitialized).mockReturnValue(false);

      const controller = await streamProcessor.processStream(mockStream);
      expect(controller).toBeDefined();
      expect(controller.processor.state).toBe('processing');
    });
  });
});