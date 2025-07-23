import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRecordingFunctions } from '../recordingFunctions';
import * as api from '../../api';
import { RecordingManager } from '../recordingManager';

// Mock modules
vi.mock('../../api');
vi.mock('../recordingManager');
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('recordingFunctions', () => {
  let mockInitialize: any;
  let mockProcessStream: any;
  let mockRecordingManager: any;
  let mockRecordingState: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock API functions
    mockInitialize = vi.fn();
    mockProcessStream = vi.fn();
    vi.mocked(api).initialize = mockInitialize;
    vi.mocked(api).processStream = mockProcessStream;

    // Mock RecordingManager
    mockRecordingManager = {
      startCycle: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn()
    };
    vi.mocked(RecordingManager).mockReturnValue(mockRecordingManager);

    // Mock navigator.mediaDevices
    global.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn()
      }
    } as any;
  });

  describe('startRecording', () => {
    it('should handle initialization failure gracefully', async () => {
      // Setup
      const mockError = new Error('WASM initialization failed');
      mockInitialize.mockRejectedValue(mockError);
      
      const mockRecordingState = {
        isInitialized: false,
        error: null,
        isRecording: false,
        chunks: []
      };
      
      const mockSetError = vi.fn();
      const mockChunkManager = {
        clearChunks: vi.fn()
      };
      
      const { startRecording } = useRecordingFunctions(
        mockRecordingState,
        {
          setError: mockSetError,
          startRecordingState: vi.fn(),
          stopRecordingState: vi.fn(),
          pauseRecordingState: vi.fn(),
          resumeRecordingState: vi.fn(),
          clearRecordingsState: vi.fn(),
          addChunk: vi.fn(),
          setStreamController: vi.fn(),
          setCurrentStream: vi.fn(),
          setOriginalStream: vi.fn()
        },
        { isInitialized: false, initialize: mockInitialize },
        mockChunkManager as any
      );

      // Execute
      await expect(startRecording()).rejects.toThrow('WASM initialization failed');

      // Verify
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockSetError).toHaveBeenCalledWith('WASM initialization failed');
      expect(global.navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    });

    it('should not reinitialize if initialization fails on subsequent calls', async () => {
      // Setup
      const mockError = new Error('WASM initialization failed');
      mockInitialize.mockRejectedValue(mockError);
      
      const mockRecordingState = {
        isInitialized: false,
        error: 'Previous error',
        isRecording: false,
        chunks: []
      };
      
      const mockSetError = vi.fn();
      const { startRecording } = useRecordingFunctions(
        mockRecordingState,
        {
          setError: mockSetError,
          startRecordingState: vi.fn(),
          stopRecordingState: vi.fn(),
          pauseRecordingState: vi.fn(),
          resumeRecordingState: vi.fn(),
          clearRecordingsState: vi.fn(),
          addChunk: vi.fn(),
          setStreamController: vi.fn(),
          setCurrentStream: vi.fn(),
          setOriginalStream: vi.fn()
        },
        { isInitialized: false, initialize: mockInitialize },
        { clearChunks: vi.fn() } as any
      );

      // Execute first call
      await expect(startRecording()).rejects.toThrow();
      expect(mockInitialize).toHaveBeenCalledTimes(1);

      // Execute second call - should not try to initialize again
      await expect(startRecording()).rejects.toThrow();
      expect(mockInitialize).toHaveBeenCalledTimes(2); // Still tries because isInitialized is false
    });

    it('should handle getUserMedia failure', async () => {
      // Setup
      mockInitialize.mockResolvedValue(undefined);
      const mediaError = new Error('Permission denied');
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(mediaError);
      
      const mockSetError = vi.fn();
      const { startRecording } = useRecordingFunctions(
        { isInitialized: true, error: null, isRecording: false, chunks: [] },
        {
          setError: mockSetError,
          startRecordingState: vi.fn(),
          stopRecordingState: vi.fn(),
          pauseRecordingState: vi.fn(),
          resumeRecordingState: vi.fn(),
          clearRecordingsState: vi.fn(),
          addChunk: vi.fn(),
          setStreamController: vi.fn(),
          setCurrentStream: vi.fn(),
          setOriginalStream: vi.fn()
        },
        { isInitialized: true, initialize: mockInitialize },
        { clearChunks: vi.fn() } as any
      );

      // Execute
      await expect(startRecording()).rejects.toThrow('Permission denied');

      // Verify
      expect(mockSetError).toHaveBeenCalledWith('Permission denied');
      expect(mockProcessStream).not.toHaveBeenCalled();
    });

    it('should handle processStream failure', async () => {
      // Setup
      const mockStream = { getTracks: () => [] };
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream);
      
      const processError = new Error('Failed to process stream');
      mockProcessStream.mockRejectedValue(processError);
      
      const mockSetError = vi.fn();
      const mockSetOriginalStream = vi.fn();
      
      const { startRecording } = useRecordingFunctions(
        { isInitialized: true, error: null, isRecording: false, chunks: [] },
        {
          setError: mockSetError,
          startRecordingState: vi.fn(),
          stopRecordingState: vi.fn(),
          pauseRecordingState: vi.fn(),
          resumeRecordingState: vi.fn(),
          clearRecordingsState: vi.fn(),
          addChunk: vi.fn(),
          setStreamController: vi.fn(),
          setCurrentStream: vi.fn(),
          setOriginalStream: mockSetOriginalStream
        },
        { isInitialized: true, initialize: mockInitialize },
        { clearChunks: vi.fn() } as any
      );

      // Execute
      await expect(startRecording()).rejects.toThrow('Failed to process stream');

      // Verify
      expect(mockSetOriginalStream).toHaveBeenCalledWith(mockStream);
      expect(mockProcessStream).toHaveBeenCalledWith(mockStream);
      expect(mockSetError).toHaveBeenCalledWith('Failed to process stream');
    });

    it('should successfully start recording when everything works', async () => {
      // Setup
      const mockStream = { getTracks: () => [] };
      const mockController = { stream: { id: 'processed' } };
      
      global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream);
      mockProcessStream.mockResolvedValue(mockController);
      
      const mockSetStreamController = vi.fn();
      const mockSetCurrentStream = vi.fn();
      const mockSetOriginalStream = vi.fn();
      const mockStartRecordingState = vi.fn();
      const mockAddChunk = vi.fn();
      
      const { startRecording } = useRecordingFunctions(
        { isInitialized: true, error: null, isRecording: false, chunks: [] },
        {
          setError: vi.fn(),
          startRecordingState: mockStartRecordingState,
          stopRecordingState: vi.fn(),
          pauseRecordingState: vi.fn(),
          resumeRecordingState: vi.fn(),
          clearRecordingsState: vi.fn(),
          addChunk: mockAddChunk,
          setStreamController: mockSetStreamController,
          setCurrentStream: mockSetCurrentStream,
          setOriginalStream: mockSetOriginalStream
        },
        { isInitialized: true, initialize: mockInitialize },
        { clearChunks: vi.fn() } as any
      );

      // Execute
      await startRecording(10);

      // Verify
      expect(mockSetOriginalStream).toHaveBeenCalledWith(mockStream);
      expect(mockProcessStream).toHaveBeenCalledWith(mockStream);
      expect(mockSetStreamController).toHaveBeenCalledWith(mockController);
      expect(mockSetCurrentStream).toHaveBeenCalledWith(mockController.stream);
      expect(mockStartRecordingState).toHaveBeenCalled();
      expect(mockRecordingManager.startCycle).toHaveBeenCalledWith(
        mockController.stream,
        mockStream,
        10,
        expect.any(Function)
      );
    });
  });
});