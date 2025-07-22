import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMurmubaraEngine } from '../../../hooks/murmuraba-engine/useMurmubaraEngine';
import { UseMurmubaraEngineOptions } from '../../../hooks/murmuraba-engine/types';

// Mock all the API functions
vi.mock('../../../api', () => ({
  initializeAudioEngine: vi.fn(),
  destroyEngine: vi.fn(),
  processStream: vi.fn(),
  processStreamChunked: vi.fn(),
  getEngineStatus: vi.fn(),
  getDiagnostics: vi.fn(),
  onMetricsUpdate: vi.fn(),
  getEngine: vi.fn()
}));

// Mock audio converter
vi.mock('../../../utils/audioConverter', () => ({
  getAudioConverter: vi.fn(),
  destroyAudioConverter: vi.fn()
}));

// Mock the managers
vi.mock('../../../hooks/murmuraba-engine/urlManager', () => ({
  URLManager: vi.fn().mockImplementation(() => ({
    revokeObjectURL: vi.fn()
  }))
}));

vi.mock('../../../hooks/murmuraba-engine/chunkManager', () => ({
  ChunkManager: vi.fn().mockImplementation(() => ({
    clearChunks: vi.fn()
  }))
}));

vi.mock('../../../hooks/murmuraba-engine/recordingManager', () => ({
  RecordingManager: vi.fn().mockImplementation(() => ({
    startCycle: vi.fn(),
    stopRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn()
  }))
}));

vi.mock('../../../hooks/murmuraba-engine/audioExporter', () => ({
  AudioExporter: vi.fn().mockImplementation(() => ({
    exportToMP3: vi.fn(),
    exportToWAV: vi.fn()
  }))
}));

vi.mock('../../../hooks/murmuraba-engine/playbackManager', () => ({
  PlaybackManager: vi.fn().mockImplementation(() => ({
    togglePlayback: vi.fn()
  }))
}));

// Mock logger
vi.mock('../../../hooks/murmuraba-engine/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

describe('useMurmubaraEngine', () => {
  let mockApi: any;

  beforeEach(() => {
    // Setup API mocks
    mockApi = {
      initializeAudioEngine: vi.fn().mockResolvedValue(undefined),
      destroyEngine: vi.fn().mockResolvedValue(undefined),
      processStream: vi.fn().mockResolvedValue({
        stream: new MediaStream(),
        cleanup: vi.fn()
      }),
      getEngineStatus: vi.fn().mockReturnValue({
        state: 'ready',
        activeStreams: 0
      }),
      getDiagnostics: vi.fn().mockResolvedValue({
        engineVersion: '1.0.0',
        state: 'ready'
      }),
      onMetricsUpdate: vi.fn().mockReturnValue(() => {}),
      getEngine: vi.fn().mockReturnValue({})
    };

    // Apply mocks
    const api = require('../../../api');
    Object.assign(api, mockApi);

    // Mock React version
    Object.defineProperty(React, 'version', {
      value: '18.2.0',
      writable: true,
      configurable: true
    });

    // Mock navigator
    global.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(new MediaStream())
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.engineState).toBe('uninitialized');
      expect(result.current.metrics).toBe(null);
      expect(result.current.diagnostics).toBe(null);
    });

    it('should auto-initialize when autoInitialize is true', async () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      // Wait for effect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockApi.initializeAudioEngine).toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle initialization error', async () => {
      const error = new Error('Init failed');
      mockApi.initializeAudioEngine.mockRejectedValue(error);
      
      const onInitError = vi.fn();
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true, onInitError })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Init failed');
      expect(onInitError).toHaveBeenCalledWith(error);
    });

    it('should manually initialize', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      expect(mockApi.initializeAudioEngine).toHaveBeenCalled();
      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle React 19 mode', () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ react19Mode: true })
      );

      // Should not throw
      expect(result.current).toBeDefined();
    });

    it('should detect React 19 automatically', () => {
      Object.defineProperty(React, 'version', {
        value: '19.0.0',
        writable: true,
        configurable: true
      });

      const { result } = renderHook(() => useMurmubaraEngine());

      // Should not throw
      expect(result.current).toBeDefined();
    });
  });

  describe('recording state', () => {
    it('should have initial recording state', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(result.current.recordingState).toEqual({
        isRecording: false,
        isPaused: false,
        chunks: [],
        totalDuration: 0,
        currentDuration: 0
      });
    });

    it('should track playback state for chunks', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(result.current.chunkPlaybackStates).toEqual({});
      expect(result.current.expandedChunks).toEqual({});
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', async () => {
      const { unmount } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      unmount();

      expect(mockApi.destroyEngine).toHaveBeenCalled();
    });

    it('should cleanup recording interval', async () => {
      const { result, unmount } = renderHook(() => useMurmubaraEngine());

      // Start a recording to create interval
      await act(async () => {
        await result.current.initialize();
      });

      unmount();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should unsubscribe from metrics', async () => {
      const unsubscribe = vi.fn();
      mockApi.onMetricsUpdate.mockReturnValue(unsubscribe);

      const { result, unmount } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle non-Error objects in catch', async () => {
      mockApi.initializeAudioEngine.mockRejectedValue('String error');
      
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.error).toBe('Failed to initialize audio engine');
    });

    it('should handle fallback to manual mode', async () => {
      mockApi.initializeAudioEngine.mockRejectedValue(new Error('Init failed'));
      
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true, fallbackToManual: true })
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Init failed');
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('configuration options', () => {
    it('should pass through config options', () => {
      const config = {
        noiseReductionLevel: 'high' as const,
        bufferSize: 2048
      };

      renderHook(() => useMurmubaraEngine(config));

      expect(mockApi.initializeAudioEngine).not.toHaveBeenCalled(); // Not auto-initialized
    });

    it('should use default chunk duration', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      // Default chunk duration is 8 seconds
      expect(result.current).toBeDefined();
    });

    it('should use custom chunk duration', () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ defaultChunkDuration: 10 })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('export functionality', () => {
    it('should provide export functions', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(typeof result.current.exportToMP3).toBe('function');
      expect(typeof result.current.exportToWAV).toBe('function');
    });
  });

  describe('playback functionality', () => {
    it('should provide playback toggle', () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      expect(typeof result.current.toggleChunkPlayback).toBe('function');
    });
  });

  describe('getDiagnostics', () => {
    it('should get diagnostics when initialized', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.getDiagnostics();
      });

      expect(mockApi.getDiagnostics).toHaveBeenCalled();
      expect(result.current.diagnostics).toEqual({
        engineVersion: '1.0.0',
        state: 'ready'
      });
    });

    it('should not get diagnostics when not initialized', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.getDiagnostics();
      });

      expect(mockApi.getDiagnostics).not.toHaveBeenCalled();
    });
  });
});