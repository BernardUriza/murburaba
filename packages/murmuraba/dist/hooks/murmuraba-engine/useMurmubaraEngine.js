import { useEffect, useRef, useState, useCallback } from 'react';
import { initializeAudioEngine, destroyEngine, processStream, processStreamChunked, getEngineStatus, getDiagnostics, onMetricsUpdate, processFile, } from '../../api';
import { destroyAudioConverter } from '../../utils/audioConverter';
import { AudioStreamManager } from '../../utils/AudioStreamManager';
// Import constants
import { LOG_PREFIX } from './constants';
/**
 * Main Murmuraba hook with medical-grade recording functionality
 * Refactored for better maintainability
 */
export function useMurmubaraEngine(options = {}) {
    const { autoInitialize = false, onInitError, ...config } = options;
    // State management
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [engineState, setEngineState] = useState('uninitialized');
    const [metrics, setMetrics] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const [streamController, setStreamController] = useState(null);
    // Stream management
    const audioContextRef = useRef(null);
    const streamManagerRef = useRef(null);
    // Other refs
    const metricsUnsubscribeRef = useRef(null);
    const initializePromiseRef = useRef(null);
    // Update diagnostics
    const updateDiagnostics = useCallback(() => {
        if (!isInitialized) {
            setDiagnostics(null);
            return null;
        }
        try {
            const diag = getDiagnostics();
            setDiagnostics(diag);
            return diag;
        }
        catch {
            return null;
        }
    }, [isInitialized]);
    // Fix race condition: Update diagnostics when isInitialized changes to true
    useEffect(() => {
        if (isInitialized && !diagnostics) {
            updateDiagnostics();
        }
    }, [isInitialized, diagnostics, updateDiagnostics]);
    // Initialize engine
    const initialize = useCallback(async () => {
        console.log(`🚀 ${LOG_PREFIX.LIFECYCLE} Initializing MurmubaraEngine...`);
        if (initializePromiseRef.current) {
            console.log(`⏳ ${LOG_PREFIX.LIFECYCLE} Already initializing, returning existing promise`);
            return initializePromiseRef.current;
        }
        if (isInitialized) {
            console.log(`✅ ${LOG_PREFIX.LIFECYCLE} Already initialized, skipping`);
            return;
        }
        setIsLoading(true);
        setError(null);
        initializePromiseRef.current = (async () => {
            try {
                console.log(`🔧 ${LOG_PREFIX.LIFECYCLE} Calling initializeAudioEngine with config:`, config);
                await initializeAudioEngine(config);
                // Initialize AudioContext and stream manager
                audioContextRef.current = new AudioContext({ sampleRate: 48000 });
                streamManagerRef.current = new AudioStreamManager(audioContextRef.current);
                // Set up metrics listener
                onMetricsUpdate((newMetrics) => {
                    setMetrics(newMetrics);
                });
                setIsInitialized(true);
                setEngineState('ready');
                console.log(`🎉 ${LOG_PREFIX.LIFECYCLE} Engine initialized successfully!`);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio engine';
                console.error(`❌ ${LOG_PREFIX.LIFECYCLE} Initialization failed:`, errorMessage);
                setError(errorMessage);
                setEngineState('error');
                if (onInitError) {
                    onInitError(err instanceof Error ? err : new Error(errorMessage));
                }
                throw err;
            }
            finally {
                setIsLoading(false);
                initializePromiseRef.current = null;
            }
        })();
        return initializePromiseRef.current;
    }, [config, isInitialized, onInitError]);
    // Destroy engine
    const destroy = useCallback(async (force = false) => {
        console.log(`🔥 ${LOG_PREFIX.LIFECYCLE} Destroying engine...`, { force });
        if (!isInitialized) {
            console.log(`⚠️ ${LOG_PREFIX.LIFECYCLE} Engine not initialized, skipping destroy`);
            return;
        }
        try {
            // Clean up event listeners
            if (metricsUnsubscribeRef.current) {
                metricsUnsubscribeRef.current();
                metricsUnsubscribeRef.current = null;
            }
            // Clean up streams
            if (streamManagerRef.current) {
                streamManagerRef.current.removeAllStreams();
                streamManagerRef.current = null;
            }
            // Clean up audio context
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                await audioContextRef.current.close();
                audioContextRef.current = null;
            }
            // CRITICAL: Destroy audio converter to prevent memory leaks
            destroyAudioConverter();
            await destroyEngine({ force });
            setIsInitialized(false);
            setEngineState('destroyed');
            setMetrics(null);
            setDiagnostics(null);
            console.log(`💀 ${LOG_PREFIX.LIFECYCLE} Engine destroyed successfully`);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized]);
    // Effects
    // Auto-initialize
    useEffect(() => {
        if (autoInitialize && !isInitialized && !isLoading) {
            console.log(`🤖 ${LOG_PREFIX.LIFECYCLE} Auto-initializing engine...`);
            initialize();
        }
    }, [autoInitialize, isInitialized, isLoading, initialize]);
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
        console.log(`🌟 ${LOG_PREFIX.LIFECYCLE} Component mounted, setting up cleanup handler`);
        return () => {
            console.log(`👋 ${LOG_PREFIX.LIFECYCLE} Component unmounting, cleaning up...`);
            // Clean up streams
            if (streamManagerRef.current) {
                streamManagerRef.current.removeAllStreams();
            }
            // Clean up audio context
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
            // CRITICAL: Destroy audio converter to prevent memory leaks
            destroyAudioConverter();
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
        // Actions
        initialize,
        destroy,
        processStream,
        processStreamChunked,
        processFile,
        // Utility
        getDiagnostics: updateDiagnostics,
        resetError: () => setError(null),
    };
}
