import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DIContainer, TOKENS } from '../core/DIContainer';
// import { MurmubaraEngineFactory } from '../core/MurmubaraEngineFactory';
import { ServiceLoader, SERVICE_MODULES } from '../core/ServiceLoader';
import { AudioProcessorService } from '../services/AudioProcessorService';
import { MurmubaraConfig } from '../types';
import { ILogger, IAudioProcessor } from '../core/interfaces';
import { engineRegistry } from '../core/EngineRegistry';
import { logging } from '../managers/LoggingManager';

// Re-export TOKENS for external use
export { TOKENS };

// Extended tokens for suite services
const SUITE_TOKENS = {
  ...TOKENS,
  AudioProcessor: Symbol('AudioProcessor'),
  ServiceLoader: Symbol('ServiceLoader'),
} as const;

interface MurmurabaSuiteConfig extends MurmubaraConfig {
  services?: {
    audioProcessor?: boolean;
    metricsManager?: boolean;
    workerManager?: boolean;
  };
  lazy?: boolean;
  allowDegraded?: boolean;
  children?: ReactNode;
  initTimeout?: number; // Timeout in milliseconds for engine initialization
  onUserInteraction?: () => void; // Callback to resume AudioContext on user interaction
}

interface MurmurabaSuiteContextValue {
  container: DIContainer;
  isReady: boolean;
  error: Error | null;
  getService: <T>(token: symbol | string) => T | null;
  loadService: (name: string) => Promise<void>;
  reinitializeEngine: () => Promise<void>;
}

const MurmurabaSuiteContext = createContext<MurmurabaSuiteContextValue | null>(null);

export function MurmurabaSuite({
  children,
  services = {},
  lazy = true,
  allowDegraded = true, // Changed to true by default for better UX
  initTimeout = 6000, // Reduced to 6 seconds (WASM timeout is 5s)
  onUserInteraction,
  ...engineConfig
}: MurmurabaSuiteConfig) {
  const [container] = useState(() => new DIContainer());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [serviceLoader] = useState(() => new ServiceLoader(container));
  const [isReinitializing, setIsReinitializing] = useState(false);

  useEffect(() => {
    const initializeSuite = async () => {
      logging.lifecycle('REACT', 'start', 'MurmurabaSuite initializing');
      try {
        // Create and bind engine
        const engine = engineRegistry.createEngine(engineConfig);
        logging.debug('REACT', 'Engine created, initializing');

        // Add timeout to initialization
        const initTimeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Engine initialization timeout after ${initTimeout / 1000} seconds`)
              ),
            initTimeout
          )
        );

        try {
          await Promise.race([engine.initialize(), initTimeoutPromise]);
        } catch (err) {
          logging.error('REACT', 'Engine initialization failed', err as Error);
          // Continue anyway if allowDegraded is true
          if (!allowDegraded) {
            throw err;
          }
          logging.warn('REACT', 'Degraded mode - engine unavailable');
        }

        // Get container from engine
        const engineContainer = (engine as any).getContainer();

        // Copy bindings from engine container to suite container
        if (engineContainer) {
          // This is a simplified approach - in production you'd properly merge containers
          container.bindValue(TOKENS.Logger, engineContainer.get(TOKENS.Logger));
          container.bindValue(TOKENS.StateManager, engineContainer.get(TOKENS.StateManager));
          container.bindValue(TOKENS.EventEmitter, engineContainer.get(TOKENS.EventEmitter));
        }

        // Bind service loader
        container.bindValue(SUITE_TOKENS.ServiceLoader, serviceLoader);

        // Register available service modules
        serviceLoader.registerModule({
          name: 'audioProcessor',
          token: SUITE_TOKENS.AudioProcessor,
          dependencies: [TOKENS.Logger, TOKENS.MetricsManager],
          load: async () => new AudioProcessorService(container),
        });

        // Register standard modules
        Object.entries(SERVICE_MODULES).forEach(([_name, module]) => {
          serviceLoader.registerModule(module);
        });

        // Load requested services
        if (!lazy) {
          const servicesToLoad = [];

          if (services.audioProcessor !== false) {
            servicesToLoad.push('audioProcessor');
          }
          if (services.metricsManager !== false) {
            servicesToLoad.push('metricsManager');
          }
          if (services.workerManager !== false) {
            servicesToLoad.push('workerManager');
          }

          await Promise.all(servicesToLoad.map(name => serviceLoader.loadModule(name)));
        }

        logging.lifecycle('REACT', 'start', 'MurmurabaSuite ready');
        setIsReady(true);

        // Setup user interaction handler for AudioContext resume
        const handleInteraction = async () => {
          try {
            const audioContext = (engine as any).audioContext;
            if (audioContext && audioContext.state === 'suspended') {
              await audioContext.resume();
              logging.info('AUDIO', 'AudioContext resumed');

              // Call the callback if provided
              if (onUserInteraction) {
                onUserInteraction();
              }
            }
          } catch (err) {
          }
        };

        // Register interaction handler
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });

        // Store AudioContext reference globally for manual initialization
        if (typeof window !== 'undefined') {
          (window as any).audioContext = (engine as any).audioContext;
        }
      } catch (err) {
        setError(err as Error);
        logging.error('REACT', 'MurmurabaSuite initialization failed', err as Error);
      }
    };

    initializeSuite();

    return () => {
      // Cleanup
      container.clear();
    };
  }, []);

  const getService = <T,>(token: symbol | string): T | null => {
    try {
      return container.has(token) ? container.get<T>(token) : null;
    } catch {
      return null;
    }
  };

  const loadService = async (name: string): Promise<void> => {
    await serviceLoader.loadModule(name);
  };

  const reinitializeEngine = async () => {
    if (isReinitializing) {
      return;
    }

    logging.lifecycle('REACT', 'restart', 'Engine reinitializing');
    setIsReinitializing(true);
    setIsReady(false);
    setError(null);

    try {
      // Clear the container
      container.clear();

      // Recreate engine
      const engine = engineRegistry.createEngine(engineConfig);

      try {
        await engine.initialize();
      } catch (err) {
        logging.error('REACT', 'Engine reinitialization failed', err as Error);
        if (!allowDegraded) {
          throw err;
        }
      }

      // Re-bind services
      const engineContainer = (engine as any).getContainer();
      if (engineContainer) {
        container.bindValue(TOKENS.Logger, engineContainer.get(TOKENS.Logger));
        container.bindValue(TOKENS.StateManager, engineContainer.get(TOKENS.StateManager));
        container.bindValue(TOKENS.EventEmitter, engineContainer.get(TOKENS.EventEmitter));
      }

      // Re-bind service loader and audio processor
      container.bindValue(SUITE_TOKENS.ServiceLoader, serviceLoader);

      // Re-register the audio processor module
      serviceLoader.registerModule({
        name: 'audioProcessor',
        token: SUITE_TOKENS.AudioProcessor,
        dependencies: [TOKENS.Logger, TOKENS.MetricsManager],
        load: async () => new AudioProcessorService(container),
      });

      // Also need to ensure MetricsManager is available
      if (!container.has(TOKENS.MetricsManager)) {
        await serviceLoader.loadModule('metricsManager');
      }

      // Now reload audio processor service
      await serviceLoader.loadModule('audioProcessor');

      logging.lifecycle('REACT', 'restart', 'Engine ready');
      setIsReady(true);
    } catch (err) {
      logging.error('REACT', 'Reinitialization failed', err as Error);
      setError(err as Error);
    } finally {
      setIsReinitializing(false);
    }
  };

  const contextValue: MurmurabaSuiteContextValue = {
    container,
    isReady,
    error,
    getService,
    loadService,
    reinitializeEngine,
  };

  return (
    <MurmurabaSuiteContext.Provider value={contextValue}>{children}</MurmurabaSuiteContext.Provider>
  );
}

// Hook to access the suite context
export function useMurmurabaSuite() {
  const context = useContext(MurmurabaSuiteContext);
  if (!context) {
    throw new Error('useMurmurabaSuite must be used within MurmurabaSuite');
  }
  return context;
}

// Service-specific hooks
export function useAudioProcessor(): IAudioProcessor | null {
  const { getService, loadService, isReady } = useMurmurabaSuite();
  const [processor, setProcessor] = useState<IAudioProcessor | null>(null);

  useEffect(() => {
    if (!isReady) return;

    const loadProcessor = async () => {
      let proc = getService<IAudioProcessor>(SUITE_TOKENS.AudioProcessor);

      if (!proc) {
        await loadService('audioProcessor');
        proc = getService<IAudioProcessor>(SUITE_TOKENS.AudioProcessor);
      }

      setProcessor(proc);
    };

    loadProcessor();
  }, [isReady]);

  return processor;
}

export function useSuiteLogger(): ILogger | null {
  const { getService } = useMurmurabaSuite();
  return getService<ILogger>(TOKENS.Logger);
}

// Convenience hook for processing audio
export function useAudioProcessing() {
  const processor = useAudioProcessor();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const processFile = async (file: File, options?: any) => {
    if (!processor) {
      setError(new Error('Audio processor not available'));
      return null;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    const unsubscribe = processor.onProgress(setProgress);

    try {
      const result = await processor.processFile(file, options);
      return result;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsProcessing(false);
      unsubscribe();
    }
  };

  const processRecording = async (duration: number, options?: any) => {
    if (!processor) {
      setError(new Error('Audio processor not available'));
      return null;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    const unsubscribe = processor.onProgress(setProgress);

    try {
      const result = await processor.processRecording(duration, options);
      return result;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsProcessing(false);
      unsubscribe();
    }
  };

  return {
    processFile,
    processRecording,
    isProcessing,
    progress,
    error,
    cancel: () => processor?.cancel(),
  };
}

// Re-export other types and utilities
export type { MurmurabaSuiteConfig, MurmurabaSuiteContextValue };
export { SUITE_TOKENS };
