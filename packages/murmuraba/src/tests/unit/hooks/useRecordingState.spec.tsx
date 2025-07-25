import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecordingState } from '../../../hooks/murmuraba-engine/useRecordingState';

describe('useRecordingState', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useRecordingState());

      expect(result.current.recordingState).toEqual({
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        chunks: [],
      });
    });
  });

  describe('Recording Controls', () => {
    it('should start recording', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
      });

      expect(result.current.recordingState.isRecording).toBe(true);
      expect(result.current.recordingState.isPaused).toBe(false);
    });

    it('should stop recording', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.stopRecording();
      });

      expect(result.current.recordingState.isRecording).toBe(false);
      expect(result.current.recordingState.isPaused).toBe(false);
    });

    it('should pause recording', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.pauseRecording();
      });

      expect(result.current.recordingState.isRecording).toBe(true);
      expect(result.current.recordingState.isPaused).toBe(true);
    });

    it('should resume recording', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.pauseRecording();
        result.current.resumeRecording();
      });

      expect(result.current.recordingState.isRecording).toBe(true);
      expect(result.current.recordingState.isPaused).toBe(false);
    });

    it('should not pause when not recording', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.pauseRecording();
      });

      expect(result.current.recordingState.isPaused).toBe(false);
    });

    it('should not resume when not paused', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.resumeRecording();
      });

      expect(result.current.recordingState.isPaused).toBe(false);
    });
  });

  describe('Chunk Management', () => {
    const createTestChunk = (id: string) => ({
      id,
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      duration: 1,
      processedBlob: new Blob(['processed'], { type: 'audio/webm' }),
      originalBlob: new Blob(['original'], { type: 'audio/webm' }),
      processedUrl: `blob:processed-${id}`,
      originalUrl: `blob:original-${id}`,
      metrics: {
        averageNoiseReduction: 60,
        peakNoiseReduction: 80,
        averageLevel: 0.5,
      },
      isExpanded: false,
      isPlayingProcessed: false,
      isPlayingOriginal: false,
    });

    it('should add chunk', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk = createTestChunk('chunk-1');

      act(() => {
        result.current.addChunk(chunk);
      });

      expect(result.current.recordingState.chunks).toHaveLength(1);
      expect(result.current.recordingState.chunks[0]).toEqual(chunk);
    });

    it('should add multiple chunks', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk1 = createTestChunk('chunk-1');
      const chunk2 = createTestChunk('chunk-2');

      act(() => {
        result.current.addChunk(chunk1);
        result.current.addChunk(chunk2);
      });

      expect(result.current.recordingState.chunks).toHaveLength(2);
      expect(result.current.recordingState.chunks[0]).toEqual(chunk1);
      expect(result.current.recordingState.chunks[1]).toEqual(chunk2);
    });

    it('should toggle chunk expansion', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk = createTestChunk('chunk-1');

      act(() => {
        result.current.addChunk(chunk);
        result.current.toggleChunkExpansion('chunk-1');
      });

      expect(result.current.recordingState.chunks[0].isExpanded).toBe(true);

      act(() => {
        result.current.toggleChunkExpansion('chunk-1');
      });

      expect(result.current.recordingState.chunks[0].isExpanded).toBe(false);
    });

    it('should toggle chunk playback for processed audio', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk = createTestChunk('chunk-1');

      act(() => {
        result.current.addChunk(chunk);
        result.current.toggleChunkPlayback('chunk-1', true, 'processed');
      });

      expect(result.current.recordingState.chunks[0].isPlayingProcessed).toBe(true);
      expect(result.current.recordingState.chunks[0].isPlayingOriginal).toBe(false);

      act(() => {
        result.current.toggleChunkPlayback('chunk-1', false, 'processed');
      });

      expect(result.current.recordingState.chunks[0].isPlayingProcessed).toBe(false);
    });

    it('should toggle chunk playback for original audio', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk = createTestChunk('chunk-1');

      act(() => {
        result.current.addChunk(chunk);
        result.current.toggleChunkPlayback('chunk-1', true, 'original');
      });

      expect(result.current.recordingState.chunks[0].isPlayingOriginal).toBe(true);
      expect(result.current.recordingState.chunks[0].isPlayingProcessed).toBe(false);
    });

    it('should stop other playback when starting new playback', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk1 = createTestChunk('chunk-1');
      const chunk2 = createTestChunk('chunk-2');

      act(() => {
        result.current.addChunk(chunk1);
        result.current.addChunk(chunk2);
        
        // Start playing chunk 1 processed
        result.current.toggleChunkPlayback('chunk-1', true, 'processed');
      });

      expect(result.current.recordingState.chunks[0].isPlayingProcessed).toBe(true);

      act(() => {
        // Start playing chunk 2 original
        result.current.toggleChunkPlayback('chunk-2', true, 'original');
      });

      // Chunk 1 should stop playing
      expect(result.current.recordingState.chunks[0].isPlayingProcessed).toBe(false);
      expect(result.current.recordingState.chunks[1].isPlayingOriginal).toBe(true);
    });

    it('should handle toggling non-existent chunk', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.toggleChunkExpansion('non-existent');
        result.current.toggleChunkPlayback('non-existent', true, 'processed');
      });

      // Should not throw and state should remain unchanged
      expect(result.current.recordingState.chunks).toHaveLength(0);
    });

    it('should clear all recordings', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk1 = createTestChunk('chunk-1');
      const chunk2 = createTestChunk('chunk-2');

      act(() => {
        result.current.addChunk(chunk1);
        result.current.addChunk(chunk2);
        result.current.clearRecordings();
      });

      expect(result.current.recordingState.chunks).toHaveLength(0);
      expect(result.current.recordingState.recordingTime).toBe(0);
    });
  });

  describe('Recording Time', () => {
    it('should update recording time', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.updateRecordingTime(10);
      });

      expect(result.current.recordingState.recordingTime).toBe(10);
    });

    it('should reset recording time when stopping', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.updateRecordingTime(10);
        result.current.stopRecording();
      });

      expect(result.current.recordingState.recordingTime).toBe(0);
    });

    it('should preserve recording time when pausing', () => {
      const { result } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.updateRecordingTime(10);
        result.current.pauseRecording();
      });

      expect(result.current.recordingState.recordingTime).toBe(10);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across re-renders', () => {
      const { result, rerender } = renderHook(() => useRecordingState());

      act(() => {
        result.current.startRecording();
        result.current.updateRecordingTime(5);
      });

      rerender();

      expect(result.current.recordingState.isRecording).toBe(true);
      expect(result.current.recordingState.recordingTime).toBe(5);
    });

    it('should maintain chunks across state changes', () => {
      const { result } = renderHook(() => useRecordingState());
      const chunk = createTestChunk('chunk-1');

      act(() => {
        result.current.addChunk(chunk);
        result.current.startRecording();
        result.current.stopRecording();
      });

      expect(result.current.recordingState.chunks).toHaveLength(1);
      expect(result.current.recordingState.chunks[0]).toEqual(chunk);
    });
  });
});