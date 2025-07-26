import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DIContainer, TOKENS } from '../core/DIContainer';
import { MurmubaraEngineFactory } from '../core/MurmubaraEngineFactory';
import { ServiceLoader, SERVICE_MODULES } from '../core/ServiceLoader';
import { AudioProcessorService } from '../services/AudioProcessorService';
import { MurmubaraConfig } from '../types';
import { ILogger, IAudioProcessor } from '../core/interfaces';

// Extended tokens for suite services
export const SUITE_TOKENS = {
  ...TOKENS,
  AudioProcessor: Symbol('AudioProcessor'),
  ServiceLoader: Symbol('ServiceLoader')
} as const;

interface MurmurabaSuiteConfig extends MurmubaraConfig {
  services?: {
    audioProcessor?: boolean;
    metricsManager?: boolean;
    workerManager?: boolean;
  };
  lazy?: boolean;
  children?: ReactNode;
}

interface MurmurabaSuiteContextValue {
  container: DIContainer;
  isReady: boolean;
  error: Error | null;
  getService: <T>(token: symbol | string) => T | null;
  loadService: (name: string) => Promise<void>;
}

const MurmurabaSuiteContext = createContext<MurmurabaSuiteContextValue | null>(null);

export function MurmurabaSuite({ 
  children,
  services = {},
  lazy = true,
  ...engineConfig 
}: MurmurabaSuiteConfig) {
  const [container] = useState(() => new DIContainer());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [serviceLoader] = useState(() => new ServiceLoader(container));

  useEffect(() => {
    const initializeSuite = async () => {
      try {
        // Create and bind engine
        const engine = MurmubaraEngineFactory.create(engineConfig);
        await engine.initialize();
        
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
          load: async () => new AudioProcessorService(container)
        });
        
        // Register standard modules
        Object.entries(SERVICE_MODULES).forEach(([name, module]) => {
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
        
        setIsReady(true);
      } catch (err) {
        setError(err as Error);
        console.error('MurmurabaSuite initialization failed:', err);
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

  const contextValue: MurmurabaSuiteContextValue = {
    container,
    isReady,
    error,
    getService,
    loadService
  };

  return (
    <MurmurabaSuiteContext.Provider value={contextValue}>
      {children}
    </MurmurabaSuiteContext.Provider>
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
    cancel: () => processor?.cancel()
  };
}