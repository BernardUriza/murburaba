'use client'

import React, { useEffect, ReactNode, useState, useCallback } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { MurmurabaSuite, useMurmurabaSuite, WaveformAnalyzer, SUITE_TOKENS, TOKENS } from 'murmuraba';
import { setSuiteContainer, MURMURABA_ACTIONS } from '../store/middleware/murmurabaSuiteMiddleware';
import { setEngineInitialized, setProcessing, updateMetrics } from '../store/slices/audioSlice';
import { DebugError } from '../components/DebugError';
import type { ILogger, IMetricsManager, IAudioProcessor } from 'murmuraba';

// Wrapper component to show loading state
function MurmurabaSuiteWrapper({ children, isInitializing, showAudioLevel }: { children: ReactNode; isInitializing: boolean; showAudioLevel?: boolean }) {
  const { isReady } = useMurmurabaSuite();
  
  // Show loading screen while initializing
  if (isInitializing && !isReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>Initializing MurmurabaSuite...</h2>
        <div style={{ marginBottom: '2rem', opacity: 0.8 }}>
          Loading audio processing engine
        </div>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255,255,255,0.2)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  return <MurmurabaReduxBridge showAudioLevel={showAudioLevel}>{children}</MurmurabaReduxBridge>;
}

// Inner component that has access to MurmurabaSuite context
function MurmurabaReduxBridge({ children, showAudioLevel }: { children: ReactNode; showAudioLevel?: boolean }) {
  const { container, isReady, error } = useMurmurabaSuite();
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Setup audio level monitoring
  const setupAudioLevelMonitoring = useCallback(async () => {
    console.log('🔧 setupAudioLevelMonitoring called:', { isReady, hasContainer: !!container });
    if (!isReady || !container) {
      console.log('❌ Not ready to setup monitoring');
      return;
    }
    
    try {
      // Check if services are available first
      if (!container.has(SUITE_TOKENS.AudioProcessor)) {
        console.log('AudioProcessor not yet available');
        return;
      }
      
      const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor);
      
      // MetricsManager might not be available yet, check first
      if (container.has(TOKENS.MetricsManager)) {
        const metricsManager = container.get<IMetricsManager>(TOKENS.MetricsManager) as any;
        
        // MetricsManager extends EventEmitter, so use 'on' method
        if (metricsManager && metricsManager.on) {
          console.log('🎯 Setting up MetricsManager listener in MurmurabaReduxProvider');
          
          // Debug what methods are available
          console.log('MetricsManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(metricsManager)));
          
          console.log('📌 Registering metrics-update listener');
          
          // Track if we're getting any events
          let eventCount = 0;
          metricsManager.on('metrics-update', (metrics: any) => {
            eventCount++;
            // Log first 10 events and then every 50th
            if (eventCount <= 10 || eventCount % 50 === 0) {
              console.log(`📊 Metrics event #${eventCount} in Redux Provider:`, {
                inputLevel: metrics.inputLevel,
                outputLevel: metrics.outputLevel,
                timestamp: new Date(metrics.timestamp).toISOString(),
                frameCount: metrics.frameCount
              });
            }
            
            // Only log non-zero inputs occasionally to reduce spam
            if (metrics.inputLevel > 0 && Math.random() < 0.05) {
              console.log('🎯 Audio level:', metrics.inputLevel.toFixed(3));
            }
            
            setAudioLevel(metrics.inputLevel || 0);
            // Also dispatch to Redux if needed
            store.dispatch(updateMetrics({ 
              inputLevel: metrics.inputLevel,
              outputLevel: metrics.outputLevel 
            }));
          });
          
          // Listener is now registered
          
          // Store reference for cleanup
          (window as any).__metricsManager = metricsManager;
        }
      }
      
      // Also try processor metrics as fallback
      if (processor && processor.onMetrics) {
        processor.onMetrics((metrics) => {
          setAudioLevel(metrics.inputLevel || 0);
          store.dispatch(updateMetrics(metrics));
        });
      }
    } catch (error) {
      console.error('Failed to setup audio monitoring:', error);
    }
  }, [container, isReady]);
  
  useEffect(() => {
    // Log status only on changes
    if (isReady && container && !window.__murmurabaInitLogged) {
      console.log('✅ MurmurabaSuite initialized');
      window.__murmurabaInitLogged = true;
    }
    
    if (isReady && container) {
      // Connect DI container to Redux middleware
      setSuiteContainer(container as any);
      store.dispatch({ type: MURMURABA_ACTIONS.SET_CONTAINER, payload: container as any });
      store.dispatch(setEngineInitialized(true));
      
      // Setup additional monitoring
      console.log('🚀 Calling setupAudioLevelMonitoring from useEffect');
      setupAudioLevelMonitoring();
      
      // Get services for enhanced functionality (with checks)
      const logger = container.has(TOKENS.Logger) ? container.get<ILogger>(TOKENS.Logger) : null;
      const processor = container.has(SUITE_TOKENS.AudioProcessor) ? container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor) : null;
      
      // Subscribe to processing state
      if (processor) {
        const interval = setInterval(() => {
          const isProcessing = processor.isProcessing();
          store.dispatch(setProcessing(isProcessing));
        }, 100);
        
        return () => clearInterval(interval);
      }
      
      // Log successful connection
      logger?.info('✅ MurmurabaSuite connected to Redux');
      logger?.debug('Available services:', {
        audioProcessor: container.has(SUITE_TOKENS.AudioProcessor),
        logger: container.has(TOKENS.Logger),
        metricsManager: container.has(TOKENS.MetricsManager),
        stateManager: container.has(TOKENS.StateManager),
        eventEmitter: container.has(TOKENS.EventEmitter)
      });
    }
    
    if (error) {
      store.dispatch(setEngineInitialized(false));
      console.error('❌ MurmurabaSuite initialization error:', error);
    }
  }, [isReady, container, error, setupAudioLevelMonitoring]);
  
  // Listen for stream changes from Redux
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      const streamId = state.audio.currentStreamId;
      if (streamId && navigator.mediaDevices) {
        // Get active media streams
        navigator.mediaDevices.enumerateDevices().then(() => {
          // Note: We can't directly get stream by ID, this is a limitation
          // Instead, we'll rely on the MediaStreamContext
        });
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Show error state if initialization failed
  if (error) {
    console.error('❌ MurmurabaSuite: Showing error state', error);
    return <DebugError error={error} />;
  }
  
  return (
    <>
      {/* Audio Level Indicator */}
      {showAudioLevel && isReady && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.8)',
          padding: '10px',
          borderRadius: '8px',
          minWidth: '200px'
        }}>
          <div style={{ color: 'white', fontSize: '12px', marginBottom: '5px' }}>Audio Level</div>
          <div style={{
            width: '100%',
            height: '20px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${audioLevel * 100}%`,
              height: '100%',
              background: audioLevel > 0.7 ? '#ff4444' : audioLevel > 0.4 ? '#ffaa00' : '#44ff44',
              transition: 'width 0.1s ease-out'
            }} />
          </div>
        </div>
      )}
      
      {/* Waveform Visualizer for current stream */}
      {currentStream && showAudioLevel && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.9)',
          padding: '10px',
          borderRadius: '8px'
        }}>
          <WaveformAnalyzer
            stream={currentStream}
            width={300}
            height={100}
            label="Live Audio"
            hideControls={true}
            disablePlayback={true}
          />
        </div>
      )}
      
      {children}
    </>
  );
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
  lazy: _lazy = false,
  showAudioMonitoring = process.env.NODE_ENV === 'development'
}: MurmurabaReduxProviderProps & { showAudioMonitoring?: boolean }) {
  const [shouldInitialize, setShouldInitialize] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

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
        allowDegraded={true}
        lazy={false}
        initTimeout={15000}
        useWorker={false}
        services={{
          audioProcessor: true,
          metricsManager: true,
          workerManager: true
        }}
        onUserInteraction={() => setIsInitializing(false)}
      >
        <MurmurabaSuiteWrapper isInitializing={isInitializing} showAudioLevel={showAudioMonitoring}>
          {children}
        </MurmurabaSuiteWrapper>
      </MurmurabaSuite>
    </Provider>
  );
}