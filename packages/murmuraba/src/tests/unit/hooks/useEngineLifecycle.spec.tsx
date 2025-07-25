import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEngineLifecycle } from '../../../hooks/murmuraba-engine/useEngineLifecycle';
import * as api from '../../../api';

// Mock the API module
vi.mock('../../../api', () => ({
  initializeAudioEngine: vi.fn().mockResolvedValue(undefined),
  destroyEngine: vi.fn().mockResolvedValue(undefined),
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
}));

describe('useEngineLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useEngineLifecycle());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.engineState).toBe('uninitialized');
      expect(result.current.metrics).toBe(null);
      expect(result.current.diagnostics).toBe(null);
    });

    it('should initialize engine', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.engineState).toBe('ready');
      expect(api.initializeAudioEngine).toHaveBeenCalled();
    });

    it('should handle initialization with config', async () => {
      const config = { enableAGC: true };
      const { result } = renderHook(() => useEngineLifecycle({ config }));

      await act(async () => {
        await result.current.initialize();
      });

      expect(api.initializeAudioEngine).toHaveBeenCalledWith(config);
    });

    it('should handle initialization errors', async () => {
      const mockError = new Error('Init failed');
      vi.mocked(api.initializeAudioEngine).mockRejectedValueOnce(mockError);

      const onInitError = vi.fn();
      const { result } = renderHook(() => 
        useEngineLifecycle({ onInitError })
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
        useEngineLifecycle({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(api.initializeAudioEngine).toHaveBeenCalled();
    });

    it('should prevent concurrent initializations', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      // Start multiple initializations
      const promises = [
        result.current.initialize(),
        result.current.initialize(),
        result.current.initialize(),
      ];

      await Promise.all(promises);

      // Should only initialize once
      expect(api.initializeAudioEngine).toHaveBeenCalledTimes(1);
    });
  });

  describe('Destruction', () => {
    it('should destroy engine', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.destroy();
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.engineState).toBe('destroyed');
      expect(api.destroyEngine).toHaveBeenCalled();
    });

    it('should handle force destroy', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.destroy(true);
      });

      expect(api.destroyEngine).toHaveBeenCalledWith({ force: true });
    });

    it('should handle destroy errors', async () => {
      const mockError = new Error('Destroy failed');
      vi.mocked(api.destroyEngine).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      await expect(
        act(async () => {
          await result.current.destroy();
        })
      ).rejects.toThrow('Destroy failed');

      expect(result.current.error).toBe('Destroy failed');
    });

    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      unmount();

      // Should cleanup resources but not call destroyEngine
      // (that's up to the parent component)
      expect(api.destroyEngine).not.toHaveBeenCalled();
    });
  });

  describe('Metrics and Diagnostics', () => {
    it('should update diagnostics after initialization', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.diagnostics).toMatchObject({
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

      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      act(() => {
        metricsCallback?.(mockMetrics);
      });

      expect(result.current.metrics).toEqual(mockMetrics);
    });

    it('should update diagnostics manually', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      // Change mock return value
      vi.mocked(api.getDiagnostics).mockReturnValue({
        version: '1.0.0',
        engineVersion: '1.0.0',
        reactVersion: '18.0.0',
        engineState: 'processing',
        wasmLoaded: true,
        audioContextState: 'running',
        activeProcessors: 1,
        memoryUsage: 1000000,
        processingTime: 10,
        activeStreams: 2,
        errorCount: 0,
      });

      const diagnostics = result.current.updateDiagnostics();

      expect(diagnostics?.activeStreams).toBe(2);
      expect(result.current.diagnostics?.activeStreams).toBe(2);
    });

    it('should return null diagnostics when not initialized', () => {
      const { result } = renderHook(() => useEngineLifecycle());

      const diagnostics = result.current.updateDiagnostics();

      expect(diagnostics).toBe(null);
      expect(result.current.diagnostics).toBe(null);
    });
  });

  describe('Engine State Updates', () => {
    it('should update engine state periodically', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

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

    it('should handle engine state update errors', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      // Make getEngineStatus throw
      vi.mocked(api.getEngineStatus).mockImplementation(() => {
        throw new Error('Engine destroyed');
      });

      // Wait for periodic update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      // Should not crash and state should remain
      expect(result.current.engineState).toBe('ready');
    });
  });

  describe('Error Handling', () => {
    it('should reset error', async () => {
      const mockError = new Error('Test error');
      vi.mocked(api.initializeAudioEngine).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useEngineLifecycle());

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

  describe('Lifecycle Management', () => {
    it('should handle lifecycle transitions correctly', async () => {
      const { result } = renderHook(() => useEngineLifecycle());

      expect(result.current.engineState).toBe('uninitialized');

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.engineState).toBe('ready');

      await act(async () => {
        await result.current.destroy();
      });

      expect(result.current.engineState).toBe('destroyed');
    });
  });

  describe('Memory Management', () => {
    it('should unsubscribe from metrics on destroy', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(api.onMetricsUpdate).mockReturnValue(unsubscribe as any);

      const { result } = renderHook(() => useEngineLifecycle());

      await act(async () => {
        await result.current.initialize();
      });

      expect(unsubscribe).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.destroy();
      });

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});