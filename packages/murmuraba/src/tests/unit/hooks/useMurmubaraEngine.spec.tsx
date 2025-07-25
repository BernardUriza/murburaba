import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMurmubaraEngine } from '../../../hooks/murmuraba-engine/useMurmubaraEngine';
import * as api from '../../../api';
import * as audioConverter from '../../../utils/audioConverter';

// Mock the API module
vi.mock('../../../api', () => ({
  initializeAudioEngine: vi.fn().mockResolvedValue(undefined),
  destroyEngine: vi.fn().mockResolvedValue(undefined),
  processStream: vi.fn().mockResolvedValue(new MediaStream()),
  processStreamChunked: vi.fn().mockResolvedValue({}),
  getEngineStatus: vi.fn().mockReturnValue('ready'),
  getDiagnostics: vi.fn().mockReturnValue({
    engineState: 'ready',
    wasmLoaded: true,
    audioContextState: 'running',
    activeStreams: 0,
    errorCount: 0,
  }),
  onMetricsUpdate: vi.fn((callback) => {
    // Return unsubscribe function
    return () => {};
  }),
  processFile: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
}));

// Mock audio converter
vi.mock('../../../utils/audioConverter', () => ({
  getAudioConverter: vi.fn().mockReturnValue({
    float32ToInt16: vi.fn(),
    int16ToFloat32: vi.fn(),
  }),
  destroyAudioConverter: vi.fn(),
}));

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
};

global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
global.MediaRecorder.isTypeSupported = vi.fn(() => true);

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
  },
  configurable: true,
});

describe('useMurmubaraEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.engineState).toBe('uninitialized');
      expect(result.current.metrics).toBe(null);
      expect(result.current.diagnostics).toBe(null);
    });

    it('should initialize engine', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.engineState).toBe('ready');
      expect(api.initializeAudioEngine).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const mockError = new Error('Init failed');
      vi.mocked(api.initializeAudioEngine).mockRejectedValueOnce(mockError);

      const onInitError = vi.fn();
      const { result } = renderHook(() => 
        useMurmubaraEngine({ onInitError })
      );

      await act(async () => {
        await expect(result.current.initialize()).rejects.toThrow('Init failed');
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe('Init failed');
      expect(result.current.engineState).toBe('error');
      expect(onInitError).toHaveBeenCalledWith(mockError);
    });

    it('should auto-initialize when configured', async () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(api.initializeAudioEngine).toHaveBeenCalled();
    });

    it('should prevent multiple simultaneous initializations', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      // Start two initializations
      const promise1 = act(async () => {
        await result.current.initialize();
      });

      const promise2 = act(async () => {
        await result.current.initialize();
      });

      await Promise.all([promise1, promise2]);

      // Should only initialize once
      expect(api.initializeAudioEngine).toHaveBeenCalledTimes(1);
    });

    it('should skip initialization if already initialized', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      vi.clearAllMocks();

      await act(async () => {
        await result.current.initialize();
      });

      expect(api.initializeAudioEngine).not.toHaveBeenCalled();
    });
  });

  describe('Destruction', () => {
    it('should destroy engine', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.destroy();
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.engineState).toBe('destroyed');
      expect(api.destroyEngine).toHaveBeenCalled();
      expect(audioConverter.destroyAudioConverter).toHaveBeenCalled();
    });

    it('should handle force destroy', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.destroy(true);
      });

      expect(api.destroyEngine).toHaveBeenCalledWith({ force: true });
    });

    it('should skip destroy if not initialized', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.destroy();
      });

      expect(api.destroyEngine).not.toHaveBeenCalled();
    });

    it('should cleanup on unmount', async () => {
      const { unmount } = renderHook(() => useMurmubaraEngine());

      unmount();

      expect(audioConverter.destroyAudioConverter).toHaveBeenCalled();
    });
  });

  describe('Recording', () => {
    it('should start recording', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.recordingState.isRecording).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('should stop recording', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.recordingState.isRecording).toBe(false);
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should pause and resume recording', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Pause
      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.recordingState.isPaused).toBe(true);
      expect(mockMediaRecorder.pause).toHaveBeenCalled();

      // Resume
      act(() => {
        result.current.resumeRecording();
      });

      expect(result.current.recordingState.isPaused).toBe(false);
      expect(mockMediaRecorder.resume).toHaveBeenCalled();
    });

    it('should clear recordings', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Simulate adding a chunk
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' }),
          } as any);
        }
      });

      await waitFor(() => {
        expect(result.current.recordingState.chunks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.clearRecordings();
      });

      expect(result.current.recordingState.chunks).toHaveLength(0);
    });

    it('should auto-initialize when starting recording if not initialized', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(result.current.isInitialized).toBe(false);

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.recordingState.isRecording).toBe(true);
    });

    it('should update recording time', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Wait a bit for timer to update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(result.current.recordingState.recordingTime).toBeGreaterThan(0);
    });
  });

  describe('Chunk Management', () => {
    it('should toggle chunk expansion', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Simulate adding a chunk
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' }),
          } as any);
        }
      });

      await waitFor(() => {
        expect(result.current.recordingState.chunks.length).toBeGreaterThan(0);
      });

      const chunkId = result.current.recordingState.chunks[0].id;

      act(() => {
        result.current.toggleChunkExpansion(chunkId);
      });

      expect(result.current.recordingState.chunks[0].isExpanded).toBe(true);
    });

    it('should toggle chunk playback', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Simulate adding a chunk
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' }),
          } as any);
        }
      });

      await waitFor(() => {
        expect(result.current.recordingState.chunks.length).toBeGreaterThan(0);
      });

      const chunkId = result.current.recordingState.chunks[0].id;

      await act(async () => {
        await result.current.toggleChunkPlayback(chunkId, 'processed');
      });

      // Should update playback state
      expect(result.current.recordingState.chunks[0].currentlyPlayingType).toBeDefined();
    });
  });

  describe('Export Functions', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Add a test chunk
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({
            data: new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' }),
          } as any);
        }
      });

      await waitFor(() => {
        expect(result.current.recordingState.chunks.length).toBeGreaterThan(0);
      });
    });

    it('should export chunk as WAV', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      const chunkId = result.current.recordingState.chunks[0]?.id;

      if (chunkId) {
        await act(async () => {
          const blob = await result.current.exportChunkAsWav(chunkId, 'processed');
          expect(blob).toBeInstanceOf(Blob);
        });
      }
    });

    it('should export chunk as MP3', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      const chunkId = result.current.recordingState.chunks[0]?.id;

      if (chunkId) {
        await act(async () => {
          const blob = await result.current.exportChunkAsMp3(chunkId, 'original', 192);
          expect(blob).toBeInstanceOf(Blob);
        });
      }
    });

    it('should download chunk', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      const chunkId = result.current.recordingState.chunks[0]?.id;

      if (chunkId) {
        await act(async () => {
          await result.current.downloadChunk(chunkId, 'wav', 'processed');
        });
      }
    });

    it('should throw error for non-existent chunk', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await expect(
        result.current.exportChunkAsWav('non-existent', 'processed')
      ).rejects.toThrow('Chunk not found');
    });
  });

  describe('Metrics and Diagnostics', () => {
    it('should update diagnostics', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      const diagnostics = result.current.getDiagnostics();

      expect(diagnostics).toMatchObject({
        engineState: 'ready',
        wasmLoaded: true,
        audioContextState: 'running',
      });
    });

    it('should subscribe to metrics updates', async () => {
      const mockMetrics = {
        inputLevel: 0.5,
        outputLevel: 0.3,
        noiseReduction: 60,
      };

      let metricsCallback: any;
      vi.mocked(api.onMetricsUpdate).mockImplementation((callback) => {
        metricsCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      act(() => {
        metricsCallback?.(mockMetrics);
      });

      expect(result.current.metrics).toEqual(mockMetrics);
    });

    it('should calculate average noise reduction', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      const avgReduction = result.current.getAverageNoiseReduction();
      expect(typeof avgReduction).toBe('number');
    });
  });

  describe('Utility Functions', () => {
    it('should format time correctly', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(result.current.formatTime(0)).toBe('0:00');
      expect(result.current.formatTime(59)).toBe('0:59');
      expect(result.current.formatTime(60)).toBe('1:00');
      expect(result.current.formatTime(3661)).toBe('1:01:01');
    });

    it('should reset error', async () => {
      const mockError = new Error('Test error');
      vi.mocked(api.initializeAudioEngine).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        try {
          await result.current.initialize();
        } catch {}
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Stream Processing', () => {
    it('should process stream', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      const mockStream = new MediaStream();

      await act(async () => {
        const processedStream = await result.current.processStream(mockStream);
        expect(processedStream).toBeInstanceOf(MediaStream);
      });

      expect(api.processStream).toHaveBeenCalledWith(mockStream);
    });

    it('should process stream with chunks', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      const mockStream = new MediaStream();
      const config = {
        chunkDuration: 5000,
        onChunkProcessed: vi.fn(),
      };

      await act(async () => {
        await result.current.processStreamChunked(mockStream, config);
      });

      expect(api.processStreamChunked).toHaveBeenCalledWith(mockStream, config);
    });

    it('should process file', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      const mockBuffer = new ArrayBuffer(1024);

      await act(async () => {
        const processedBuffer = await result.current.processFile(mockBuffer);
        expect(processedBuffer).toBeInstanceOf(ArrayBuffer);
      });

      expect(api.processFile).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('Engine State Updates', () => {
    it('should update engine state periodically', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      // Change mock return value
      vi.mocked(api.getEngineStatus).mockReturnValue('processing');

      // Wait for periodic update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(result.current.engineState).toBe('processing');
    });
  });
});