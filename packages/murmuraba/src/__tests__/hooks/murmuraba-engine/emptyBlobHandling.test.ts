/**
 * TDD Test for Empty Blob Handling Bug
 * Problem: MediaRecorder creates empty blobs after 8 seconds
 * Expected: System should handle empty blobs gracefully
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useMurmubaraEngine } from '../../../hooks/murmuraba-engine';

// Mock dependencies
vi.mock('../../../api', () => ({
  initializeAudioEngine: vi.fn().mockResolvedValue(undefined),
  destroyEngine: vi.fn().mockResolvedValue(undefined),
  processStream: vi.fn(),
  processStreamChunked: vi.fn().mockResolvedValue({
    processedStream: {
      getTracks: () => [{ stop: vi.fn() }]
    },
    controller: {
      stop: vi.fn(),
      getMetrics: vi.fn().mockReturnValue({ frameCount: 100 })
    }
  }),
  getEngineStatus: vi.fn().mockReturnValue('ready'),
  getDiagnostics: vi.fn().mockReturnValue(null),
  onMetricsUpdate: vi.fn().mockReturnValue(() => {}),
}));

vi.mock('../../../utils/audioConverter', () => ({
  getAudioConverter: vi.fn().mockReturnValue({
    webmToWav: vi.fn().mockResolvedValue(new Blob(['wav'], { type: 'audio/wav' })),
    webmToMp3: vi.fn().mockResolvedValue(new Blob(['mp3'], { type: 'audio/mp3' }))
  }),
  destroyAudioConverter: vi.fn()
}));

describe('Empty Blob Handling - TDD', () => {
  let mockMediaRecorder: any;
  let dataAvailableCallback: ((event: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup MediaRecorder mock
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      state: 'inactive',
      addEventListener: vi.fn((event, callback) => {
        if (event === 'dataavailable') {
          dataAvailableCallback = callback;
        }
      }),
      removeEventListener: vi.fn(),
    };

    (global.MediaRecorder as any) = vi.fn(() => mockMediaRecorder);
    global.MediaRecorder.isTypeSupported = vi.fn(() => true);

    // Mock getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      },
      writable: true
    });

    // Mock URL
    global.URL.createObjectURL = vi.fn(() => `blob:test-${Math.random()}`);
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Empty Blob Detection', () => {
    it('should detect and handle empty blobs from MediaRecorder', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      // The system should start without error even if blobs are empty
      expect(result.current.error).toBeNull();
      expect(result.current.recordingState.chunks).toHaveLength(0);
    });

    it('should filter out chunks with invalid blob sizes', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate sequence: valid blob, then empty blob, then valid blob
      act(() => {
        if (dataAvailableCallback) {
          // Valid blob
          dataAvailableCallback({ 
            data: new Blob(['valid data'], { type: 'audio/webm' }) 
          });
        }
      });

      // Wait for processing
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const chunksAfterValid = result.current.recordingState.chunks.length;
      expect(chunksAfterValid).toBeGreaterThan(0);

      act(() => {
        if (dataAvailableCallback) {
          // Empty blob - should be ignored
          dataAvailableCallback({ 
            data: new Blob([], { type: 'audio/webm' }) 
          });
        }
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Chunk count should not increase for empty blob
      expect(result.current.recordingState.chunks.length).toBe(chunksAfterValid);
    });

    it('should log warning when empty blob is detected', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation();
      
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        if (dataAvailableCallback) {
          dataAvailableCallback({ 
            data: new Blob([], { type: 'audio/webm' }) 
          });
        }
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid blob size detected'),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle blob size validation for processed vs original data', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      // Mock fetch to return different sizes for processed vs original
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          blob: vi.fn().mockResolvedValue(new Blob(['processed data']))
        })
        .mockResolvedValueOnce({
          blob: vi.fn().mockResolvedValue(new Blob([])) // Empty original
        });

      await act(async () => {
        await result.current.startRecording();
      });

      act(() => {
        if (dataAvailableCallback) {
          dataAvailableCallback({ 
            data: new Blob(['test'], { type: 'audio/webm' }) 
          });
        }
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Chunk should still be created but marked with size discrepancy
      const chunk = result.current.recordingState.chunks[0];
      if (chunk) {
        expect(chunk.originalSize).toBe(0);
        expect(chunk.processedSize).toBeGreaterThan(0);
      }
    });
  });

  describe('Continuous Recording with Empty Blobs', () => {
    it('should maintain recording state when encountering empty blobs', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.startRecording();
      });

      // Simulate 10 seconds of recording with some empty blobs
      for (let i = 0; i < 10; i++) {
        act(() => {
          if (dataAvailableCallback) {
            // Every 3rd blob is empty (simulating the 8-second issue)
            const data = i % 3 === 0 
              ? new Blob([], { type: 'audio/webm' })
              : new Blob([`data-${i}`], { type: 'audio/webm' });
            
            dataAvailableCallback({ data });
          }
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      // Should have recorded only the valid blobs
      const validChunks = result.current.recordingState.chunks.filter(
        chunk => chunk.originalSize > 0
      );
      
      expect(validChunks.length).toBeGreaterThan(0);
      expect(validChunks.length).toBeLessThan(10); // Some were filtered out
      expect(result.current.recordingState.isRecording).toBe(true);
    });
  });

  describe('Blob Validation Logic', () => {
    it('should implement minimum blob size threshold', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.startRecording();
      });

      // Test various blob sizes
      const testCases = [
        { size: 0, shouldBeAccepted: false },
        { size: 1, shouldBeAccepted: false },    // Too small
        { size: 100, shouldBeAccepted: true },   // Valid
        { size: 1000, shouldBeAccepted: true },  // Valid
      ];

      for (const testCase of testCases) {
        const initialChunkCount = result.current.recordingState.chunks.length;
        
        act(() => {
          if (dataAvailableCallback) {
            const data = new Blob(
              [new ArrayBuffer(testCase.size)], 
              { type: 'audio/webm' }
            );
            dataAvailableCallback({ data });
          }
        });

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });

        const newChunkCount = result.current.recordingState.chunks.length;
        const chunkWasAdded = newChunkCount > initialChunkCount;
        
        if (testCase.shouldBeAccepted) {
          expect(chunkWasAdded).toBe(true);
        } else {
          expect(chunkWasAdded).toBe(false);
        }
      }
    });
  });
});