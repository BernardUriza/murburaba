import { useEffect } from 'react';
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
  // Initialize engine on mount - removed initialize from deps to prevent loop
  useEffect(() => {
    if (!isInitialized && !isLoading && !error) {
      initialize();
    }
  }, [isInitialized, isLoading, error]);

  // Apply dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // Save engine config to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('murmuraba-config', JSON.stringify(engineConfig));
    } catch (error) {
      Logger.warn('Failed to save engine config to localStorage', { error });
    }
  }, [engineConfig]);

  // Show initialization error if any
  useEffect(() => {
    if (error && error.includes('WASM')) {
      Swal.fire({
        icon: 'error',
        title: 'Initialization Error',
        text: error,
        footer: 'Please refresh the page and try again'
      }).catch((swalError) => {
        Logger.error('Failed to show error dialog', { swalError });
      });
    }
  }, [error]);
}