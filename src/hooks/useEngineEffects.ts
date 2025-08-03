import { useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { Logger } from '../core/services/Logger';

interface EngineConfig {
  [key: string]: any;
}

interface UseEngineEffectsProps {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  isDarkMode: boolean;
  engineConfig: EngineConfig;
  initialize: () => void;
}

export function useEngineEffects({
  isInitialized,
  isLoading,
  error,
  isDarkMode,
  engineConfig,
  initialize
}: UseEngineEffectsProps) {
  // CRITICAL FIX: Use refs to prevent stale closures and dependency loops
  const initializeRef = useRef(initialize);
  const engineConfigRef = useRef(engineConfig);
  const hasShownErrorRef = useRef(false);
  const hasInitializedRef = useRef(false);
  
  // Update refs on every render
  initializeRef.current = initialize;
  engineConfigRef.current = engineConfig;

  // CRITICAL FIX: Initialize engine only once with more specific conditions
  useEffect(() => {
    if (!isInitialized && !isLoading && !error && !hasInitializedRef.current) {
      console.log('useEngineEffects: Initializing engine...');
      hasInitializedRef.current = true;
      // Use setTimeout to break potential synchronous update cycles
      setTimeout(() => {
        initializeRef.current();
      }, 0);
    }
  }, [isInitialized, isLoading, error]);

  // Reset initialization flag when engine is destroyed
  useEffect(() => {
    if (!isInitialized && !isLoading && !error) {
      hasInitializedRef.current = false;
    }
  }, [isInitialized, isLoading, error]);

  // Apply dark mode - STABLE: no issues here
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // CRITICAL FIX: Save engine config with debouncing to prevent loops
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('murmuraba-config', JSON.stringify(engineConfigRef.current));
      } catch (error) {
        Logger.warn('Failed to save engine config to localStorage', { error });
      }
    }, 100); // Debounce config saves
    
    return () => clearTimeout(timeoutId);
  }, [engineConfig]);

  // CRITICAL FIX: Show initialization error only once to prevent loops
  useEffect(() => {
    if (error && error.includes('WASM') && !hasShownErrorRef.current) {
      hasShownErrorRef.current = true;
      Swal.fire({
        icon: 'error',
        title: 'Initialization Error',
        text: error,
        footer: 'Please refresh the page and try again'
      }).catch((swalError) => {
        Logger.error('Failed to show error dialog', { swalError });
      });
    }
    
    // Reset flag when error clears
    if (!error) {
      hasShownErrorRef.current = false;
    }
  }, [error]);
}