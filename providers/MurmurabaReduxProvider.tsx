'use client'

import React, { useEffect, useCallback, useState, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { MurmurabaSuite, useMurmurabaSuite, SUITE_TOKENS, TOKENS } from '../packages/murmuraba';
import type { IMetricsManager } from '../packages/murmuraba/src/core/interfaces/IMetricsManager';
import type { IAudioProcessor } from '../packages/murmuraba/src/core/interfaces/IAudioProcessor';
import { setSuiteContainer, MURMURABA_ACTIONS } from '../store/middleware/murmurabaSuiteMiddleware';
import { setEngineInitialized, setProcessing, updateMetrics } from '../store/slices/audioSlice';
import { DebugError } from '../components/DebugError';

interface MurmurabaReduxProviderProps {
  children: ReactNode;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  algorithm?: 'rnnoise' | 'spectral' | 'adaptive';
  enableAGC?: boolean;
  noiseReductionLevel?: 'low' | 'medium' | 'high' | 'auto';
  allowDegraded?: boolean;
  lazy?: boolean;
  showAudioMonitoring?: boolean;
}

// --- WRAPPER ---
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem'
    }}>
      <h2>Initializing MurmurabaSuite...</h2>
      <div style={{
        width: 50, height: 50, border: '4px solid #333', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
      }} />
      <style jsx>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// --- BRIDGE ---
function MurmurabaReduxBridge({ children, showAudioLevel }: { children: ReactNode, showAudioLevel?: boolean }) {
  const { container, isReady, error } = useMurmurabaSuite();
  const [audioLevel, setAudioLevel] = useState(0);

  const syncMetrics = useCallback(() => {
    if (!container?.has(TOKENS.MetricsManager)) return;
    const metricsManager = container.get(TOKENS.MetricsManager) as IMetricsManager;
    if (!metricsManager?.onMetricsUpdate) return;
    return metricsManager.onMetricsUpdate((metrics: any) => {
      setAudioLevel(metrics.inputLevel || 0);
      store.dispatch(updateMetrics(metrics));
    });
  }, [container]);

  const monitorProcessing = useCallback(() => {
    if (!container?.has(SUITE_TOKENS.AudioProcessor)) return;
    const processor = container.get(SUITE_TOKENS.AudioProcessor) as IAudioProcessor;
    const i = setInterval(() => store.dispatch(setProcessing(processor.isProcessing())), 150);
    return () => clearInterval(i);
  }, [container]);

  useEffect(() => {
    if (!isReady || !container) return;
    setSuiteContainer(container as any);
    store.dispatch({ type: MURMURABA_ACTIONS.SET_CONTAINER, payload: container });
    store.dispatch(setEngineInitialized(true));
    const unsubMetrics = syncMetrics();
    const clearProcessing = monitorProcessing();
    return () => {
      if (unsubMetrics) unsubMetrics();
      if (clearProcessing) clearProcessing();
    };
  }, [isReady, container, syncMetrics, monitorProcessing]);

  if (error) return <DebugError error={error} />;

  return (
    <>
      {showAudioLevel && isReady &&
        <div style={{
          position: 'fixed', top: 12, right: 12, zIndex: 999, background: '#181818cc', padding: 10, borderRadius: 8, minWidth: 160
        }}>
          <div style={{ color: 'white', fontSize: 13, marginBottom: 4 }}>Audio Level</div>
          <div style={{ background: '#fff2', borderRadius: 4, height: 16, overflow: 'hidden' }}>
            <div style={{
              width: `${audioLevel * 100}%`, height: '100%',
              background: audioLevel > 0.7 ? '#ff4444' : audioLevel > 0.4 ? '#ffaa00' : '#44ff44',
              transition: 'width 0.12s cubic-bezier(.4,2,.6,1)'
            }} />
          </div>
        </div>
      }
      {children}
    </>
  );
}

// --- PROVIDER ---
export function MurmurabaReduxProvider({
  children,
  logLevel = 'debug',
  algorithm = 'rnnoise',
  enableAGC = false,
  noiseReductionLevel = 'medium',
  allowDegraded = true,
  lazy = false,
  showAudioMonitoring = process.env.NODE_ENV === 'development'
}: MurmurabaReduxProviderProps) {
  const [init, setInit] = useState(false);

  if (!init)
    return (
      <Provider store={store}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'
        }}>
          <h2>Welcome to Murmuraba Audio Engine</h2>
          <button onClick={() => setInit(true)} style={{ padding: 18, fontSize: 18 }}>🚀 Initialize Audio Engine</button>
        </div>
      </Provider>
    );

  return (
    <Provider store={store}>
      <MurmurabaSuite
        logLevel={logLevel}
        algorithm={algorithm}
        enableAGC={enableAGC}
        noiseReductionLevel={noiseReductionLevel}
        allowDegraded={allowDegraded}
        lazy={lazy}
        useWorker={false}
        initTimeout={12000}
        services={{ audioProcessor: true, metricsManager: true, workerManager: true }}
        onUserInteraction={() => {}}
      >
        <React.Suspense fallback={<LoadingScreen />}>
          <MurmurabaReduxBridge showAudioLevel={showAudioMonitoring}>
            {children}
          </MurmurabaReduxBridge>
        </React.Suspense>
      </MurmurabaSuite>
    </Provider>
  );
}
