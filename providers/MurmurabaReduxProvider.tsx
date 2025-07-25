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
    console.log('🔄 MurmurabaSuite status:', { isReady, hasContainer: !!container, error });
    
    if (isReady && container) {
      // Connect DI container to Redux middleware
      setSuiteContainer(container as any);
      store.dispatch({ type: MURMURABA_ACTIONS.SET_CONTAINER, payload: container as any });
      store.dispatch(setEngineInitialized(true));
      
      // Log successful connection
      console.log('✅ MurmurabaSuite connected to Redux');
      console.log('Available services:', {
        audioProcessor: container.has(TOKENS.AudioProcessor),
        logger: container.has(TOKENS.Logger),
        metricsManager: container.has(TOKENS.MetricsManager)
      });
    }
    
    if (error) {
      store.dispatch(setEngineInitialized(false));
      console.error('❌ MurmurabaSuite initialization error:', error);
    }
  }, [isReady, container, error]);
  
  // Show loading state while initializing
  if (!isReady && !error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1rem'
      }}>
        <div style={{
          fontSize: '2rem',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>⚡</div>
        <div style={{ color: '#666' }}>Initializing MurmurabaSuite...</div>
      </div>
    );
  }
  
  // Show error state if initialization failed
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1rem',
        color: '#ff4444'
      }}>
        <div style={{ fontSize: '2rem' }}>❌</div>
        <div>Failed to initialize MurmurabaSuite</div>
        <div style={{ fontSize: '0.875rem', color: '#666' }}>{error.message}</div>
      </div>
    );
  }
  
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