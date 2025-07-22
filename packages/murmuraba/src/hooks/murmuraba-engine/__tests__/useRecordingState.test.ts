import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecordingState } from '../useRecordingState';
import { ProcessedChunk } from '../types';

describe('useRecordingState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRecordingState());
    
    expect(result.current.recordingState).toEqual({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      chunks: []
    });
  });

  it('should start recording', () => {
    const { result } = renderHook(() => useRecordingState());
    
    act(() => {
      result.current.startRecording();
    });
    
    expect(result.current.recordingState.isRecording).toBe(true);
    expect(result.current.recordingState.isPaused).toBe(false);
  });

  it('should pause and resume recording', () => {
    const { result } = renderHook(() => useRecordingState());
    
    act(() => {
      result.current.startRecording();
      result.current.pauseRecording();
    });
    
    expect(result.current.recordingState.isRecording).toBe(true);
    expect(result.current.recordingState.isPaused).toBe(true);
    
    act(() => {
      result.current.resumeRecording();
    });
    
    expect(result.current.recordingState.isRecording).toBe(true);
    expect(result.current.recordingState.isPaused).toBe(false);
  });

  it('should stop recording and reset state', () => {
    const { result } = renderHook(() => useRecordingState());
    
    act(() => {
      result.current.startRecording();
      result.current.stopRecording();
    });
    
    expect(result.current.recordingState.isRecording).toBe(false);
    expect(result.current.recordingState.isPaused).toBe(false);
    expect(result.current.recordingState.recordingTime).toBe(0);
  });

  it('should add chunk to recording', () => {
    const { result } = renderHook(() => useRecordingState());
    const mockChunk: ProcessedChunk = {
      id: 'chunk-1',
      timestamp: Date.now(),
      duration: 5,
      size: 1024,
      processedBlob: new Blob(),
      originalBlob: new Blob(),
      noiseReduction: 10,
      isPlaying: false,
      isExpanded: false
    };
    
    act(() => {
      result.current.addChunk(mockChunk);
    });
    
    expect(result.current.recordingState.chunks).toHaveLength(1);
    expect(result.current.recordingState.chunks[0]).toEqual(mockChunk);
  });

  it('should toggle chunk playback', () => {
    const { result } = renderHook(() => useRecordingState());
    const mockChunk: ProcessedChunk = {
      id: 'chunk-1',
      timestamp: Date.now(),
      duration: 5,
      size: 1024,
      processedBlob: new Blob(),
      originalBlob: new Blob(),
      noiseReduction: 10,
      isPlaying: false,
      isExpanded: false
    };
    
    act(() => {
      result.current.addChunk(mockChunk);
      result.current.toggleChunkPlayback('chunk-1', true);
    });
    
    expect(result.current.recordingState.chunks[0].isPlaying).toBe(true);
  });

  it('should clear all recordings', () => {
    const { result } = renderHook(() => useRecordingState());
    
    act(() => {
      result.current.addChunk({
        id: 'chunk-1',
        timestamp: Date.now(),
        duration: 5,
        size: 1024,
        processedBlob: new Blob(),
        originalBlob: new Blob(),
        noiseReduction: 10,
        isPlaying: false,
        isExpanded: false
      });
      result.current.clearRecordings();
    });
    
    expect(result.current.recordingState.chunks).toHaveLength(0);
  });

  it('should update recording time', () => {
    const { result } = renderHook(() => useRecordingState());
    
    act(() => {
      result.current.updateRecordingTime(123);
    });
    
    expect(result.current.recordingState.recordingTime).toBe(123);
  });
});