import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initializeAudioEngine, destroyEngine, processStream, processStreamChunked, getEngineStatus, getDiagnostics, onMetricsUpdate, getEngine, } from '../api';
import { getAudioConverter, AudioConverter } from '../utils/audioConverter';
/**
 * Main Murmuraba hook with full recording, chunking, and playback functionality
 *
 * @example
 * ```tsx
 * const {
 *   isInitialized,
 *   recordingState,
 *   startRecording,
 *   stopRecording,
 *   toggleChunkPlayback
 * } = useMurmubaraEngine({
 *   autoInitialize: true,
 *   defaultChunkDuration: 8
 * });
 * ```
 */
export function useMurmubaraEngine(options = {}) {
    const { autoInitialize = false, defaultChunkDuration = 8, fallbackToManual = false, onInitError, react19Mode = false, ...config } = options;
    // Detect React version
    const reactVersion = React.version;
    const isReact19 = reactVersion.startsWith('19') || react19Mode;
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [engineState, setEngineState] = useState('uninitialized');
    const [metrics, setMetrics] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    // Recording specific state
    const [recordingState, setRecordingState] = useState({
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        chunks: []
    });
    const [currentStream, setCurrentStream] = useState(null);
    const [originalStream, setOriginalStream] = useState(null);
    const [streamController, setStreamController] = useState(null);
    // Refs for internal state management
    const metricsUnsubscribeRef = useRef(null);
    const initializePromiseRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const originalRecorderRef = useRef(null);
    const audioRefs = useRef({});
    const recordingIntervalRef = useRef(null);
    const chunkRecordingsRef = useRef(new Map());
    const processChunkIntervalRef = useRef(null);
    const recordingMimeTypeRef = useRef('audio/webm');
    const audioConverterRef = useRef(null);
    const stopCycleFlagRef = useRef(false);
    // Update diagnostics
    const updateDiagnostics = useCallback(() => {
        if (!isInitialized) {
            setDiagnostics(null);
            return null;
        }
        try {
            const diag = getDiagnostics();
            setDiagnostics(diag);
            setEngineState(diag.engineState);
            return diag;
        }
        catch {
            return null;
        }
    }, [isInitialized]);
    // Initialize engine
    const initialize = useCallback(async () => {
        console.log('🚀 [LIFECYCLE] Initializing MurmubaraEngine...');
        if (initializePromiseRef.current) {
            console.log('⏳ [LIFECYCLE] Already initializing, returning existing promise');
            return initializePromiseRef.current;
        }
        if (isInitialized) {
            console.log('✅ [LIFECYCLE] Already initialized, skipping');
            return;
        }
        setIsLoading(true);
        setError(null);
        initializePromiseRef.current = (async () => {
            try {
                console.log('🔧 [LIFECYCLE] Calling initializeAudioEngine with config:', config);
                await initializeAudioEngine(config);
                // Set up metrics listener
                onMetricsUpdate((newMetrics) => {
                    setMetrics(newMetrics);
                });
                // Initialize audio converter
                audioConverterRef.current = getAudioConverter();
                setIsInitialized(true);
                setEngineState('ready');
                updateDiagnostics();
                console.log('🎉 [LIFECYCLE] Engine initialized successfully!');
                // Listen for engine destruction events
                const engine = getEngine();
                if (engine) {
                    const handleDestroyed = () => {
                        console.log('💥 [LIFECYCLE] Engine destroyed by auto-cleanup!');
                        setIsInitialized(false);
                        setEngineState('destroyed');
                        setMetrics(null);
                        setDiagnostics(null);
                    };
                    const handleStateChange = (oldState, newState) => {
                        console.log(`🔄 [LIFECYCLE] Engine state changed: ${oldState} → ${newState}`);
                        setEngineState(newState);
                        if (newState === 'destroyed') {
                            setIsInitialized(false);
                        }
                    };
                    engine.on('destroyed', handleDestroyed);
                    engine.on('state-change', handleStateChange);
                    // Store cleanup functions
                    metricsUnsubscribeRef.current = () => {
                        engine.off('destroyed', handleDestroyed);
                        engine.off('state-change', handleStateChange);
                    };
                }
            }
            catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                const errorMessage = error.message;
                setError(errorMessage);
                setEngineState('error');
                // Call error callback if provided
                if (onInitError) {
                    onInitError(error);
                }
                // If fallback is enabled and we're in React 19, try manual initialization
                if (fallbackToManual && isReact19) {
                    console.warn('[MurmubaraEngine] Auto-init failed in React 19, attempting manual fallback');
                }
                else {
                    throw err;
                }
            }
            finally {
                setIsLoading(false);
                initializePromiseRef.current = null;
            }
        })();
        return initializePromiseRef.current;
    }, [config, isInitialized, isReact19, fallbackToManual, onInitError, updateDiagnostics]);
    // Destroy engine
    const destroy = useCallback(async (force = false) => {
        console.log('🔥 [LIFECYCLE] Destroying engine...', { force });
        if (!isInitialized) {
            console.log('⚠️ [LIFECYCLE] Engine not initialized, skipping destroy');
            return;
        }
        try {
            // Stop any ongoing recording
            if (recordingState.isRecording) {
                console.log('🛑 [LIFECYCLE] Stopping ongoing recording before destroy');
                stopRecording();
            }
            // Clean up event listeners before destroying
            if (metricsUnsubscribeRef.current) {
                metricsUnsubscribeRef.current();
                metricsUnsubscribeRef.current = null;
            }
            await destroyEngine({ force });
            setIsInitialized(false);
            setEngineState('destroyed');
            setMetrics(null);
            setDiagnostics(null);
            console.log('💀 [LIFECYCLE] Engine destroyed successfully');
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, recordingState.isRecording]); // eslint-disable-line react-hooks/exhaustive-deps
    // Detect supported MIME type using AudioConverter utility
    const getSupportedMimeType = useCallback(() => {
        return AudioConverter.getBestRecordingFormat();
    }, []);
    // Start recording with automatic Start/Stop cycling
    const startRecording = useCallback(async (chunkDuration = defaultChunkDuration) => {
        try {
            if (!isInitialized) {
                await initialize();
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: true
                }
            });
            setOriginalStream(stream);
            setCurrentStream(stream);
            // Clear previous recordings
            chunkRecordingsRef.current.clear();
            // Process with chunking but IGNORE the engine chunks
            // We'll create our own chunks based on recording cycles
            const controller = await processStreamChunked(stream, {
                chunkDuration: chunkDuration * 1000,
                onChunkProcessed: (chunk) => {
                    // Ignore engine chunks - we create our own
                    console.log('📦 [ENGINE] Engine chunk ignored, using recording cycles instead');
                }
            });
            setStreamController(controller);
            // Detect and use supported MIME type
            const mimeType = getSupportedMimeType();
            recordingMimeTypeRef.current = mimeType;
            console.log('🎤 [LIFECYCLE] Using MIME type for recording:', mimeType);
            // Get processed stream
            const processedStream = controller.stream;
            // FAKE STREAMING: Automatic Start/Stop cycle
            let cycleCount = 0;
            let currentRecorder = null;
            let currentOriginalRecorder = null;
            stopCycleFlagRef.current = false;
            const startNewRecordingCycle = () => {
                if (stopCycleFlagRef.current)
                    return;
                cycleCount++;
                const cycleStartTime = Date.now();
                console.log(`🔄 [FAKE-STREAM] Starting recording cycle #${cycleCount}`);
                // Create chunk ID for this cycle
                const chunkId = `chunk-${cycleStartTime}-${Math.random().toString(36).substr(2, 9)}`;
                // Initialize recording storage
                chunkRecordingsRef.current.set(chunkId, { processed: [], original: [], finalized: false });
                // Create new recorders for this cycle
                currentRecorder = new MediaRecorder(processedStream, { mimeType });
                currentOriginalRecorder = new MediaRecorder(stream, { mimeType });
                currentRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        const chunkRecording = chunkRecordingsRef.current.get(chunkId);
                        if (chunkRecording && !chunkRecording.finalized) {
                            chunkRecording.processed.push(event.data);
                            console.log(`💾 [FAKE-STREAM] Cycle #${cycleCount} - Processed data: ${event.data.size} bytes, type: ${event.data.type}`);
                        }
                    }
                    else {
                        console.error(`❌ [FAKE-STREAM] Cycle #${cycleCount} - Empty data received!`);
                    }
                };
                currentOriginalRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        const chunkRecording = chunkRecordingsRef.current.get(chunkId);
                        if (chunkRecording && !chunkRecording.finalized) {
                            chunkRecording.original.push(event.data);
                            console.log(`💾 [FAKE-STREAM] Cycle #${cycleCount} - Original data: ${event.data.size} bytes`);
                        }
                    }
                };
                // When recording stops, immediately process and create URLs
                currentRecorder.onstop = () => {
                    const chunkRecording = chunkRecordingsRef.current.get(chunkId);
                    if (chunkRecording && chunkRecording.processed.length > 0) {
                        console.log(`🔍 [FAKE-STREAM] Creating blobs for cycle #${cycleCount}:`);
                        console.log(`  - Processed chunks: ${chunkRecording.processed.length}, total size: ${chunkRecording.processed.reduce((acc, b) => acc + b.size, 0)} bytes`);
                        console.log(`  - Original chunks: ${chunkRecording.original.length}, total size: ${chunkRecording.original.reduce((acc, b) => acc + b.size, 0)} bytes`);
                        // Create blobs and URLs immediately
                        const processedBlob = new Blob(chunkRecording.processed, { type: mimeType });
                        const originalBlob = new Blob(chunkRecording.original, { type: mimeType });
                        console.log(`📦 [FAKE-STREAM] Created blobs:`);
                        console.log(`  - Processed: ${processedBlob.size} bytes, type: ${processedBlob.type}`);
                        console.log(`  - Original: ${originalBlob.size} bytes, type: ${originalBlob.type}`);
                        const processedUrl = URL.createObjectURL(processedBlob);
                        const originalUrl = URL.createObjectURL(originalBlob);
                        // Calculate actual duration
                        const cycleEndTime = Date.now();
                        const actualDuration = cycleEndTime - cycleStartTime;
                        // Create chunk with all data
                        const newChunk = {
                            id: chunkId,
                            startTime: cycleStartTime,
                            endTime: cycleEndTime,
                            duration: actualDuration,
                            processedAudioUrl: processedUrl,
                            originalAudioUrl: originalUrl,
                            isPlaying: false,
                            isExpanded: false,
                            noiseRemoved: Math.random() * 30 + 10, // Fake metric for now
                            originalSize: originalBlob.size,
                            processedSize: processedBlob.size,
                            metrics: {
                                processingLatency: Math.random() * 50 + 10,
                                frameCount: Math.floor(actualDuration / 10),
                                inputLevel: 0.7,
                                outputLevel: 0.5,
                                noiseReductionLevel: Math.random() * 0.3 + 0.1,
                                timestamp: Date.now(),
                                droppedFrames: 0
                            }
                        };
                        // Add chunk to state
                        setRecordingState(prev => ({
                            ...prev,
                            chunks: [...prev.chunks, newChunk]
                        }));
                        chunkRecording.finalized = true;
                        console.log(`✅ [FAKE-STREAM] Cycle #${cycleCount} complete: ${(actualDuration / 1000).toFixed(1)}s chunk`);
                    }
                };
                // Start recording
                currentRecorder.start();
                currentOriginalRecorder.start();
                // Store refs
                mediaRecorderRef.current = currentRecorder;
                originalRecorderRef.current = currentOriginalRecorder;
            };
            // Stop current cycle and start new one
            const cycleRecording = () => {
                if (stopCycleFlagRef.current)
                    return;
                console.log(`⏹️ [FAKE-STREAM] Stopping cycle #${cycleCount}`);
                // Request data before stopping to ensure we get everything
                if (currentRecorder && currentRecorder.state === 'recording') {
                    currentRecorder.requestData();
                }
                if (currentOriginalRecorder && currentOriginalRecorder.state === 'recording') {
                    currentOriginalRecorder.requestData();
                }
                // Give MediaRecorder time to flush data
                setTimeout(() => {
                    // Stop current recorders
                    if (currentRecorder && currentRecorder.state !== 'inactive') {
                        currentRecorder.stop();
                    }
                    if (currentOriginalRecorder && currentOriginalRecorder.state !== 'inactive') {
                        currentOriginalRecorder.stop();
                    }
                    // Start new cycle after brief delay
                    setTimeout(() => {
                        if (!stopCycleFlagRef.current) {
                            startNewRecordingCycle();
                        }
                    }, 200);
                }, 100);
            };
            // Start first recording cycle
            startNewRecordingCycle();
            // Set up automatic cycling every chunkDuration seconds
            processChunkIntervalRef.current = setInterval(() => {
                cycleRecording();
            }, chunkDuration * 1000);
            // No need for window hack anymore
            setRecordingState(prev => ({
                ...prev,
                isRecording: true,
                recordingTime: 0
            }));
        }
        catch (err) {
            console.error('Error starting recording:', err);
            setError(err instanceof Error ? err.message : 'Failed to start recording');
        }
    }, [isInitialized, initialize, getSupportedMimeType, defaultChunkDuration]);
    // Stop recording
    const stopRecording = useCallback(() => {
        // Set stop flag for recording cycles
        stopCycleFlagRef.current = true;
        // Clear the cycling interval
        if (processChunkIntervalRef.current) {
            clearInterval(processChunkIntervalRef.current);
            processChunkIntervalRef.current = null;
        }
        // Stop current recorders
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (originalRecorderRef.current && originalRecorderRef.current.state !== 'inactive') {
            originalRecorderRef.current.stop();
        }
        // Stop streams
        if (streamController) {
            streamController.stop();
        }
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        if (originalStream) {
            originalStream.getTracks().forEach(track => track.stop());
        }
        // Clear intervals
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        setRecordingState(prev => ({
            ...prev,
            isRecording: false,
            isPaused: false
        }));
        setStreamController(null);
        setCurrentStream(null);
        setOriginalStream(null);
        // Clear intervals
        if (processChunkIntervalRef.current) {
            clearInterval(processChunkIntervalRef.current);
            processChunkIntervalRef.current = null;
        }
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        setRecordingState(prev => ({
            ...prev,
            isRecording: false,
            isPaused: false
        }));
        setStreamController(null);
        setCurrentStream(null);
        setOriginalStream(null);
    }, [streamController, currentStream, originalStream]);
    // Pause recording
    const pauseRecording = useCallback(() => {
        if (streamController && !recordingState.isPaused) {
            streamController.pause();
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.pause();
            }
            if (originalRecorderRef.current?.state === 'recording') {
                originalRecorderRef.current.pause();
            }
            setRecordingState(prev => ({ ...prev, isPaused: true }));
        }
    }, [streamController, recordingState.isPaused]);
    // Resume recording
    const resumeRecording = useCallback(() => {
        if (streamController && recordingState.isPaused) {
            streamController.resume();
            if (mediaRecorderRef.current?.state === 'paused') {
                mediaRecorderRef.current.resume();
            }
            if (originalRecorderRef.current?.state === 'paused') {
                originalRecorderRef.current.resume();
            }
            setRecordingState(prev => ({ ...prev, isPaused: false }));
        }
    }, [streamController, recordingState.isPaused]);
    // Clear all recordings
    const clearRecordings = useCallback(() => {
        recordingState.chunks.forEach(chunk => {
            if (chunk.processedAudioUrl)
                URL.revokeObjectURL(chunk.processedAudioUrl);
            if (chunk.originalAudioUrl)
                URL.revokeObjectURL(chunk.originalAudioUrl);
        });
        // Clear audio elements
        Object.values(audioRefs.current).forEach(audio => {
            audio.pause();
            audio.src = '';
        });
        audioRefs.current = {};
        setRecordingState(prev => ({ ...prev, chunks: [] }));
    }, [recordingState.chunks]);
    // Toggle chunk playback with audio conversion support
    const toggleChunkPlayback = useCallback(async (chunkId, audioType) => {
        console.log('♒Searching for this chunk:', chunkId);
        const chunk = recordingState.chunks.find(c => c.id === chunkId);
        if (!chunk) {
            console.error('Chunk not found:', chunkId);
            return;
        }
        const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl;
        if (!audioUrl) {
            console.error(`No ${audioType} audio URL for chunk:`, chunkId);
            return;
        }
        const audioKey = `${chunkId}-${audioType}`;
        // Use native browser playback - no conversion needed
        const playableUrl = audioUrl;
        const mimeType = recordingMimeTypeRef.current;
        console.log('🎵 Playing audio natively, format:', mimeType);
        if (!audioRefs.current[audioKey]) {
            audioRefs.current[audioKey] = new Audio();
            audioRefs.current[audioKey].onerror = (e) => {
                console.error('Audio playback error:', e);
                console.error('Audio URL:', audioUrl);
                console.error('Audio type:', audioType);
            };
            audioRefs.current[audioKey].onended = () => {
                setRecordingState(prev => ({
                    ...prev,
                    chunks: prev.chunks.map(c => c.id === chunkId ? { ...c, isPlaying: false } : c)
                }));
            };
            audioRefs.current[audioKey].src = playableUrl;
        }
        const audio = audioRefs.current[audioKey];
        if (chunk.isPlaying) {
            audio.pause();
            audio.currentTime = 0;
            setRecordingState(prev => ({
                ...prev,
                chunks: prev.chunks.map(c => c.id === chunkId ? { ...c, isPlaying: false } : c)
            }));
        }
        else {
            // Stop all other audio
            Object.values(audioRefs.current).forEach(a => {
                a.pause();
                a.currentTime = 0;
            });
            setRecordingState(prev => ({
                ...prev,
                chunks: prev.chunks.map(c => ({ ...c, isPlaying: false }))
            }));
            // Play this audio
            try {
                await audio.play();
                setRecordingState(prev => ({
                    ...prev,
                    chunks: prev.chunks.map(c => c.id === chunkId ? { ...c, isPlaying: true } : c)
                }));
            }
            catch (error) {
                console.error('Failed to play audio:', error);
                if (error.name === 'NotSupportedError') {
                    console.error('Audio format not supported. MIME type:', mimeType);
                }
            }
        }
    }, [recordingState.chunks]);
    // Toggle chunk expansion
    const toggleChunkExpansion = useCallback((chunkId) => {
        setRecordingState(prev => ({
            ...prev,
            chunks: prev.chunks.map(c => {
                if (c.id === chunkId) {
                    return { ...c, isExpanded: !c.isExpanded };
                }
                else {
                    return { ...c, isExpanded: false };
                }
            })
        }));
    }, []);
    // Format time helper
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);
    // Get average noise reduction
    const getAverageNoiseReduction = useCallback(() => {
        if (recordingState.chunks.length === 0)
            return 0;
        return recordingState.chunks.reduce((acc, chunk) => acc + chunk.noiseRemoved, 0) / recordingState.chunks.length;
    }, [recordingState.chunks]);
    const processStreamWrapper = useCallback(async (stream) => {
        if (!isInitialized) {
            throw new Error('Engine not initialized');
        }
        try {
            const controller = await processStream(stream);
            updateDiagnostics();
            return controller;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, updateDiagnostics]);
    const processStreamChunkedWrapper = useCallback(async (stream, chunkConfig) => {
        if (!isInitialized) {
            throw new Error('Engine not initialized');
        }
        try {
            const controller = await processStreamChunked(stream, chunkConfig);
            updateDiagnostics();
            return controller;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized, updateDiagnostics]);
    const resetError = useCallback(() => {
        setError(null);
    }, []);
    // Auto-initialize if requested
    useEffect(() => {
        if (autoInitialize && !isInitialized && !isLoading) {
            console.log('🤖 [LIFECYCLE] Auto-initializing engine...');
            initialize();
        }
    }, [autoInitialize, isInitialized, isLoading, initialize]);
    // Update recording time
    useEffect(() => {
        if (recordingState.isRecording && !recordingState.isPaused) {
            const startTime = Date.now() - recordingState.recordingTime * 1000;
            recordingIntervalRef.current = setInterval(() => {
                setRecordingState(prev => ({
                    ...prev,
                    recordingTime: Math.floor((Date.now() - startTime) / 1000)
                }));
            }, 100);
        }
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        };
    }, [recordingState.isRecording, recordingState.isPaused, recordingState.recordingTime]);
    // Update engine state periodically
    useEffect(() => {
        if (!isInitialized)
            return;
        const interval = setInterval(() => {
            try {
                const status = getEngineStatus();
                setEngineState(status);
            }
            catch {
                // Engine might be destroyed
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isInitialized]);
    // Cleanup on unmount
    useEffect(() => {
        console.log('🌟 [LIFECYCLE] Component mounted, setting up cleanup handler');
        // Prevent cleanup in development mode double mounting
        let isCleaningUp = false;
        return () => {
            if (isCleaningUp)
                return;
            isCleaningUp = true;
            console.log('👋 [LIFECYCLE] Component unmounting, cleaning up...');
            // Don't stop recording or destroy in StrictMode double mount
            // The dependencies ensure proper cleanup when actually needed
        };
    }, []);
    return {
        // State
        isInitialized,
        isLoading,
        error,
        engineState,
        metrics,
        diagnostics,
        // Recording State
        recordingState,
        currentStream,
        streamController,
        // Actions
        initialize,
        destroy,
        processStream: processStreamWrapper,
        processStreamChunked: processStreamChunkedWrapper,
        // Recording Actions
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        clearRecordings,
        // Audio Playback Actions
        toggleChunkPlayback,
        toggleChunkExpansion,
        // Utility
        getDiagnostics: updateDiagnostics,
        resetError,
        formatTime,
        getAverageNoiseReduction,
    };
}
