import React, { useEffect, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { MurmurabaSuite, useMurmurabaSuite } from 'murmuraba';
import { setSuiteContainer, MURMURABA_ACTIONS } from '../store/middleware/murmurabaSuiteMiddleware';
import { setEngineInitialized } from '../store/slices/audioSlice';
import { TOKENS } from '../packages/murmuraba/src/core/DIContainer';

// Inner component that has access to MurmurabaSuite context
function MurmurabaReduxBridge({ children }: { children: ReactNode }) {
  const { container, isReady, error } = useMurmurabaSuite();
  
  useEffect(() => {
    if (isReady && container) {
      // Connect DI container to Redux middleware
      setSuiteContainer(container as any);
      store.dispatch({ type: MURMURABA_ACTIONS.SET_CONTAINER, payload: container as any });
      store.dispatch(setEngineInitialized(true));
      
      // Log successful connection
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ MurmurabaSuite connected to Redux');
        console.log('Available services:', {
          audioProcessor: container.has(TOKENS.AudioProcessor),
          logger: container.has(TOKENS.Logger),
          metricsManager: container.has(TOKENS.MetricsManager)
        });
      }
    }
    
    if (error) {
      store.dispatch(setEngineInitialized(false));
      console.error('❌ MurmurabaSuite initialization error:', error);
    }
  }, [isReady, container, error]);
  
  return <>{children}</>;
}

interface MurmurabaReduxProviderProps {
  children: ReactNode;
  // MurmurabaSuite config
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  algorithm?: 'rnnoise' | 'spectral' | 'adaptive';
  enableAGC?: boolean;
  noiseReductionLevel?: 'low' | 'medium' | 'high' | 'auto';
  allowDegraded?: boolean;
  lazy?: boolean;
}

export function MurmurabaReduxProvider({
  children,
  logLevel = 'warn',
  algorithm = 'rnnoise',
  enableAGC = false,
  noiseReductionLevel = 'medium',
  allowDegraded = true,
  lazy = true
}: MurmurabaReduxProviderProps) {
  return (
    <Provider store={store}>
      <MurmurabaSuite
        logLevel={logLevel}
        algorithm={algorithm}
        enableAGC={enableAGC}
        noiseReductionLevel={noiseReductionLevel}
        allowDegraded={allowDegraded}
        lazy={lazy}
        services={{
          audioProcessor: true,
          metricsManager: true,
          workerManager: !lazy
        }}
      >
        <MurmurabaReduxBridge>
          {children}
        </MurmurabaReduxBridge>
      </MurmurabaSuite>
    </Provider>
  );
}