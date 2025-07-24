import { useState, useCallback } from 'react';
export function useRecordingState() {
    const [recordingState, setRecordingState] = useState({
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        chunks: []
    });
    const startRecording = useCallback(() => {
        setRecordingState(prev => ({
            ...prev,
            isRecording: true,
            isPaused: false,
            recordingTime: 0,
            chunks: []
        }));
    }, []);
    const stopRecording = useCallback(() => {
        setRecordingState(prev => ({
            ...prev,
            isRecording: false,
            isPaused: false,
            recordingTime: 0
        }));
    }, []);
    const pauseRecording = useCallback(() => {
        setRecordingState(prev => ({
            ...prev,
            isPaused: true
        }));
    }, []);
    const resumeRecording = useCallback(() => {
        setRecordingState(prev => ({
            ...prev,
            isPaused: false
        }));
    }, []);
    const addChunk = useCallback((chunk) => {
        setRecordingState(prev => ({
            ...prev,
            chunks: [...prev.chunks, chunk]
        }));
    }, []);
    const toggleChunkPlayback = useCallback((chunkId, isPlaying, audioType) => {
        setRecordingState(prev => ({
            ...prev,
            chunks: prev.chunks.map(chunk => chunk.id === chunkId
                ? {
                    ...chunk,
                    isPlaying,
                    currentlyPlayingType: isPlaying ? audioType : null
                }
                : {
                    ...chunk,
                    isPlaying: false, // Stop other chunks when starting new one
                    currentlyPlayingType: null
                })
        }));
    }, []);
    const toggleChunkExpansion = useCallback((chunkId) => {
        setRecordingState(prev => ({
            ...prev,
            chunks: prev.chunks.map(chunk => chunk.id === chunkId ? { ...chunk, isExpanded: !chunk.isExpanded } : chunk)
        }));
    }, []);
    const clearRecordings = useCallback(() => {
        setRecordingState(prev => ({
            ...prev,
            chunks: []
        }));
    }, []);
    const updateRecordingTime = useCallback((time) => {
        setRecordingState(prev => ({
            ...prev,
            recordingTime: time
        }));
    }, []);
    return {
        recordingState,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        addChunk,
        toggleChunkPlayback,
        toggleChunkExpansion,
        clearRecordings,
        updateRecordingTime
    };
}
