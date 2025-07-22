import { useState, useCallback, useRef, useEffect } from 'react';
import { initializeAudioEngine, destroyEngine, getEngineStatus, getDiagnostics, onMetricsUpdate, } from '../../api';
import { getAudioConverter, destroyAudioConverter } from '../../utils/audioConverter';
export function useEngineLifecycle(options = {}) {
    const { autoInitialize = false, onInitError, config: defaultConfig } = options;
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [engineState, setEngineState] = useState('uninitialized');
    const [metrics, setMetrics] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const initializePromiseRef = useRef(null);
    const metricsUnsubscribeRef = useRef(null);
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
    const initialize = useCallback((config = defaultConfig) => {
        if (initializePromiseRef.current) {
            return initializePromiseRef.current;
        }
        if (isInitialized) {
            return Promise.resolve();
        }
        setIsLoading(true);
        setError(null);
        initializePromiseRef.current = (async () => {
            try {
                await initializeAudioEngine(config);
                // Set up metrics listener
                const unsubscribe = onMetricsUpdate((newMetrics) => {
                    setMetrics(newMetrics);
                });
                metricsUnsubscribeRef.current = unsubscribe ?? (() => { });
                // Initialize audio converter
                getAudioConverter();
                setIsInitialized(true);
                setEngineState('ready');
                // Update diagnostics after initialization
                updateDiagnostics();
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio engine';
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
    }, [defaultConfig, isInitialized, onInitError, updateDiagnostics]);
    const destroy = useCallback(async (force = false) => {
        if (!isInitialized) {
            return;
        }
        try {
            // Clean up event listeners
            if (metricsUnsubscribeRef.current) {
                metricsUnsubscribeRef.current();
                metricsUnsubscribeRef.current = null;
            }
            // Destroy audio converter
            destroyAudioConverter();
            await destroyEngine({ force });
            setIsInitialized(false);
            setEngineState('destroyed');
            setMetrics(null);
            setDiagnostics(null);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized]);
    const resetError = useCallback(() => {
        setError(null);
    }, []);
    // Auto-initialize
    useEffect(() => {
        if (autoInitialize && !isInitialized && !isLoading) {
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
        return () => {
            // Destroy audio converter to prevent memory leaks
            destroyAudioConverter();
            // Clean up metrics listener
            if (metricsUnsubscribeRef.current) {
                metricsUnsubscribeRef.current();
            }
        };
    }, []);
    return {
        isInitialized,
        isLoading,
        error,
        engineState,
        metrics,
        diagnostics,
        initialize,
        destroy,
        updateDiagnostics,
        resetError,
        setError,
    };
}
