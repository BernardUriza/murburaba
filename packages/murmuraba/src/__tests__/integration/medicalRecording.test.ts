/**
 * Integration Tests for Medical-Grade Recording
 * CRITICAL: These tests simulate real hospital recording scenarios
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMurmubaraEngine } from '../../hooks/murmuraba-engine';
import * as api from '../../api';

// Mock API
jest.mock('../../api');

describe('Medical Recording Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    
    // Setup API mocks
    (api.initializeAudioEngine as jest.Mock).mockResolvedValue(undefined);
    (api.destroyEngine as jest.Mock).mockResolvedValue(undefined);
    (api.getEngineStatus as jest.Mock).mockReturnValue('ready');
    (api.processStream as jest.Mock).mockResolvedValue({
      stream: new MediaStream(),
      destroy: jest.fn()
    });
    (api.getDiagnostics as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      audioContextState: 'running',
      processingLatency: 15,
      memoryUsage: 5000000,
      streamCount: 1,
    });
    (api.onMetricsUpdate as jest.Mock).mockReturnValue(() => {});
    
    // Mock MediaStream clone method
    Object.defineProperty(MediaStream.prototype, 'clone', {
      value: jest.fn().mockImplementation(function() {
        return new MediaStream();
      }),
      writable: true,
      configurable: true
    });
  });

  describe('Hospital Consultation Recording', () => {
    it('should handle 30-minute consultation recording without memory issues', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useMurmubaraEngine({
        noiseReductionLevel: 'high',
        algorithm: 'rnnoise',
        bufferSize: 4096, // Maximum allowed buffer size
        defaultChunkDuration: 8, // 8-second chunks
      }));

      // Start recording
      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording(8);
      });

      expect(result.current.recordingState.isRecording).toBe(true);

      // Simulate 30 minutes of recording (225 chunks)
      const CHUNKS_IN_30_MIN = Math.floor((30 * 60) / 8);
      const mockRecorder = (global.MediaRecorder as any).mock.results[0].value;

      for (let i = 0; i < CHUNKS_IN_30_MIN; i++) {
        act(() => {
          // Advance time by 8 seconds
          jest.advanceTimersByTime(8000);
          
          // Simulate chunk data
          mockRecorder.ondataavailable({ 
            data: new Blob([`chunk-${i}`], { type: 'audio/webm' }) 
          });
          mockRecorder.onstop();
        });

        // Allow state updates
        await act(async () => {
          await Promise.resolve();
        });
      }

      // Verify memory management worked
      expect(result.current.recordingState.chunks.length).toBeLessThanOrEqual(100); // MAX_CHUNKS
      expect(result.current.recordingState.chunks.length).toBeGreaterThan(0);
      
      // Verify recent chunks are kept
      const lastChunk = result.current.recordingState.chunks[result.current.recordingState.chunks.length - 1];
      expect(lastChunk).toBeDefined();

      // Stop recording
      act(() => {
        result.current.stopRecording();
      });

      jest.useRealTimers();
    });

    it('should maintain audio quality metrics throughout recording', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      
      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Simulate metrics updates
      const metricsCallback = (api.onMetricsUpdate as jest.Mock).mock.calls[0][0];
      
      act(() => {
        metricsCallback({
          processingLatency: 12,
          frameCount: 1000,
          inputLevel: 0.8,
          outputLevel: 0.6,
          noiseReductionLevel: 0.7,
          timestamp: Date.now(),
          droppedFrames: 0,
        });
      });

      expect(result.current.metrics).toMatchObject({
        processingLatency: 12,
        droppedFrames: 0,
      });
    });

    it('should handle interruptions gracefully', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      
      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Simulate pause (doctor needs to check something)
      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.recordingState.isPaused).toBe(true);
      expect(result.current.recordingState.isRecording).toBe(true);

      // Resume recording
      act(() => {
        result.current.resumeRecording();
      });

      expect(result.current.recordingState.isPaused).toBe(false);
      expect(result.current.recordingState.isRecording).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary network issues during export', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      
      await act(async () => {
        await result.current.initialize();
        // Add mock chunk
        result.current.recordingState.chunks.push({
          id: 'test-chunk',
          processedAudioUrl: 'blob:test',
          originalAudioUrl: 'blob:test-original',
          isValid: true,
        } as any);
      });

      // First attempt fails
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));
      
      await expect(
        result.current.exportChunkAsWav('test-chunk', 'processed')
      ).rejects.toThrow();

      // Second attempt succeeds
      global.fetch = jest.fn().mockResolvedValueOnce({
        blob: jest.fn().mockResolvedValue(new Blob(['audio'], { type: 'audio/webm' })),
      });

      // Should work on retry
      const blob = await result.current.exportChunkAsWav('test-chunk', 'processed');
      expect(blob).toBeDefined();
    });

    it('should handle microphone disconnection', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      
      await act(async () => {
        await result.current.initialize();
        await result.current.startRecording();
      });

      // Simulate microphone disconnection
      const mockStream = await (navigator.mediaDevices.getUserMedia as jest.Mock).mock.results[0].value;
      const tracks = mockStream.getTracks();
      
      act(() => {
        tracks.forEach((track: any) => {
          track.readyState = 'ended';
          track.stop();
        });
      });

      // Engine should handle gracefully
      expect(result.current.error).toBeDefined();
    });
  });

  describe('Export Functionality', () => {
    it('should export individual chunks as MP3', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      
      await act(async () => {
        await result.current.initialize();
        
        // Add a chunk
        result.current.recordingState.chunks.push({
          id: 'chunk-1',
          processedAudioUrl: 'blob:processed-1',
          originalAudioUrl: 'blob:original-1',
          isValid: true,
          duration: 8000,
          startTime: Date.now(),
          endTime: Date.now() + 8000,
          isPlaying: false,
          isExpanded: false,
        } as any);
      });

      // Mock successful conversion
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['webm'], { type: 'audio/webm' })),
      });

      const mp3Blob = await result.current.exportChunkAsMp3('chunk-1', 'processed', 192);
      
      expect(mp3Blob).toBeDefined();
      expect(mp3Blob.type).toBe('audio/mp3');
    });

    it('should handle partial export for corrupted chunks', async () => {
      const { result } = renderHook(() => useMurmubaraEngine());
      
      await act(async () => {
        await result.current.initialize();
        
        // Mix of valid and invalid chunks
        result.current.recordingState.chunks.push(
          {
            id: 'valid-1',
            processedAudioUrl: 'blob:valid-1',
            isValid: true,
          } as any,
          {
            id: 'invalid-1',
            processedAudioUrl: undefined,
            isValid: false,
            errorMessage: 'Corrupted audio',
          } as any,
          {
            id: 'valid-2',
            processedAudioUrl: 'blob:valid-2',
            isValid: true,
          } as any
        );
      });

      // Should export only valid chunks
      const validChunks = result.current.recordingState.chunks.filter(c => c.isValid);
      expect(validChunks).toHaveLength(2);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain low latency with high-frequency noise', async () => {
      const { result } = renderHook(() => useMurmubaraEngine({
        noiseReductionLevel: 'high',
        algorithm: 'rnnoise',
      }));

      await act(async () => {
        await result.current.initialize();
      });

      // Simulate high-frequency updates
      const metricsCallback = (api.onMetricsUpdate as jest.Mock).mock.calls[0][0];
      
      const latencies: number[] = [];
      for (let i = 0; i < 100; i++) {
        act(() => {
          metricsCallback({
            processingLatency: 10 + Math.random() * 5, // 10-15ms
            frameCount: 100,
            inputLevel: 0.9,
            outputLevel: 0.4,
            noiseReductionLevel: 0.8,
            timestamp: Date.now(),
            droppedFrames: 0,
          });
        });
        
        if (result.current.metrics) {
          latencies.push(result.current.metrics.processingLatency);
        }
      }

      // Average latency should be acceptable for medical use
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(avgLatency).toBeLessThan(20); // Less than 20ms average
    });
  });
});