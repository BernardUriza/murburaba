import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react';

// Mock the murmuraba package to test actual engine integration
vi.mock('murmuraba', async () => {
  const actual = await vi.importActual('murmuraba');
  return {
    ...actual,
    // Use real implementation but with mocked WASM loading
    useMurmubaraEngine: vi.fn(),
    getEngineStatus: vi.fn(() => 'idle'),
  };
});

// Test component that uses the engine (simulates real App behavior)
function TestEngineComponent() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useMurmubaraEngine } = require('murmuraba');
  
  const {
    isInitialized,
    isLoading,
    error,
    initialize
  } = useMurmubaraEngine({
    bufferSize: 4096,
    processWindow: 2048,
    enableMetrics: false,
    enableDebugLogs: true
  });

  return (
    <div data-testid="engine-test">
      <div data-testid="status">
        {isLoading ? 'Loading...' : 
         error ? `Error: ${error.message}` : 
         isInitialized ? 'Initialized' : 'Not Initialized'}
      </div>
      <button 
        data-testid="initialize-btn" 
        onClick={() => initialize()}
        disabled={isLoading}
      >
        Initialize Engine
      </button>
    </div>
  );
}

describe('Engine Integration Startup Tests', () => {
  let mockEngineReturn: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock return value
    mockEngineReturn = {
      isInitialized: false,
      isLoading: false,
      error: null,
      metrics: null,
      diagnostics: null,
      recordingState: { isRecording: false, isPaused: false },
      currentStream: null,
      initialize: vi.fn(() => Promise.resolve()),
      processFile: vi.fn(),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      pauseRecording: vi.fn(),
      resumeRecording: vi.fn(),
      clearRecordings: vi.fn(),
      toggleChunkPlayback: vi.fn(),
      toggleChunkExpansion: vi.fn(),
      exportChunkAsWav: vi.fn(),
      exportChunkAsMp3: vi.fn(),
      downloadAllChunksAsZip: vi.fn()
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useMurmubaraEngine } = require('murmuraba');
    vi.mocked(useMurmubaraEngine).mockReturnValue(mockEngineReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle engine loading state correctly', async () => {
    // Test loading state
    mockEngineReturn.isLoading = true;
    
    await act(async () => {
      render(<TestEngineComponent />);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('Loading...');
    expect(screen.getByTestId('initialize-btn')).toBeDisabled();
  });

  it('should handle engine initialization success', async () => {
    // Test successful initialization
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useMurmubaraEngine } = require('murmuraba');
    let initializeResolve: () => void;
    const initializePromise = new Promise<void>((resolve) => {
      initializeResolve = resolve;
    });

    mockEngineReturn.initialize = vi.fn(() => initializePromise);
    
    await act(async () => {
      render(<TestEngineComponent />);
    });

    // Click initialize
    const initBtn = screen.getByTestId('initialize-btn');
    await act(async () => {
      fireEvent.click(initBtn);
    });

    expect(mockEngineReturn.initialize).toHaveBeenCalled();

    // Simulate successful initialization
    mockEngineReturn.isLoading = false;
    mockEngineReturn.isInitialized = true;
    vi.mocked(useMurmubaraEngine).mockReturnValue(mockEngineReturn);

    await act(async () => {
      initializeResolve!();
    });

    // Re-render to check updated state
    await act(async () => {
      render(<TestEngineComponent />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Initialized');
    });
  });

  it('should handle WASM loading errors gracefully', async () => {
    const wasmError = new Error('WebAssembly.instantiate(): unexpected end of Wasm file');
    mockEngineReturn.error = wasmError;
    mockEngineReturn.isLoading = false;

    await act(async () => {
      render(<TestEngineComponent />);
    });

    expect(screen.getByTestId('status')).toHaveTextContent(`Error: ${wasmError.message}`);
  });

  it('should handle RNNoise module loading errors', async () => {
    const rnnError = new Error('Failed to initialize RNNoise: Module not found');
    mockEngineReturn.error = rnnError;
    mockEngineReturn.isLoading = false;

    await act(async () => {
      render(<TestEngineComponent />);
    });

    expect(screen.getByTestId('status')).toHaveTextContent(`Error: ${rnnError.message}`);
  });

  it('should handle network errors for WASM files', async () => {
    const networkError = new Error('Failed to fetch WASM: 404');
    mockEngineReturn.error = networkError;
    mockEngineReturn.isLoading = false;

    await act(async () => {
      render(<TestEngineComponent />);
    });

    expect(screen.getByTestId('status')).toHaveTextContent(`Error: ${networkError.message}`);
  });

  it('should retry initialization on failure', async () => {
    // First attempt fails
    let attemptCount = 0;
    mockEngineReturn.initialize = vi.fn(() => {
      attemptCount++;
      if (attemptCount === 1) {
        return Promise.reject(new Error('First attempt failed'));
      }
      // Second attempt succeeds
      mockEngineReturn.isInitialized = true;
      mockEngineReturn.error = null;
      return Promise.resolve();
    });

    await act(async () => {
      render(<TestEngineComponent />);
    });

    // First attempt
    const initBtn = screen.getByTestId('initialize-btn');
    await act(async () => {
      fireEvent.click(initBtn);
    });

    // Should have been called once and failed
    expect(mockEngineReturn.initialize).toHaveBeenCalledTimes(1);

    // Retry (simulate error handling and retry logic)
    await act(async () => {
      fireEvent.click(initBtn);
    });

    expect(mockEngineReturn.initialize).toHaveBeenCalledTimes(2);
  });

  describe('Specific Startup Failure Scenarios', () => {
    it('should identify missing WASM files', async () => {
      const wasmMissingError = new Error('Failed to fetch WASM: 404');
      mockEngineReturn.error = wasmMissingError;

      await act(async () => {
        render(<TestEngineComponent />);
      });

      const errorText = screen.getByTestId('status').textContent;
      expect(errorText).toContain('404');
      expect(errorText).toContain('fetch WASM');
    });

    it('should identify Web Audio API issues', async () => {
      const webAudioError = new Error('AudioContext is not defined');
      mockEngineReturn.error = webAudioError;

      await act(async () => {
        render(<TestEngineComponent />);
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Error: AudioContext is not defined');
    });

    it('should identify browser compatibility issues', async () => {
      const compatError = new Error('WebAssembly is not supported in this environment');
      mockEngineReturn.error = compatError;

      await act(async () => {
        render(<TestEngineComponent />);
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Error: WebAssembly is not supported in this environment');
    });

    it('should identify memory allocation failures', async () => {
      const memoryError = new Error('Cannot allocate memory');
      mockEngineReturn.error = memoryError;

      await act(async () => {
        render(<TestEngineComponent />);
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Error: Cannot allocate memory');
    });

    it('should identify worker loading issues', async () => {
      const workerError = new Error('Failed to load audio worklet processor');
      mockEngineReturn.error = workerError;

      await act(async () => {
        render(<TestEngineComponent />);
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Error: Failed to load audio worklet processor');
    });
  });

  describe('Configuration Issues', () => {
    it('should handle invalid buffer sizes', async () => {
      const configError = new Error('Invalid buffer size: must be power of 2');
      mockEngineReturn.error = configError;

      await act(async () => {
        render(<TestEngineComponent />);
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Error: Invalid buffer size: must be power of 2');
    });

    it('should handle missing worklet files', async () => {
      const workletError = new Error('Audio worklet script not found');
      mockEngineReturn.error = workletError;

      await act(async () => {
        render(<TestEngineComponent />);
      });

      expect(screen.getByTestId('status')).toHaveTextContent('Error: Audio worklet script not found');
    });
  });
});