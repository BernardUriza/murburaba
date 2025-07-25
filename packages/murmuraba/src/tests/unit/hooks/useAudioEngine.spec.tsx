import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioEngine } from '../../../hooks/useAudioEngine';
import { createAudioEngine } from '../../../engines';

// Mock the engines module
vi.mock('../../../engines', () => ({
  createAudioEngine: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    process: vi.fn((input) => input),
    cleanup: vi.fn(),
  })),
}));

// Mock AudioContext
const mockAudioContext = {
  state: 'running',
  sampleRate: 48000,
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null,
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createMediaStreamDestination: vi.fn(() => ({
    stream: new MediaStream(),
  })),
  close: vi.fn(),
};

global.AudioContext = vi.fn(() => mockAudioContext) as any;

describe('useAudioEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should show deprecation warning on mount', () => {
      const { result } = renderHook(() => useAudioEngine());
      
      expect(console.warn).toHaveBeenCalledWith(
        '[Murmuraba] useAudioEngine is deprecated. Please use useMurmubaraEngine instead for better React 19 compatibility.'
      );
    });

    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAudioEngine());
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should initialize audio engine', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(createAudioEngine).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const mockError = new Error('Init failed');
      vi.mocked(createAudioEngine).mockReturnValueOnce({
        initialize: vi.fn().mockRejectedValue(mockError),
        process: vi.fn(),
        cleanup: vi.fn(),
      });

      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await expect(result.current.initializeAudioEngine()).rejects.toThrow('Init failed');
      });
      
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe('Init failed');
    });

    it('should prevent multiple simultaneous initializations', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      // Start two initializations
      act(() => {
        result.current.initializeAudioEngine();
        result.current.initializeAudioEngine();
      });
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      // Should only create engine once
      expect(createAudioEngine).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stream Processing', () => {
    it('should process media stream', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      // Initialize first
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      const mockStream = new MediaStream();
      
      await act(async () => {
        const processedStream = await result.current.processStream(mockStream);
        expect(processedStream).toBeInstanceOf(MediaStream);
      });
      
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(mockAudioContext.createScriptProcessor).toHaveBeenCalled();
    });

    it('should auto-initialize if needed when processing stream', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      expect(result.current.isInitialized).toBe(false);
      
      const mockStream = new MediaStream();
      
      await act(async () => {
        await result.current.processStream(mockStream);
      });
      
      expect(result.current.isInitialized).toBe(true);
    });

    it('should process audio chunks', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(undefined),
        process: vi.fn((input) => {
          // Simulate noise reduction
          return input.map(v => v * 0.8);
        }),
        cleanup: vi.fn(),
      };
      
      vi.mocked(createAudioEngine).mockReturnValue(mockEngine);
      
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      // Simulate audio processing
      const processor = mockAudioContext.createScriptProcessor();
      const event = {
        inputBuffer: {
          getChannelData: () => new Float32Array(4096).fill(0.5),
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(4096),
        },
      };
      
      act(() => {
        processor.onaudioprocess(event);
      });
      
      // Engine process should be called for chunks
      await waitFor(() => {
        expect(mockEngine.process).toHaveBeenCalled();
      });
    });
  });

  describe('Metrics', () => {
    it('should track processing metrics', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      // Reset metrics
      act(() => {
        result.current.resetMetrics();
      });
      
      const metrics = result.current.getMetrics();
      
      expect(metrics).toMatchObject({
        inputSamples: 0,
        outputSamples: 0,
        silenceFrames: 0,
        activeFrames: 0,
        noiseReductionLevel: expect.any(Number),
        peakInputLevel: 0,
        peakOutputLevel: 0,
      });
    });

    it('should update metrics during processing', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      const processor = mockAudioContext.createScriptProcessor();
      
      // Simulate processing with audio data
      const audioData = new Float32Array(4096);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * i / 100) * 0.5;
      }
      
      const event = {
        inputBuffer: {
          getChannelData: () => audioData,
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(4096),
        },
      };
      
      act(() => {
        processor.onaudioprocess(event);
      });
      
      const metrics = result.current.getMetrics();
      
      expect(metrics.inputSamples).toBeGreaterThan(0);
      expect(metrics.peakInputLevel).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(undefined),
        process: vi.fn(),
        cleanup: vi.fn(),
      };
      
      vi.mocked(createAudioEngine).mockReturnValue(mockEngine);
      
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      act(() => {
        result.current.cleanup();
      });
      
      expect(mockEngine.cleanup).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should disconnect processor on cleanup', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      const processor = mockAudioContext.createScriptProcessor();
      
      act(() => {
        result.current.cleanup();
      });
      
      expect(processor.disconnect).toHaveBeenCalled();
    });

    it('should handle cleanup when not initialized', () => {
      const { result } = renderHook(() => useAudioEngine());
      
      // Should not throw
      expect(() => {
        result.current.cleanup();
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', async () => {
      const config = {
        engineType: 'rnnoise' as const,
        someOption: true,
      };
      
      const { result } = renderHook(() => useAudioEngine(config));
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      expect(createAudioEngine).toHaveBeenCalledWith(config);
    });
  });

  describe('Audio Processing Logic', () => {
    it('should apply silence gating', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      const processor = mockAudioContext.createScriptProcessor();
      
      // Very quiet signal (below silence threshold)
      const silentData = new Float32Array(480).fill(0.0001);
      
      const event = {
        inputBuffer: {
          getChannelData: () => silentData,
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(480),
        },
      };
      
      act(() => {
        processor.onaudioprocess(event);
      });
      
      const metrics = result.current.getMetrics();
      expect(metrics.silenceFrames).toBeGreaterThan(0);
    });

    it('should track active frames for loud signals', async () => {
      const { result } = renderHook(() => useAudioEngine());
      
      await act(async () => {
        await result.current.initializeAudioEngine();
      });
      
      const processor = mockAudioContext.createScriptProcessor();
      
      // Loud signal (above speech threshold)
      const loudData = new Float32Array(480);
      for (let i = 0; i < loudData.length; i++) {
        loudData[i] = Math.sin(2 * Math.PI * i / 50) * 0.8;
      }
      
      const event = {
        inputBuffer: {
          getChannelData: () => loudData,
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(480),
        },
      };
      
      act(() => {
        processor.onaudioprocess(event);
      });
      
      const metrics = result.current.getMetrics();
      expect(metrics.activeFrames).toBeGreaterThan(0);
    });
  });
});