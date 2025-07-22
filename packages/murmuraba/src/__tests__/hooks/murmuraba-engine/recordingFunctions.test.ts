import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRecordingFunctions } from '../../../hooks/murmuraba-engine/recordingFunctions';
import { ProcessedChunk, RecordingState } from '../../../hooks/murmuraba-engine/types';
import { DEFAULT_CHUNK_DURATION } from '../../../hooks/murmuraba-engine/constants';

// Mock the dependencies
vi.mock('../../../api', () => ({
  processStream: vi.fn()
}));

vi.mock('../../../hooks/murmuraba-engine/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('recordingFunctions', () => {
  let mockProps: any;
  let mockChunkManager: any;
  let mockRecordingManager: any;
  let mockRecordingStateHook: any;
  let mockMediaStream: any;
  let mockStreamController: any;

  beforeEach(() => {
    // Mock MediaStream
    mockMediaStream = {
      getTracks: vi.fn(() => [{
        stop: vi.fn(),
        kind: 'audio'
      }])
    };

    // Mock StreamController
    mockStreamController = {
      stream: mockMediaStream,
      cleanup: vi.fn()
    };

    // Mock ChunkManager
    mockChunkManager = {
      clearChunks: vi.fn()
    };

    // Mock RecordingManager
    mockRecordingManager = {
      startCycle: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn()
    };

    // Mock recording state hook
    mockRecordingStateHook = {
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      addChunk: vi.fn(),
      clearRecordings: vi.fn(),
      updateRecordingTime: vi.fn()
    };

    // Mock navigator.mediaDevices
    global.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream))
      }
    } as any;

    // Setup default props
    mockProps = {
      isInitialized: true,
      recordingState: {
        isRecording: false,
        isPaused: false,
        chunks: [],
        totalDuration: 0,
        currentDuration: 0
      } as RecordingState,
      recordingStateHook: mockRecordingStateHook,
      currentStream: null,
      originalStream: null,
      setCurrentStream: vi.fn(),
      setOriginalStream: vi.fn(),
      setStreamController: vi.fn(),
      setError: vi.fn(),
      chunkManager: mockChunkManager,
      recordingManager: mockRecordingManager,
      initialize: vi.fn()
    };

    // Mock processStream
    const { processStream } = require('../../../api');
    processStream.mockResolvedValue(mockStreamController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startRecording', () => {
    it('should initialize if not already initialized', async () => {
      mockProps.isInitialized = false;
      const { startRecording } = createRecordingFunctions(mockProps);

      await startRecording();

      expect(mockProps.initialize).toHaveBeenCalled();
    });

    it('should request user media with correct constraints', async () => {
      const { startRecording } = createRecordingFunctions(mockProps);

      await startRecording();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    });

    it('should set up streams correctly', async () => {
      const { startRecording } = createRecordingFunctions(mockProps);

      await startRecording();

      expect(mockProps.setOriginalStream).toHaveBeenCalledWith(mockMediaStream);
      expect(mockProps.setStreamController).toHaveBeenCalledWith(mockStreamController);
      expect(mockProps.setCurrentStream).toHaveBeenCalledWith(mockStreamController.stream);
    });

    it('should start recording with default chunk duration', async () => {
      const { startRecording } = createRecordingFunctions(mockProps);

      await startRecording();

      expect(mockRecordingManager.startCycle).toHaveBeenCalledWith(
        mockStreamController.stream,
        mockMediaStream,
        DEFAULT_CHUNK_DURATION,
        expect.any(Function)
      );
    });

    it('should start recording with custom chunk duration', async () => {
      const { startRecording } = createRecordingFunctions(mockProps);
      const customDuration = 10;

      await startRecording(customDuration);

      expect(mockRecordingManager.startCycle).toHaveBeenCalledWith(
        mockStreamController.stream,
        mockMediaStream,
        customDuration,
        expect.any(Function)
      );
    });

    it('should handle chunks when processed', async () => {
      const { startRecording } = createRecordingFunctions(mockProps);
      
      await startRecording();

      // Get the onChunkProcessed callback
      const onChunkProcessed = mockRecordingManager.startCycle.mock.calls[0][3];
      
      const testChunk: ProcessedChunk = {
        id: 'test-chunk',
        blob: new Blob(['test']),
        url: 'blob:test',
        timestamp: Date.now(),
        duration: 5,
        number: 1,
        size: 100,
        metrics: {
          cpuUsage: 10,
          memoryUsage: 1000,
          latency: 5,
          noiseReduction: 'medium'
        },
        noiseRemoved: 30,
        metadata: {
          originalDuration: 5,
          processedDuration: 5,
          framesCaptured: 100,
          framesProcessed: 100
        }
      };

      onChunkProcessed(testChunk);

      expect(mockRecordingStateHook.addChunk).toHaveBeenCalledWith(testChunk);
    });

    it('should handle errors', async () => {
      const error = new Error('getUserMedia failed');
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(error);
      
      const { startRecording } = createRecordingFunctions(mockProps);

      await expect(startRecording()).rejects.toThrow('getUserMedia failed');
      expect(mockProps.setError).toHaveBeenCalledWith('getUserMedia failed');
    });

    it('should handle non-Error objects in catch', async () => {
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue('String error');
      
      const { startRecording } = createRecordingFunctions(mockProps);

      await expect(startRecording()).rejects.toBe('String error');
      expect(mockProps.setError).toHaveBeenCalledWith('Failed to start recording');
    });
  });

  describe('stopRecording', () => {
    it('should stop recording manager', () => {
      const { stopRecording } = createRecordingFunctions(mockProps);

      stopRecording();

      expect(mockRecordingManager.stopRecording).toHaveBeenCalled();
    });

    it('should stop all tracks in current stream', () => {
      mockProps.currentStream = mockMediaStream;
      const { stopRecording } = createRecordingFunctions(mockProps);

      stopRecording();

      expect(mockMediaStream.getTracks).toHaveBeenCalled();
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(mockProps.setCurrentStream).toHaveBeenCalledWith(null);
    });

    it('should stop all tracks in original stream', () => {
      mockProps.originalStream = mockMediaStream;
      const { stopRecording } = createRecordingFunctions(mockProps);

      stopRecording();

      expect(mockMediaStream.getTracks).toHaveBeenCalled();
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(mockProps.setOriginalStream).toHaveBeenCalledWith(null);
    });

    it('should clear stream controller', () => {
      const { stopRecording } = createRecordingFunctions(mockProps);

      stopRecording();

      expect(mockProps.setStreamController).toHaveBeenCalledWith(null);
    });

    it('should update recording state', () => {
      const { stopRecording } = createRecordingFunctions(mockProps);

      stopRecording();

      expect(mockRecordingStateHook.stopRecording).toHaveBeenCalled();
    });

    it('should handle when no streams exist', () => {
      const { stopRecording } = createRecordingFunctions(mockProps);

      // Should not throw
      expect(() => stopRecording()).not.toThrow();
    });
  });

  describe('pauseRecording', () => {
    it('should pause recording manager', () => {
      const { pauseRecording } = createRecordingFunctions(mockProps);

      pauseRecording();

      expect(mockRecordingManager.pauseRecording).toHaveBeenCalled();
      expect(mockRecordingStateHook.pauseRecording).toHaveBeenCalled();
    });
  });

  describe('resumeRecording', () => {
    it('should resume recording manager', () => {
      const { resumeRecording } = createRecordingFunctions(mockProps);

      resumeRecording();

      expect(mockRecordingManager.resumeRecording).toHaveBeenCalled();
      expect(mockRecordingStateHook.resumeRecording).toHaveBeenCalled();
    });
  });

  describe('clearRecordings', () => {
    it('should stop recording if currently recording', () => {
      mockProps.recordingState.isRecording = true;
      const { clearRecordings, stopRecording } = createRecordingFunctions(mockProps);
      
      clearRecordings();

      expect(mockRecordingManager.stopRecording).toHaveBeenCalled();
    });

    it('should clear chunks', () => {
      const testChunks = [
        { id: '1', url: 'blob:1' },
        { id: '2', url: 'blob:2' }
      ];
      mockProps.recordingState.chunks = testChunks;
      
      const { clearRecordings } = createRecordingFunctions(mockProps);

      clearRecordings();

      expect(mockChunkManager.clearChunks).toHaveBeenCalledWith(testChunks);
    });

    it('should clear recording state', () => {
      const { clearRecordings } = createRecordingFunctions(mockProps);

      clearRecordings();

      expect(mockRecordingStateHook.clearRecordings).toHaveBeenCalled();
    });

    it('should handle when not recording', () => {
      mockProps.recordingState.isRecording = false;
      const { clearRecordings } = createRecordingFunctions(mockProps);

      clearRecordings();

      expect(mockRecordingManager.stopRecording).not.toHaveBeenCalled();
      expect(mockChunkManager.clearChunks).toHaveBeenCalled();
      expect(mockRecordingStateHook.clearRecordings).toHaveBeenCalled();
    });
  });

  describe('function factory', () => {
    it('should return all recording functions', () => {
      const functions = createRecordingFunctions(mockProps);

      expect(functions).toHaveProperty('startRecording');
      expect(functions).toHaveProperty('stopRecording');
      expect(functions).toHaveProperty('pauseRecording');
      expect(functions).toHaveProperty('resumeRecording');
      expect(functions).toHaveProperty('clearRecordings');
      
      expect(typeof functions.startRecording).toBe('function');
      expect(typeof functions.stopRecording).toBe('function');
      expect(typeof functions.pauseRecording).toBe('function');
      expect(typeof functions.resumeRecording).toBe('function');
      expect(typeof functions.clearRecordings).toBe('function');
    });
  });
});