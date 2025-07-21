import { useEffect, useRef, useCallback, useReducer, useMemo } from 'react';
import { engineReducer, initialState } from './engineReducer';
import { initializeAudioEngine, destroyEngine, processStreamChunked, onMetricsUpdate, } from '../api';
import { getAudioConverter } from '../utils/audioConverter';
import { debounce } from '../utils/performance';
const TIMER_UPDATE_INTERVAL = 1000; // Update every second instead of 100ms
export function useMurmubaraEngineOptimized(config = {}) {
    const { autoInitialize = true, defaultChunkDuration = 5, fallbackToManual = true, onInitError, react19Mode = false, ...engineConfig } = config;
    // Single state reducer instead of 15 separate states
    const [state, dispatch] = useReducer(engineReducer, initialState);
    // Refs for non-reactive data
    const audioRefs = useRef(new WeakMap());
    const chunkRecordingsRef = useRef(new Map());
    const metricsCleanupRef = useRef(null);
    const timerRef = useRef(null);
    const processedRecorderRef = useRef(null);
    const originalRecorderRef = useRef(null);
    const originalStreamRef = useRef(null);
    const audioConverterRef = useRef(null);
    // Debounced timer update to reduce re-renders
    const updateRecordingTime = useMemo(() => debounce((time) => {
        dispatch({ type: 'UPDATE_RECORDING_TIME', payload: { time } });
    }, TIMER_UPDATE_INTERVAL), []);
    // Memoized recording state to prevent object recreation
    const recordingState = useMemo(() => ({
        isRecording: state.isRecording,
        isPaused: state.isPaused,
        recordingTime: state.recordingTime,
        chunks: state.chunks,
    }), [state.isRecording, state.isPaused, state.recordingTime, state.chunks]);
    // Memoized average noise reduction
    const averageNoiseReduction = useMemo(() => {
        if (state.chunks.length === 0)
            return 0;
        const total = state.chunks.reduce((acc, chunk) => acc + chunk.noiseRemoved, 0);
        return Math.round(total / state.chunks.length);
    }, [state.chunks]);
    // Initialize audio converter once
    useEffect(() => {
        audioConverterRef.current = getAudioConverter();
    }, []);
    // Initialize engine
    const initialize = useCallback(async () => {
        if (state.isInitialized || state.isLoading)
            return;
        dispatch({ type: 'INIT_START' });
        try {
            const finalConfig = {
                debugMode: false,
                allowDegraded: fallbackToManual,
                workerPath: '/js/audio-worklet-processor.js',
                ...engineConfig,
            };
            const result = await initializeAudioEngine(finalConfig);
            if (!result.isInitialized) {
                throw new Error(result.error || 'Failed to initialize audio engine');
            }
            dispatch({
                type: 'INIT_SUCCESS',
                payload: { engineState: result.state }
            });
            // Set up metrics listener with cleanup
            const cleanup = onMetricsUpdate((metrics) => {
                dispatch({ type: 'SET_METRICS', payload: { metrics } });
            });
            metricsCleanupRef.current = cleanup;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
            dispatch({ type: 'INIT_ERROR', payload: { error: errorMessage } });
            if (onInitError) {
                onInitError(error instanceof Error ? error : new Error(errorMessage));
            }
        }
    }, [state.isInitialized, state.isLoading, engineConfig, fallbackToManual, onInitError]);
    // Destroy engine with proper cleanup
    const destroy = useCallback(async (force = false) => {
        if (!state.isInitialized && !force)
            return;
        // Clean up all resources
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (metricsCleanupRef.current) {
            metricsCleanupRef.current();
            metricsCleanupRef.current = null;
        }
        // Revoke all blob URLs
        state.chunks.forEach(chunk => {
            if (chunk.processedAudioUrl)
                URL.revokeObjectURL(chunk.processedAudioUrl);
            if (chunk.originalAudioUrl)
                URL.revokeObjectURL(chunk.originalAudioUrl);
        });
        // Stop all streams
        if (state.currentStream) {
            state.currentStream.getTracks().forEach(track => track.stop());
        }
        if (originalStreamRef.current) {
            originalStreamRef.current.getTracks().forEach(track => track.stop());
        }
        await destroyEngine(force);
        dispatch({ type: 'RESET' });
    }, [state.isInitialized, state.chunks, state.currentStream]);
    // Start recording with optimized chunking
    const startRecording = useCallback(async (chunkDuration = defaultChunkDuration) => {
        if (!state.isInitialized || state.isRecording)
            return;
        try {
            dispatch({ type: 'SET_LOADING', payload: { loading: true } });
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: true,
                    sampleRate: 48000,
                }
            });
            const originalStream = stream.clone();
            originalStreamRef.current = originalStream;
            // Clear previous recordings
            chunkRecordingsRef.current.clear();
            // Start processing with chunking
            const controller = await processStreamChunked(stream, {
                chunkDuration,
                onChunkProcessed: (chunk) => {
                    // Handle chunk in callback to avoid state updates
                    handleChunkProcessed(chunk);
                }
            });
            dispatch({
                type: 'SET_STREAM',
                payload: { stream, controller }
            });
            dispatch({ type: 'START_RECORDING' });
            // Start timer with debounced updates
            let seconds = 0;
            timerRef.current = window.setInterval(() => {
                seconds++;
                updateRecordingTime(seconds);
            }, 1000);
            // Start fake streaming cycles
            startFakeStreamingCycle(stream, originalStream, chunkDuration * 1000);
        }
        catch (error) {
            console.error('Failed to start recording:', error);
            dispatch({
                type: 'SET_ERROR',
                payload: { error: error instanceof Error ? error.message : 'Failed to start recording' }
            });
        }
        finally {
            dispatch({ type: 'SET_LOADING', payload: { loading: false } });
        }
    }, [state.isInitialized, state.isRecording, defaultChunkDuration, updateRecordingTime]);
    // Optimized chunk processing
    const handleChunkProcessed = useCallback((chunk) => {
        const processedChunk = {
            ...chunk,
            id: chunk.chunkIndex.toString(),
            isPlaying: false,
            isExpanded: false,
            isValid: true,
        };
        dispatch({ type: 'ADD_CHUNK', payload: { chunk: processedChunk } });
    }, []);
    // Stop recording with cleanup
    const stopRecording = useCallback(() => {
        if (!state.isRecording)
            return;
        // Stop timer
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        // Stop recorders
        if (processedRecorderRef.current?.state === 'recording') {
            processedRecorderRef.current.stop();
        }
        if (originalRecorderRef.current?.state === 'recording') {
            originalRecorderRef.current.stop();
        }
        // Stop stream controller
        if (state.streamController) {
            state.streamController.stop();
        }
        dispatch({ type: 'STOP_RECORDING' });
    }, [state.isRecording, state.streamController]);
    // Optimized playback with audio pooling
    const toggleChunkPlayback = useCallback(async (chunkId, audioType) => {
        const chunk = state.chunks.find(c => c.id === chunkId);
        if (!chunk)
            return;
        const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl;
        if (!audioUrl)
            return;
        // Get or create audio element from pool
        let audio = audioRefs.current.get(chunk);
        if (!audio) {
            audio = new Audio(audioUrl);
            audioRefs.current.set(chunk, audio);
            audio.addEventListener('ended', () => {
                dispatch({
                    type: 'UPDATE_CHUNK',
                    payload: { id: chunkId, updates: { isPlaying: false } }
                });
            });
        }
        if (chunk.isPlaying) {
            audio.pause();
            audio.currentTime = 0;
        }
        else {
            // Stop all other audio
            state.chunks.forEach(c => {
                const otherAudio = audioRefs.current.get(c);
                if (otherAudio && c.id !== chunkId) {
                    otherAudio.pause();
                    otherAudio.currentTime = 0;
                }
            });
            await audio.play();
        }
        dispatch({ type: 'TOGGLE_CHUNK_PLAYBACK', payload: { id: chunkId } });
    }, [state.chunks]);
    // Auto-initialize effect
    useEffect(() => {
        if (autoInitialize && !state.isInitialized && !state.isLoading && !state.error) {
            initialize();
        }
    }, [autoInitialize, state.isInitialized, state.isLoading, state.error, initialize]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            destroy(true);
        };
    }, []);
    // Return optimized API
    return {
        // State
        isInitialized: state.isInitialized,
        isLoading: state.isLoading,
        error: state.error,
        engineState: state.engineState,
        metrics: state.metrics,
        diagnostics: state.diagnostics,
        // Recording State (memoized)
        recordingState,
        currentStream: state.currentStream,
        streamController: state.streamController,
        // Actions
        initialize,
        destroy,
        startRecording,
        stopRecording,
        pauseRecording: useCallback(() => dispatch({ type: 'PAUSE_RECORDING' }), []),
        resumeRecording: useCallback(() => dispatch({ type: 'RESUME_RECORDING' }), []),
        clearRecordings: useCallback(() => dispatch({ type: 'CLEAR_CHUNKS' }), []),
        toggleChunkPlayback,
        toggleChunkExpansion: useCallback((id) => dispatch({ type: 'TOGGLE_CHUNK_EXPANSION', payload: { id } }), []),
        // Utility
        getDiagnostics: useCallback(() => state.diagnostics, [state.diagnostics]),
        resetError: useCallback(() => dispatch({ type: 'SET_ERROR', payload: { error: null } }), []),
        formatTime: useCallback((seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }, []),
        getAverageNoiseReduction: useCallback(() => averageNoiseReduction, [averageNoiseReduction]),
        // Export functions will be added next...
    };
}
// Placeholder for fake streaming function
function startFakeStreamingCycle(stream, originalStream, duration) {
    // Implementation will be added in the actual file
}
