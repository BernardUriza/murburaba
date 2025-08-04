import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMurmubaraEngine } from 'murmuraba';
import { AudioRecorder } from '../features/audio-recording/AudioRecorder';

// Mock the Murmuraba core module
vi.mock('murmuraba/src/core/murmuraba-engine', () => {
  class MockMurmubaraEngine {
    private inputGain = 1.0;
    private audioContext: any;
    private inputGainNode: any;

    constructor(config: any = {}) {
      this.inputGain = Math.max(0.5, Math.min(3.0, config.inputGain || 1.0));
    }

    async initialize() {
      this.audioContext = {
        createGain: vi.fn(() => {
          this.inputGainNode = {
            gain: { value: this.inputGain },
            connect: vi.fn(),
            disconnect: vi.fn()
          };
          return this.inputGainNode;
        }),
        createMediaStreamSource: vi.fn(),
        createMediaStreamDestination: vi.fn(() => ({
          stream: new MediaStream()
        })),
        createScriptProcessor: vi.fn(() => ({
          connect: vi.fn(),
          disconnect: vi.fn(),
          onaudioprocess: null
        })),
        createBiquadFilter: vi.fn(() => ({
          type: 'notch',
          frequency: { value: 1000 },
          Q: { value: 30 },
          gain: { value: 0 },
          connect: vi.fn(),
          disconnect: vi.fn()
        })),
        sampleRate: 48000,
        state: 'running',
        destination: { maxChannelCount: 2 },
        close: vi.fn().mockResolvedValue(undefined)
      };
    }

    setInputGain(gain: number) {
      this.inputGain = Math.max(0.5, Math.min(3.0, gain));
      if (this.inputGainNode) {
        this.inputGainNode.gain.value = this.inputGain;
      }
    }

    getInputGain() {
      return this.inputGain;
    }

    async processStream(_stream: MediaStream) {
      return {
        stream: new MediaStream(),
        stop: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getState: vi.fn().mockReturnValue('processing'),
        processor: {}
      };
    }

    async destroy() {
      if (this.audioContext) {
        await this.audioContext.close();
      }
    }

    getDiagnostics() {
      return { engineState: 'ready' };
    }

    onMetricsUpdate(_callback: Function) {
      return () => {};
    }

    off() {}
  }

  return { MurmubaraEngine: MockMurmubaraEngine };
});

// Mock the WASM loader
vi.mock('murmuraba/src/utils/rnnoise-loader', () => ({
  loadRNNoiseModule: vi.fn().mockResolvedValue({
    _rnnoise_create: vi.fn().mockReturnValue(1),
    _rnnoise_destroy: vi.fn(),
    _rnnoise_process_frame: vi.fn().mockReturnValue(0.5),
    _malloc: vi.fn().mockReturnValue(1000),
    _free: vi.fn(),
    HEAPF32: new Float32Array(10000)
  })
}));

// Mock the audio converter
vi.mock('murmuraba/src/utils/audio-converter', () => ({
  getAudioConverter: vi.fn().mockReturnValue({
    convertToWav: vi.fn(),
    convertToMp3: vi.fn()
  }),
  destroyAudioConverter: vi.fn(),
  AudioConverter: vi.fn()
}));

describe('Gain Control - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(new MediaStream())
      },
      writable: true,
      configurable: true
    });
    
    // Mock AudioContext
    global.AudioContext = vi.fn().mockImplementation(() => ({
      createMediaStreamSource: vi.fn(),
      createMediaStreamDestination: vi.fn(() => ({
        stream: new MediaStream()
      })),
      createScriptProcessor: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null
      })),
      createGain: vi.fn(() => ({
        gain: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      createBiquadFilter: vi.fn(() => ({
        type: 'notch',
        frequency: { value: 1000 },
        Q: { value: 30 },
        gain: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      sampleRate: 48000,
      state: 'running',
      destination: { maxChannelCount: 2 },
      close: vi.fn().mockResolvedValue(undefined)
    })) as any;

    // Mock WebAssembly
    global.WebAssembly = {
      instantiate: vi.fn(),
      compile: vi.fn(),
      compileStreaming: vi.fn(),
      instantiateStreaming: vi.fn(),
      validate: vi.fn(),
      Module: vi.fn() as any,
      Instance: vi.fn() as any,
      Memory: vi.fn() as any,
      Table: vi.fn() as any,
      Global: vi.fn() as any,
      CompileError: Error as any,
      LinkError: Error as any,
      RuntimeError: Error as any
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Gain Control Flow', () => {
    it('should handle complete gain adjustment workflow', async () => {
      // Step 1: Initialize the engine with hook
      const { result: engineHook } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(engineHook.current.isInitialized).toBe(true);
      });

      // Step 2: Render AudioRecorder component with hook values
      const { rerender } = render(
        <AudioRecorder
          recordingState={engineHook.current.recordingState}
          isInitialized={engineHook.current.isInitialized}
          isLoading={engineHook.current.isLoading}
          inputGain={engineHook.current.inputGain}
          onStartRecording={engineHook.current.startRecording}
          onStopRecording={engineHook.current.stopRecording}
          onPauseRecording={engineHook.current.pauseRecording}
          onResumeRecording={engineHook.current.resumeRecording}
          onClearRecordings={engineHook.current.clearRecordings}
          onSetInputGain={engineHook.current.setInputGain}
        />
      );

      // Step 3: Open gain control panel
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);

      expect(screen.getByText('Input Gain: 1.0x')).toBeInTheDocument();

      // Step 4: Adjust gain using slider
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2.0' } });

      // Step 5: Verify gain was updated in hook
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(engineHook.current.inputGain).toBe(2.0);

      // Step 6: Re-render with updated values
      rerender(
        <AudioRecorder
          recordingState={engineHook.current.recordingState}
          isInitialized={engineHook.current.isInitialized}
          isLoading={engineHook.current.isLoading}
          inputGain={engineHook.current.inputGain}
          onStartRecording={engineHook.current.startRecording}
          onStopRecording={engineHook.current.stopRecording}
          onPauseRecording={engineHook.current.pauseRecording}
          onResumeRecording={engineHook.current.resumeRecording}
          onClearRecordings={engineHook.current.clearRecordings}
          onSetInputGain={engineHook.current.setInputGain}
        />
      );

      // Step 7: Verify UI reflects the change
      expect(screen.getByText('Input Gain: 2.0x')).toBeInTheDocument();

      // Step 8: Start recording with adjusted gain
      await act(async () => {
        await engineHook.current.startRecording();
      });

      // Step 9: Verify gain persists during recording
      expect(engineHook.current.inputGain).toBe(2.0);
      expect(engineHook.current.recordingState.isRecording).toBe(true);

      // Step 10: Adjust gain during recording
      const highButton = screen.getByRole('button', { name: /high/i });
      await userEvent.click(highButton);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(engineHook.current.inputGain).toBe(1.5);

      // Step 11: Stop recording
      act(() => {
        engineHook.current.stopRecording();
      });

      // Step 12: Verify gain persists after recording
      expect(engineHook.current.inputGain).toBe(1.5);
    });

    it('should maintain gain consistency across multiple operations', async () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Test sequence of operations
      const operations = [
        { action: 'set', value: 1.5 },
        { action: 'get', expected: 1.5 },
        { action: 'set', value: 2.5 },
        { action: 'get', expected: 2.5 },
        { action: 'set', value: 0.3 },  // Should clamp to 0.5
        { action: 'get', expected: 0.5 },
        { action: 'set', value: 5.0 },  // Should clamp to 3.0
        { action: 'get', expected: 3.0 }
      ];

      for (const op of operations) {
        if (op.action === 'set') {
          act(() => {
            result.current.setInputGain(op.value!);
          });
        } else if (op.action === 'get') {
          const gain = result.current.getInputGain();
          expect(gain).toBe(op.expected);
        }
      }
    });

    it('should handle gain control with audio processing', async () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Set initial gain
      act(() => {
        result.current.setInputGain(1.8);
      });

      // Process an audio stream
      const mockStream = new MediaStream();
      let controller: any;

      await act(async () => {
        controller = await result.current.processStream(mockStream);
      });

      expect(controller).toBeDefined();
      expect(result.current.inputGain).toBe(1.8);

      // Update gain during processing
      act(() => {
        result.current.setInputGain(2.2);
      });

      expect(result.current.inputGain).toBe(2.2);

      // Stop processing
      if (controller) {
        controller.stop();
      }

      // Gain should persist
      expect(result.current.inputGain).toBe(2.2);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from gain update errors', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      // Try to set gain before initialization (will cause error)
      act(() => {
        result.current.setInputGain(1.5);
      });

      expect(result.current.error).toBeTruthy();

      // Clear error
      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();

      // Initialize engine
      await act(async () => {
        await result.current.initialize();
      });

      // Now gain should work
      act(() => {
        result.current.setInputGain(1.5);
      });

      expect(result.current.inputGain).toBe(1.5);
      expect(result.current.error).toBeNull();
    });

    it('should handle gain persistence through engine restart', async () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Set gain
      act(() => {
        result.current.setInputGain(2.0);
      });

      expect(result.current.inputGain).toBe(2.0);

      // Destroy engine
      await act(async () => {
        await result.current.destroy();
      });

      expect(result.current.isInitialized).toBe(false);

      // Re-initialize
      await act(async () => {
        await result.current.initialize();
      });

      // Gain should be accessible again
      const gain = result.current.getInputGain();
      expect(typeof gain).toBe('number');
    });
  });

  describe('UI Component Integration', () => {
    it('should integrate gain control with full recording workflow', async () => {
      const TestComponent = () => {
        const engine = useMurmubaraEngine({ autoInitialize: true });

        return (
          <div>
            <AudioRecorder
              recordingState={engine.recordingState}
              isInitialized={engine.isInitialized}
              isLoading={engine.isLoading}
              inputGain={engine.inputGain}
              onStartRecording={engine.startRecording}
              onStopRecording={engine.stopRecording}
              onPauseRecording={engine.pauseRecording}
              onResumeRecording={engine.resumeRecording}
              onClearRecordings={engine.clearRecordings}
              onSetInputGain={engine.setInputGain}
            />
            <div data-testid="gain-display">
              Current Gain: {engine.inputGain.toFixed(1)}x
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start recording/i }))
          .not.toBeDisabled();
      });

      // Check initial gain
      expect(screen.getByTestId('gain-display')).toHaveTextContent('Current Gain: 1.0x');

      // Open gain control
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);

      // Use preset button
      const boostButton = screen.getByRole('button', { name: /boost/i });
      await userEvent.click(boostButton);

      // Verify gain updated
      await waitFor(() => {
        expect(screen.getByTestId('gain-display')).toHaveTextContent('Current Gain: 2.0x');
      });

      // Start recording
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await userEvent.click(recordButton);

      // Verify recording started
      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument();
      });

      // Gain should still be accessible
      expect(screen.getByTestId('gain-display')).toHaveTextContent('Current Gain: 2.0x');
    });
  });

  describe('Performance', () => {
    it('should handle rapid gain updates without performance degradation', async () => {
      const { result } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      const startTime = performance.now();
      
      // Perform 100 rapid gain updates
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setInputGain(0.5 + (i % 25) * 0.1);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 50ms)
      expect(duration).toBeLessThan(50);

      // Final value should be correct
      const expectedFinalGain = 0.5 + (99 % 25) * 0.1;
      expect(result.current.inputGain).toBeCloseTo(expectedFinalGain, 1);
    });

    it('should not cause memory leaks with repeated gain operations', async () => {
      const { result, unmount } = renderHook(() => 
        useMurmubaraEngine({ autoInitialize: true })
      );

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Perform many operations
      for (let i = 0; i < 50; i++) {
        act(() => {
          result.current.setInputGain(1.0 + (i % 20) * 0.1);
          result.current.getInputGain();
        });
      }

      // Clean unmount should work
      expect(() => unmount()).not.toThrow();
    });
  });
});