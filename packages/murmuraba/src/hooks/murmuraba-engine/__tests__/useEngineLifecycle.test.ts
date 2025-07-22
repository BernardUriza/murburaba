import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEngineLifecycle } from '../useEngineLifecycle';

// Mock the API module
vi.mock('../../../api', () => ({
  initializeAudioEngine: vi.fn(),
  destroyEngine: vi.fn(),
  getEngineStatus: vi.fn(),
  getDiagnostics: vi.fn(),
  onMetricsUpdate: vi.fn(),
}));

// Mock audio converter
vi.mock('../../../utils/audioConverter', () => ({
  getAudioConverter: vi.fn(() => ({})),
  destroyAudioConverter: vi.fn(),
}));

import { initializeAudioEngine, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate } from '../../../api';
import { getAudioConverter, destroyAudioConverter } from '../../../utils/audioConverter';

describe('useEngineLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useEngineLifecycle());
    
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.engineState).toBe('uninitialized');
    expect(result.current.metrics).toBe(null);
    expect(result.current.diagnostics).toBe(null);
  });

  it('should initialize engine successfully', async () => {
    const mockDiagnostics = { engineVersion: '1.0.0' };
    vi.mocked(initializeAudioEngine).mockResolvedValue(undefined);
    vi.mocked(getDiagnostics).mockReturnValue(mockDiagnostics);
    vi.mocked(onMetricsUpdate).mockImplementation((callback) => {
      // Simulate metrics update
      callback({ processingTime: 10 });
      return () => {};
    });
    
    const { result } = renderHook(() => useEngineLifecycle());
    
    await act(async () => {
      await result.current.initialize();
    });
    
    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.engineState).toBe('ready');
      expect(result.current.metrics).toEqual({ processingTime: 10 });
    });
  });

  it('should handle initialization error', async () => {
    const mockError = new Error('Initialization failed');
    vi.mocked(initializeAudioEngine).mockRejectedValue(mockError);
    
    const onInitError = vi.fn();
    const { result } = renderHook(() => useEngineLifecycle({ onInitError }));
    
    await act(async () => {
      try {
        await result.current.initialize();
      } catch (error) {
        // Expected to throw
      }
    });
    
    expect(result.current.error).toBe('Initialization failed');
    expect(result.current.engineState).toBe('error');
    expect(onInitError).toHaveBeenCalledWith(mockError);
  });

  it('should auto-initialize when configured', async () => {
    vi.mocked(initializeAudioEngine).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useEngineLifecycle({ autoInitialize: true }));
    
    await waitFor(() => {
      expect(initializeAudioEngine).toHaveBeenCalled();
    });
  });

  it('should destroy engine and cleanup', async () => {
    vi.mocked(initializeAudioEngine).mockResolvedValue(undefined);
    vi.mocked(destroyEngine).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useEngineLifecycle());
    
    // Initialize first
    await act(async () => {
      await result.current.initialize();
    });
    
    // Then destroy
    await act(async () => {
      await result.current.destroy();
    });
    
    expect(destroyAudioConverter).toHaveBeenCalled();
    expect(destroyEngine).toHaveBeenCalledWith({ force: false });
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.engineState).toBe('destroyed');
  });

  it('should prevent concurrent initialization', async () => {
    vi.mocked(initializeAudioEngine).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    const { result } = renderHook(() => useEngineLifecycle());
    
    // Start two initializations
    const promise1 = result.current.initialize();
    const promise2 = result.current.initialize();
    
    // They should be the same promise
    expect(promise1).toBe(promise2);
    
    await act(async () => {
      await Promise.all([promise1, promise2]);
    });
    
    // Should only call initializeAudioEngine once
    expect(initializeAudioEngine).toHaveBeenCalledTimes(1);
  });

  it('should update diagnostics when requested', async () => {
    const mockDiagnostics = { engineVersion: '1.0.0', status: 'healthy' };
    vi.mocked(initializeAudioEngine).mockResolvedValue(undefined);
    vi.mocked(getDiagnostics).mockReturnValue(mockDiagnostics);
    
    const { result } = renderHook(() => useEngineLifecycle());
    
    // Initialize first
    await act(async () => {
      await result.current.initialize();
    });
    
    // Update diagnostics
    act(() => {
      const diag = result.current.updateDiagnostics();
      expect(diag).toEqual(mockDiagnostics);
    });
    
    expect(result.current.diagnostics).toEqual(mockDiagnostics);
  });

  it('should reset error when requested', () => {
    const { result } = renderHook(() => useEngineLifecycle());
    
    // Set error manually for testing
    act(() => {
      result.current.setError('Test error');
    });
    
    expect(result.current.error).toBe('Test error');
    
    // Reset error
    act(() => {
      result.current.resetError();
    });
    
    expect(result.current.error).toBe(null);
  });
});