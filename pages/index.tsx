'use client'

import React, { useState, useEffect } from 'react'
import { useMediaStream } from '../context/MediaStreamContext'
import AudioDemo from '../components/AudioDemo'
import { Settings } from '../components/Settings'
import { CopilotChat } from '../components/CopilotChat'
import { ReduxDemo } from '../components/ReduxDemo'
import { MurmurabaSuiteStatus } from '../components/MurmurabaSuiteStatus'
import Swal from 'sweetalert2'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { useAudioProcessor } from '../hooks/useAudioProcessor'
import {
  setChunkDuration,
  setEnableAGC,
  setCurrentStreamId
} from '../store/slices/audioSlice'
import {
  toggleAudioDemo,
  toggleAdvancedMetrics,
  toggleSettings,
  toggleCopilot
} from '../store/slices/uiSlice'
import {
  selectEngineStatus,
  selectAudioConfig,
  selectUIFlags,
  shallowEqual
} from '../store/selectors'

export default function App() {
  const [mounted, setMounted] = useState(false)
  const dispatch = useAppDispatch()
  const engineStatus = useAppSelector(selectEngineStatus, shallowEqual)
  const audioConfig = useAppSelector(selectAudioConfig, shallowEqual)
  const uiFlags = useAppSelector(selectUIFlags, shallowEqual)
  const { setStream, stopStream } = useMediaStream()

  const { isInitialized, isProcessing, isRecording } = engineStatus
  const { chunkDuration, enableAGC } = audioConfig
  const { showAudioDemo, showAdvancedMetrics, showSettings, showCopilot } = uiFlags

  const { isReady, processRecording, cancelProcessing } = useAudioProcessor()

  useEffect(() => { setMounted(true) }, [])

  // --- Actions ---

  const notify = (type: 'success' | 'info' | 'warning' | 'error', title: string, text?: string) =>
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type,
      title,
      text,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    })

  const handleInitializeEngine = async () => {
    if (isReady) return notify('info', 'Audio engine already initialized!')
    notify('info', 'Waiting for MurmurabaSuite...')
  }

  const handleStartRecording = async () => {
    if (!isReady)
      return notify('warning', 'MurmurabaSuite Not Ready', 'Please wait for the audio engine to initialize')
    try {
      notify('info', 'Starting microphone recording...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: enableAGC }
      })
      setStream(stream)
      dispatch(setCurrentStreamId(stream.id))
      const result = await processRecording(chunkDuration * 1000, {})
      if (result) notify('success', 'Recording completed successfully!')
    } catch (error: any) {
      notify('error', 'Recording Failed', error?.message || 'Unknown error')
    } finally {
      stopStream()
    }
  }

  // --- RENDER ---
  if (!mounted) {
    return (
      <main className="main-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="main-container">
        <OverlayPanel show={showAudioDemo} onClose={() => dispatch(toggleAudioDemo())}>
          <AudioDemo
            autoProcess
            onProcessComplete={() => notify('success', '¡Audio procesado exitosamente!')}
            onError={err => notify('error', 'Error al procesar audio', err.message)}
          />
        </OverlayPanel>

        <StudioHeader isProcessing={isProcessing} isInitialized={isInitialized} />

        {isProcessing && <ProcessingBar isRecording={isRecording} />}

        <ControlPanel
          isReady={isReady}
          isProcessing={isProcessing}
          isRecording={isRecording}
          enableAGC={enableAGC}
          chunkDuration={chunkDuration}
          onInit={handleInitializeEngine}
          onRecord={handleStartRecording}
          onStop={() => { cancelProcessing(); stopStream(); }}
          onSetAGC={v => dispatch(setEnableAGC(v))}
          onSetDuration={d => dispatch(setChunkDuration(d))}
        />

        <ReduxDemo />

        <FabButtons
          showAudioDemo={showAudioDemo}
          showAdvancedMetrics={showAdvancedMetrics}
          showSettings={showSettings}
          showCopilot={showCopilot}
          isEngineInitialized={isInitialized}
          onAudioDemo={() => dispatch(toggleAudioDemo())}
          onAdvancedMetrics={() => dispatch(toggleAdvancedMetrics())}
          onSettings={() => dispatch(toggleSettings())}
          onCopilot={() => dispatch(toggleCopilot())}
        />

        <Settings
          isOpen={showSettings}
          onClose={() => dispatch(toggleSettings())}
          vadThresholds={{ silence: 0.3, voice: 0.5, clearVoice: 0.7 }}
          displaySettings={{ showVadValues: true, showVadTimeline: true }}
          onThresholdChange={t => console.log('Thresholds changed:', t)}
          onDisplayChange={s => console.log('Display settings changed:', s)}
        />

        <CopilotChat
          isOpen={showCopilot}
          onClose={() => dispatch(toggleCopilot())}
          engineConfig={{}}
          setEngineConfig={() => { }}
          isRecording={isRecording}
          isInitialized={isInitialized}
          onApplyChanges={async () => console.log('Apply changes')}
        />
      </main>
      <MurmurabaSuiteStatus />
    </>
  )
}

// ---- COMPONENTS ----

function OverlayPanel({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className={`slide-panel-overlay ${show ? 'active' : ''}`} onClick={onClose} />
      <div className={`slide-panel audio-demo-panel ${show ? 'active' : ''}`}>
        <div className="panel-header">
          <h3>🎵 Audio Demo</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="panel-content">{children}</div>
      </div>
    </>
  )
}

function StudioHeader({ isProcessing, isInitialized }: { isProcessing: boolean, isInitialized: boolean }) {
  return (
    <div className="studio-header">
      <div className="header-content">
        <div className="brand-modern">
          <h1 className="brand-name">
            <span className="brand-icon" style={{ animation: 'spin 2s linear infinite' }}>◐</span>
            murmuraba
          </h1>
          <div className="brand-meta">
            <span className="version">v2.0.0</span>
            <span className="separator">•</span>
            <span className="tagline">Neural Audio Engine</span>
          </div>
        </div>
        <div className="engine-status-modern">
          <div className={`status-indicator ${
            isProcessing ? 'processing' : isInitialized ? 'ready' : 'uninitialized'
          }`}>
            <span className="status-pulse"></span>
            <span className="status-label">
              {isProcessing ? 'processing' : isInitialized ? 'ready' : 'uninitialized'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProcessingBar({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="recording-status-bar">
      <div className="recording-indicator pulse">
        <span className="recording-dot"></span>
        <span className="badge badge-recording">
          {isRecording ? 'Recording Audio' : 'Processing Audio'}
        </span>
      </div>
    </div>
  )
}

function ControlPanel({
  isReady, isProcessing, isRecording, enableAGC, chunkDuration,
  onInit, onRecord, onStop, onSetAGC, onSetDuration
}: {
  isReady: boolean
  isProcessing: boolean
  isRecording: boolean
  enableAGC: boolean
  chunkDuration: number
  onInit: () => void
  onRecord: () => void
  onStop: () => void
  onSetAGC: (v: boolean) => void
  onSetDuration: (d: number) => void
}) {
  return (
    <section className="recording-panel glass-card">
      <div className="panel-header"><h2 className="panel-title">Audio Controls</h2></div>
      <div className="controls-grid">
        {!isReady ? (
          <button className="btn btn-primary" onClick={onInit} disabled={isProcessing}>
            <span className="btn-icon">⚡</span>
            <span>Waiting for MurmurabaSuite...</span>
          </button>
        ) : (
          <>
            <button
              className="btn btn-primary"
              onClick={onRecord}
              disabled={isProcessing}
              style={{ display: isRecording ? 'none' : 'flex' }}
            >
              <span className="btn-icon">🎙️</span>
              <span>{isProcessing ? 'Processing...' : 'Record Audio'}</span>
            </button>
            {isRecording && (
              <button className="btn btn-danger" onClick={onStop}>
                <span className="btn-icon">⏹️</span>
                <span>Stop Recording</span>
              </button>
            )}
          </>
        )}
        <div className="control-group" style={{ marginTop: '1rem' }}>
          <label className="control-label">⏱️ Recording Duration</label>
          <div className="nav-pills" style={{ justifyContent: 'center' }}>
            {[5, 8, 10, 15].map(duration => (
              <button
                key={duration}
                className={`nav-pill ${chunkDuration === duration ? 'active' : ''}`}
                onClick={() => onSetDuration(duration)}
                disabled={isProcessing}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>
        <div className="control-group" style={{ marginTop: '1rem' }}>
          <label className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={enableAGC}
              onChange={e => onSetAGC(e.target.checked)}
              disabled={isReady}
              style={{ width: 18, height: 18, cursor: isReady ? 'not-allowed' : 'pointer' }}
            />
            🎚️ Enable AGC (Auto Gain Control)
          </label>
          {isReady && (
            <small style={{ color: '#999', marginTop: '0.25rem', display: 'block' }}>
              Reinitialize engine to change AGC setting
            </small>
          )}
        </div>
      </div>
    </section>
  )
}

function FabButtons({
  showAudioDemo, showAdvancedMetrics, showSettings, showCopilot,
  isEngineInitialized, onAudioDemo, onAdvancedMetrics, onSettings, onCopilot
}: {
  showAudioDemo: boolean
  showAdvancedMetrics: boolean
  showSettings: boolean
  showCopilot: boolean
  isEngineInitialized: boolean
  onAudioDemo: () => void
  onAdvancedMetrics: () => void
  onSettings: () => void
  onCopilot: () => void
}) {
  return (
    <div className="fab-container">
      <button className="fab fab-primary" onClick={onAudioDemo} title="Audio Demo">🎵</button>
      <button
        className="fab"
        onClick={onAdvancedMetrics}
        title={showAdvancedMetrics ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
        disabled={!isEngineInitialized}
        style={{ opacity: isEngineInitialized ? 1 : 0.5 }}
      >
        {showAdvancedMetrics ? '📉' : '📈'}
      </button>
      <div style={{ height: '0.5rem' }} />
      <button className="fab" onClick={onSettings} title="Settings">⚙️</button>
      <button className="fab fab-copilot" onClick={onCopilot} title="Copilot Chat">🤖</button>
    </div>
  )
}
