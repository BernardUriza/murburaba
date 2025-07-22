/**
 * Test specifically for Advanced Metrics button disabled issue
 * Testing the race condition in diagnostics initialization
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useMurmubaraEngine } from '../../hooks/murmuraba-engine';
import * as api from '../../api';

// Mock the API module
vi.mock('../../api', () => ({
  initializeAudioEngine: vi.fn().mockResolvedValue(undefined),
  destroyEngine: vi.fn().mockResolvedValue(undefined),
  getEngineStatus: vi.fn().mockReturnValue('ready'),
  getDiagnostics: vi.fn(),
  onMetricsUpdate: vi.fn(() => () => {}),
}));

// Mock audio converter
vi.mock('../../utils/audioConverter', () => ({
  getAudioConverter: vi.fn().mockReturnValue({
    webmToWav: vi.fn().mockResolvedValue(new Blob(['wav'], { type: 'audio/wav' })),
    webmToMp3: vi.fn().mockResolvedValue(new Blob(['mp3'], { type: 'audio/mp3' }))
  }),
  destroyAudioConverter: vi.fn(),
}));

describe('useMurmubaraEngine - Diagnostics Race Condition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock browser APIs
    global.URL.createObjectURL = vi.fn(() => `blob:test-${Math.random()}`);
    global.URL.revokeObjectURL = vi.fn();
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      },
      writable: true
    });
    global.MediaRecorder = vi.fn() as any;
    vi.spyOn(console, 'error').mockImplementation();
    vi.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fail to get diagnostics due to race condition during initialization', async () => {
    // This test proves the bug: getDiagnostics is called before isInitialized is true
    let getDiagnosticsCallCount = 0;
    
    (api.getDiagnostics as vi.Mock).mockImplementation(() => {
      getDiagnosticsCallCount++;
      // First call happens during init when isInitialized might still be false
      if (getDiagnosticsCallCount === 1) {
        return null; // Simulating the race condition
      }
      return {
        wasmLoaded: true,
        audioContextState: 'running',
        processingLatency: 10,
        memoryUsage: 1000000,
        streamCount: 1,
      };
    });

    const { result } = renderHook(() => useMurmubaraEngine());
    
    expect(result.current.diagnostics).toBeNull();
    expect(result.current.isInitialized).toBe(false);

    await act(async () => {
      await result.current.initialize();
    });

    // After initialization, isInitialized is true but diagnostics is still null
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.diagnostics).toBeNull(); // THIS IS THE BUG!
    
    // The button would be disabled because diagnostics is null
    const buttonWouldBeDisabled = !result.current.isInitialized || !result.current.diagnostics;
    expect(buttonWouldBeDisabled).toBe(true); // Button is disabled even though engine is initialized
  });

  it('should automatically update diagnostics after initialization due to useEffect fix', async () => {
    (api.getDiagnostics as vi.Mock).mockReturnValue({
      wasmLoaded: true,
      audioContextState: 'running',
      processingLatency: 10,
      memoryUsage: 1000000,
      streamCount: 1,
    });

    const { result } = renderHook(() => useMurmubaraEngine());

    await act(async () => {
      await result.current.initialize();
    });

    // Wait for useEffect to trigger
    await waitFor(() => {
      expect(result.current.diagnostics).not.toBeNull();
    });

    // Now diagnostics should be populated automatically
    expect(result.current.diagnostics?.wasmLoaded).toBe(true);
    
    // Button would now be enabled
    const buttonWouldBeDisabled = !result.current.isInitialized || !result.current.diagnostics;
    expect(buttonWouldBeDisabled).toBe(false);
  });

  it('should handle the fix with automatic useEffect update', async () => {
    // This test verifies the fix works with the new useEffect
    let isInitializedState = false;
    
    (api.getDiagnostics as vi.Mock).mockImplementation(() => {
      // Only return diagnostics if initialized
      if (!isInitializedState) {
        return null;
      }
      return {
        wasmLoaded: true,
        audioContextState: 'running',
        processingLatency: 10,
        memoryUsage: 1000000,
        streamCount: 1,
      };
    });

    const { result } = renderHook(() => useMurmubaraEngine());

    await act(async () => {
      const initPromise = result.current.initialize();
      // Simulate state update happening
      isInitializedState = true;
      await initPromise;
    });

    // The useEffect should automatically update diagnostics
    await waitFor(() => {
      expect(result.current.diagnostics).not.toBeNull();
    });

    expect(result.current.isInitialized).toBe(true);
    expect(result.current.diagnostics?.wasmLoaded).toBe(true);
    
    const buttonWouldBeDisabled = !result.current.isInitialized || !result.current.diagnostics;
    expect(buttonWouldBeDisabled).toBe(false); // Button should be enabled
  });

  it('should show that Show Advanced Metrics button is disabled when diagnostics is null', async () => {
    // Direct simulation of the button's disabled state logic
    (api.getDiagnostics as vi.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useMurmubaraEngine());

    await act(async () => {
      await result.current.initialize();
    });

    // Simulate the button's disabled prop calculation from pages/index.tsx:707
    const isInitialized = result.current.isInitialized;
    const diagnostics = result.current.diagnostics;
    const buttonDisabled = !isInitialized || !diagnostics;

    expect(isInitialized).toBe(true);
    expect(diagnostics).toBeNull();
    expect(buttonDisabled).toBe(true); // This is why the button is always disabled!
  });
});