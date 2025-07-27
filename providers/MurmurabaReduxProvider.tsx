import React, { useEffect, ReactNode, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { MurmurabaSuite, useMurmurabaSuite } from 'murmuraba';
import { setSuiteContainer, MURMURABA_ACTIONS } from '../store/middleware/murmurabaSuiteMiddleware';
import { setEngineInitialized } from '../store/slices/audioSlice';
import { TOKENS } from '../packages/murmuraba/src/core/DIContainer';
import { DebugError } from '../components/DebugError';

// Inner component that has access to MurmurabaSuite context
function MurmurabaReduxBridge({ children }: { children: ReactNode }) {
  const { container, isReady, error } = useMurmurabaSuite();
  
  useEffect(() => {
    console.log('🔄 MurmurabaSuite status:', { 
      isReady, 
      hasContainer: !!container, 
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });
    
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
    console.log('⏳ MurmurabaSuite: Showing loading state', { isReady, hasContainer: !!container });
    // Don't show loading screen, just render children
  }
  
  // Show error state if initialization failed
  if (error) {
    console.error('❌ MurmurabaSuite: Showing error state', error);
    return <DebugError error={error} />;
  }
  
  console.log('✅ MurmurabaSuite: Rendering children');
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
  logLevel = 'debug',
  algorithm = 'rnnoise',
  enableAGC = false,
  noiseReductionLevel = 'medium',
  allowDegraded = true,
  lazy = false as any
}: MurmurabaReduxProviderProps) {
  const [shouldInitialize, setShouldInitialize] = useState(false);
  const [, setIsInitializing] = useState(false);

  const handleManualInit = () => {
    setShouldInitialize(true);
    setIsInitializing(true);
  };

  // If not initialized yet, show initialization button
  if (!shouldInitialize) {
    return (
      <Provider store={store}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Welcome to Murmuraba Audio Engine</h2>
          <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
            Click the button below to initialize the audio processing engine
          </p>
          <button 
            onClick={handleManualInit}
            className="btn btn-primary"
            style={{ 
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>🚀</span>
            <span>Initialize Audio Engine</span>
          </button>
        </div>
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      <MurmurabaSuite
        logLevel={logLevel}
        algorithm={algorithm}
        enableAGC={enableAGC}
        noiseReductionLevel={noiseReductionLevel}
        allowDegraded={allowDegraded}
        lazy={false}
        initTimeout={9000}
        services={{
          audioProcessor: true,
          metricsManager: true,
          workerManager: true
        }}
        onUserInteraction={() => setIsInitializing(false)}
      >
        <MurmurabaReduxBridge>
          {children}
        </MurmurabaReduxBridge>
      </MurmurabaSuite>
    </Provider>
  );
}