import React, { createContext, useContext, useEffect, useState } from 'react';
import { DIContainer, TOKENS } from '../core/DIContainer';
import { MurmubaraEngine } from '../core/MurmubaraEngine';
import { MurmubaraEngineFactory } from '../core/MurmubaraEngineFactory';
import { MurmubaraConfig } from '../types';

interface MurmubaraContextValue {
  engine: MurmubaraEngine | null;
  container: DIContainer | null;
  isInitialized: boolean;
  error: Error | null;
}

const MurmubaraContext = createContext<MurmubaraContextValue | null>(null);

export interface MurmubaraProviderProps {
  children: React.ReactNode;
  config?: MurmubaraConfig;
  autoInitialize?: boolean;
}

export function MurmubaraProvider({
  children,
  config,
  autoInitialize = true,
}: MurmubaraProviderProps) {
  const [engine, setEngine] = useState<MurmubaraEngine | null>(null);
  const [container, setContainer] = useState<DIContainer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoInitialize) return;

    const initEngine = async () => {
      try {
        const newEngine = MurmubaraEngineFactory.create(config);
        const newContainer = (newEngine as any).getContainer();

        await newEngine.initialize();

        setEngine(newEngine);
        setContainer(newContainer);
        setIsInitialized(true);
      } catch (err) {
        setError(err as Error);
      }
    };

    initEngine();

    return () => {
      if (engine) {
        engine.destroy(true);
      }
    };
  }, [config, autoInitialize]);

  return (
    <MurmubaraContext.Provider value={{ engine, container, isInitialized, error }}>
      {children}
    </MurmubaraContext.Provider>
  );
}

export function useMurmuraba() {
  const context = useContext(MurmubaraContext);

  if (!context) {
    throw new Error('useMurmuraba must be used within MurmubaraProvider');
  }

  return context;
}

export function useService<T>(token: symbol | string): T | null {
  const { container } = useMurmuraba();

  if (!container || !container.has(token)) {
    return null;
  }

  return container.get<T>(token);
}

export function useLogger() {
  return useService(TOKENS.Logger);
}

export function useMetricsManager() {
  return useService(TOKENS.MetricsManager);
}
