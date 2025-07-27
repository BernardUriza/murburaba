'use client'

import React, { useState, useEffect } from 'react'
import { useMediaStream } from '../context/MediaStreamContext'
import AudioDemo from '../components/AudioDemo'
import { Settings } from '../components/Settings'
import { CopilotChat } from '../components/CopilotChat'
import { MurmurabaSuiteStatus } from '../components/MurmurabaSuiteStatus'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { StudioHeader } from '../components/ui/StudioHeader'
import { ProcessingBar } from '../components/ui/ProcessingBar'
import { ControlPanel } from '../components/ui/ControlPanel'
import { FabButtons } from '../components/ui/FabButtons'
import { BannerHero } from '../components/ui/BannerHero'
import { useNotifications } from '../hooks/useNotifications'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { useAudioProcessor } from '../hooks/useAudioProcessor'
import { WaveformAnalyzer } from 'murmuraba'
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
  const [showLiveWaveform, setShowLiveWaveform] = useState(false)
  const dispatch = useAppDispatch()
  const { notify } = useNotifications()
  
  // Redux selectors
  const engineStatus = useAppSelector(selectEngineStatus, shallowEqual)
  const audioConfig = useAppSelector(selectAudioConfig, shallowEqual)
  const uiFlags = useAppSelector(selectUIFlags, shallowEqual)
  
  // Media stream context
  const { currentStream } = useMediaStream()
  
  // Destructured state
  const { isInitialized, isProcessing, isRecording } = engineStatus
  const { chunkDuration, enableAGC } = audioConfig
  const { showAudioDemo, showAdvancedMetrics, showSettings, showCopilot } = uiFlags
  const { processingResults, currentInputLevel } = useAppSelector(state => state.audio)
  
  // Debug log - log every 2 seconds only
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔍 Engine status:', { 
        isInitialized, 
        isProcessing, 
        isRecording, 
        currentStream: !!currentStream, 
        showLiveWaveform,
        currentInputLevel 
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [isInitialized, isProcessing, isRecording, currentStream, showLiveWaveform, currentInputLevel])
  
  // Audio processor hook
  const { isReady, processRecording, cancelProcessing } = useAudioProcessor()

  useEffect(() => { setMounted(true) }, [])

  // Event handlers
  const handleInitializeEngine = async () => {
    // This function is no longer needed since initialization is handled in MurmurabaReduxProvider
    notify('info', 'Engine initialization is handled at startup')
  }

  const handleStartRecording = async () => {
    if (!isReady) {
      notify('info', 'Initializing audio engine...')
      // Esperar un momento para que el engine se inicialice
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Si después de esperar sigue sin estar listo, mostrar mensaje
      if (!isReady) {
        return notify('warning', 'Audio engine is still initializing. Please try again in a moment.')
      }
    }
    
    try {
      notify('info', 'Starting microphone recording...')
      setShowLiveWaveform(true) // Show waveform immediately
      
      // Record for 30 seconds total
      const recordingDuration = 30 * 1000; // 30 seconds
      const result = await processRecording(recordingDuration, {
        enableAGC,
        chunkDuration
      })
      
      if (result) notify('success', 'Recording completed successfully!')
    } catch (error: any) {
      notify('error', 'Recording Failed', error?.message || 'Unknown error')
    } finally {
      // Keep waveform visible for a bit after recording stops
      setTimeout(() => setShowLiveWaveform(false), 2000)
    }
  }

  const handleStopRecording = () => {
    cancelProcessing()
  }

  // Loading state
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
        {/* Audio Demo Panel */}
        <OverlayPanel show={showAudioDemo} onClose={() => dispatch(toggleAudioDemo())}>
          <AudioDemo
            onProcessComplete={() => notify('success', '¡Audio procesado exitosamente!')}
            onError={err => notify('error', 'Error al procesar audio', err.message)}
          />
        </OverlayPanel>

        {/* Banner Hero Section */}
        <BannerHero />

        {/* Studio Header */}
        <StudioHeader isProcessing={isProcessing} isInitialized={isInitialized} />

        {/* Processing Status Bar */}
        {isProcessing && <ProcessingBar isRecording={isRecording} />}

        {/* Control Panel */}
        <ControlPanel
          isReady={isReady}
          isProcessing={isProcessing}
          isRecording={isRecording}
          enableAGC={enableAGC}
          chunkDuration={chunkDuration}
          onInit={handleInitializeEngine}
          onRecord={handleStartRecording}
          onStop={handleStopRecording}
          onSetAGC={v => dispatch(setEnableAGC(v))}
          onSetDuration={d => dispatch(setChunkDuration(d))}
        />

        {/* Live Waveform Display */}
        {(showLiveWaveform || currentStream) && (
          <section className="live-waveform-section" style={{ marginTop: '1.5rem' }}>
            <div className="live-waveform-container">
              <div className="live-indicator">
                <span className="live-dot"></span>
                <span className="live-text">LIVE</span>
              </div>
              <div className="waveform-wrapper">
                <div className="waveform-glow"></div>
                <WaveformAnalyzer
                  stream={currentStream || undefined}
                  width={600}
                  height={180}
                  label=""
                  hideControls={true}
                  disablePlayback={true}
                  isActive={true}
                  isPaused={false}
                />
              </div>
              <div className="audio-metrics">
                <div className="metric-item">
                  <span className="metric-label">Input Level</span>
                  <div className="metric-bar">
                    <div className="metric-fill" style={{ width: `${currentInputLevel * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Processing Results */}
        {processingResults && processingResults.chunks.length > 0 && (
          <section className="recording-panel glass-card" style={{ marginTop: '1rem' }}>
            <div className="panel-header">
              <h3 className="panel-title">Processed Chunks ({processingResults.chunks.length})</h3>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem', fontSize: '14px', opacity: 0.8 }}>
                Average noise reduction: {((processingResults.averageVad || 0) * 100).toFixed(1)}%
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {processingResults.chunks.map((chunk, idx) => (
                  <div key={chunk.id} style={{
                    padding: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    minWidth: '120px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>Chunk {idx + 1}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {chunk.duration}s
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>
                      VAD: {(chunk.averageVad * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Floating Action Buttons */}
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

        {/* Settings Modal */}
        <Settings
          isOpen={showSettings}
          onClose={() => dispatch(toggleSettings())}
          vadThresholds={{ silence: 0.3, voice: 0.5, clearVoice: 0.7 }}
          displaySettings={{ showVadValues: true, showVadTimeline: true }}
          onThresholdChange={t => console.log('Thresholds changed:', t)}
          onDisplayChange={s => console.log('Display settings changed:', s)}
        />

        {/* Copilot Chat Modal */}
        <CopilotChat
          isOpen={showCopilot}
          onClose={() => dispatch(toggleCopilot())}
          engineConfig={{}}
          setEngineConfig={() => {}}
          isRecording={isRecording}
          isInitialized={isInitialized}
          onApplyChanges={async () => console.log('Apply changes')}
        />
      </main>
      
      {/* Development Status */}
      <MurmurabaSuiteStatus />
    </>
  )
}