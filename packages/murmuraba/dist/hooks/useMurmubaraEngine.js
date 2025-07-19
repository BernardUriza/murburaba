import { useEffect, useRef, useState, useCallback } from 'react';
import { initializeAudioEngine, destroyEngine, processStream, processStreamChunked, getEngineStatus, getDiagnostics, onMetricsUpdate, } from '../api';
export function useMurmubaraEngine(options = {}) {
    const { autoInitialize = false, ...config } = options;
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [engineState, setEngineState] = useState('uninitialized');
    const [metrics, setMetrics] = useState(null);
    const [diagnostics, setDiagnostics] = useState(null);
    const metricsUnsubscribeRef = useRef(null);
    const initializePromiseRef = useRef(null);
    const initialize = useCallback(async () => {
        if (initializePromiseRef.current) {
            return initializePromiseRef.current;
        }
        if (isInitialized) {
            return;
        }
        setIsLoading(true);
        setError(null);
        initializePromiseRef.current = (async () => {
            try {
                await initializeAudioEngine(config);
                // Set up metrics listener
                onMetricsUpdate((newMetrics) => {
                    setMetrics(newMetrics);
                });
                setIsInitialized(true);
                setEngineState('ready');
                updateDiagnostics();
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                setEngineState('error');
                throw err;
            }
            finally {
                setIsLoading(false);
                initializePromiseRef.current = null;
            }
        })();
        return initializePromiseRef.current;
    }, [config, isInitialized]);
    const destroy = useCallback(async (force = false) => {
        if (!isInitialized) {
            return;
        }
        try {
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
    }, [isInitialized]);
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
    }, [isInitialized]);
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
    const resetError = useCallback(() => {
        setError(null);
    }, []);
    // Auto-initialize if requested
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
            if (isInitialized) {
                destroy(true).catch(console.error);
            }
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
        processStream: processStreamWrapper,
        processStreamChunked: processStreamChunkedWrapper,
        // Utility
        getDiagnostics: updateDiagnostics,
        resetError,
    };
}
