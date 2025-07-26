'use client'

import React, { useState } from 'react'
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
  setEngineInitialized, 
  setProcessing, 
  setRecording,
  setProcessingResults,
  setChunkDuration,
  setEnableAGC,
  clearChunks,
  setCurrentStreamId,
  setError as setAudioError,
  clearError as clearAudioError
} from '../store/slices/audioSlice'
import {
  toggleAudioDemo,
  toggleAdvancedMetrics,
  toggleSettings,
  toggleCopilot,
  addNotification,
  setUIError
} from '../store/slices/uiSlice'
import { 
  selectEngineStatus, 
  selectAudioConfig,
  selectProcessingMetrics,
  selectUIFlags,
  shallowEqual
} from '../store/selectors'

export default function App() {
  const [mounted, setMounted] = useState(false)
  const dispatch = useAppDispatch()
  
  // Redux state with optimized selectors and shallowEqual
  const engineStatus = useAppSelector(selectEngineStatus, shallowEqual)
  const audioConfig = useAppSelector(selectAudioConfig, shallowEqual)
  const processingMetrics = useAppSelector(selectProcessingMetrics, shallowEqual)
  const uiFlags = useAppSelector(selectUIFlags, shallowEqual)
  
  // Direct state access (only for non-computed values)
  const processingResults = useAppSelector(state => state.audio.processingResults)
  const selectedChunk = useAppSelector(state => state.audio.selectedChunkId)
  
  // Destructure for convenience
  const { isInitialized: isEngineInitialized, isProcessing, isRecording } = engineStatus
  const { chunkDuration, enableAGC } = audioConfig
  const { showAudioDemo, showAdvancedMetrics, showSettings, showCopilot } = uiFlags
  
  // Media stream from context
  const { currentStream, setStream, stopStream } = useMediaStream()
  
  // Ensure component is mounted before accessing browser APIs
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Utility functions
  // const formatTime = (seconds: number) => {
  //   const mins = Math.floor(seconds / 60)
  //   const secs = Math.floor(seconds % 60)
  //   return `${mins}:${secs.toString().padStart(2, '0')}`
  // }
  
  // Get audio processor from MurmurabaSuite hook
  const { isReady, processRecording: processRecordingWithSuite, cancelProcessing } = useAudioProcessor()
  
  // Initialize engine function (MurmurabaSuite handles initialization)
  const handleInitializeEngine = async () => {
    if (isReady) {
      // Engine already initialized by MurmurabaSuite
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Audio engine already initialized!',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
      return
    }

    // Wait for MurmurabaSuite to initialize
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'Waiting for MurmurabaSuite...',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    })
  }

  // Recording with MurmurabaSuite
  const handleStartRecording = async () => {
    if (!isReady) {
      Swal.fire({
        icon: 'warning',
        title: 'MurmurabaSuite Not Ready',
        text: 'Please wait for the audio engine to initialize',
        confirmButtonText: 'OK'
      })
      return
    }

    try {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Starting microphone recording...',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
      
      // Get media stream for waveform visualization
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: enableAGC
        } 
      })
      setStream(stream)
      dispatch(setCurrentStreamId(stream.id))
      
      // Use MurmurabaSuite's audio processor
      const result = await processRecordingWithSuite(chunkDuration * 1000, {})
      
      if (result) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Recording completed successfully!',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        })
      }
      
    } catch (error) {
      console.error('Recording failed:', error)
      Swal.fire({
        icon: 'error',
        title: 'Recording Failed',
        text: error instanceof Error ? error.message : 'Unknown error occurred',
        confirmButtonText: 'OK'
      })
    } finally {
      // Stop media stream
      stopStream()
    }
  }


  // Handle chunk playback
  const handleToggleChunkPlayback = async (chunkId: string, _audioType: 'processed' | 'original') => {
    const chunk = processingResults?.chunks?.find((c: any) => c.id === chunkId)
    if (chunk && chunk.blob) {
      const audioUrl = URL.createObjectURL(chunk.blob)
      const audio = new Audio(audioUrl)
      audio.play()
      audio.onended = () => URL.revokeObjectURL(audioUrl)
    }
  }

  // Download chunk
  const handleDownloadChunk = async (chunkId: string, format: 'wav' | 'webm' | 'mp3', _audioType: 'processed' | 'original') => {
    const chunk = processingResults?.chunks?.find((c: any) => c.id === chunkId)
    if (chunk && chunk.blob) {
      const url = URL.createObjectURL(chunk.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chunk-${chunkId}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Prevent hydration errors by rendering after mount
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
        <div className={`slide-panel-overlay ${showAudioDemo ? 'active' : ''}`} onClick={() => dispatch(toggleAudioDemo())} />
        <div className={`slide-panel audio-demo-panel ${showAudioDemo ? 'active' : ''}`}>
          <div className="panel-header">
            <h3>🎵 Audio Demo</h3>
            <button className="close-btn" onClick={() => dispatch(toggleAudioDemo())}>×</button>
          </div>
          <div className="panel-content">
            {showAudioDemo && (
              <AudioDemo 
                autoProcess={true}
                onProcessComplete={(buffer) => {
                  console.log('Audio processing completed', buffer)
                  Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: '¡Audio procesado exitosamente!',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                  })
                }}
                onError={(err) => {
                  console.error('AudioDemo error:', err)
                  Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Error al procesar audio',
                    text: err.message,
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                  })
                }}
              />
            )}
          </div>
        </div>

        {/* Modern Minimal Header */}
        <div className="studio-header">
          <div className="header-content">
            <div className="brand-modern">
              <h1 className="brand-name">
                <span className="brand-icon" style={{animation: 'spin 2s linear infinite'}}>◐</span>
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
                isProcessing ? 'processing' : 
                isEngineInitialized ? 'ready' : 'uninitialized'
              }`}>
                <span className="status-pulse"></span>
                <span className="status-label">
                  {isProcessing ? 'processing' : 
                   isEngineInitialized ? 'ready' : 'uninitialized'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Status Bar */}
        {isProcessing && (
          <div className="recording-status-bar">
            <div className="recording-indicator pulse">
              <span className="recording-dot"></span>
              <span className="badge badge-recording">
                {isRecording ? 'Recording Audio' : 'Processing Audio'}
              </span>
            </div>
          </div>
        )}

        {/* Control Panel */}
        <section className="recording-panel glass-card">
          <div className="panel-header">
            <h2 className="panel-title">Audio Controls</h2>
          </div>

          <div className="controls-grid">
            {!isReady ? (
              <button 
                className="btn btn-primary"
                onClick={handleInitializeEngine}
                disabled={isProcessing}
              >
                <span className="btn-icon">⚡</span>
                <span>{'Waiting for MurmurabaSuite...'}</span>
              </button>
            ) : (
              <>
                <button 
                  className="btn btn-primary"
                  onClick={handleStartRecording}
                  disabled={isProcessing}
                  style={{ display: isRecording ? 'none' : 'flex' }}
                >
                  <span className="btn-icon">🎙️</span>
                  <span>{isProcessing ? 'Processing...' : 'Record Audio'}</span>
                </button>
                {isRecording && (
                  <button 
                    className="btn btn-danger"
                    onClick={() => {
                      cancelProcessing();
                      stopStream();
                    }}
                  >
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
                    onClick={() => dispatch(setChunkDuration(duration))}
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
                  onChange={(e) => dispatch(setEnableAGC(e.target.checked))}
                  disabled={isEngineInitialized}
                  style={{ width: '18px', height: '18px', cursor: isEngineInitialized ? 'not-allowed' : 'pointer' }}
                />
                🎚️ Enable AGC (Auto Gain Control)
              </label>
              {isEngineInitialized && (
                <small style={{ color: '#999', marginTop: '0.25rem', display: 'block' }}>
                  Reinitialize engine to change AGC setting
                </small>
              )}
            </div>
          </div>
        </section>

        {/* Waveform Visualizer */}
        {/* Redux Demo */}
        <ReduxDemo />

        {/* Waveform temporarily disabled - component not exported */}

        {/* Chunk Processing Results temporarily disabled - component not exported */}

        {/* Floating Action Buttons */}
        <div className="fab-container">
          {/* Audio Demo Button */}
          <button 
            className="fab fab-primary"
            onClick={() => dispatch(toggleAudioDemo())}
            title="Audio Demo"
          >
            🎵
          </button>
          
          {/* Advanced Metrics Button */}
          <button 
            className="fab"
            onClick={() => dispatch(toggleAdvancedMetrics())}
            title={showAdvancedMetrics ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
            disabled={!isEngineInitialized}
            style={{ opacity: (!isEngineInitialized) ? 0.5 : 1 }}
          >
            {showAdvancedMetrics ? '📉' : '📈'}
          </button>
          
          {/* Divider */}
          <div style={{ height: '0.5rem' }} />
          
          {/* Settings Button */}
          <button 
            className="fab"
            onClick={() => dispatch(toggleSettings())}
            title="Settings"
          >
            ⚙️
          </button>
          
          {/* Copilot Chat Button */}
          <button 
            className="fab fab-copilot"
            onClick={() => dispatch(toggleCopilot())}
            title="Copilot Chat"
          >
            🤖
          </button>
        </div>
        
        {/* Advanced Metrics Panel temporarily disabled - component not exported */}
        
        {/* Settings Modal */}
        <Settings 
          isOpen={showSettings} 
          onClose={() => dispatch(toggleSettings())}
          vadThresholds={{
            silence: 0.3,
            voice: 0.5,
            clearVoice: 0.7
          }}
          displaySettings={{
            showVadValues: true,
            showVadTimeline: true
          }}
          onThresholdChange={(thresholds) => console.log('Thresholds changed:', thresholds)}
          onDisplayChange={(settings) => console.log('Display settings changed:', settings)}
        />
        
        {/* Copilot Chat Modal */}
        <CopilotChat 
          isOpen={showCopilot} 
          onClose={() => dispatch(toggleCopilot())}
          engineConfig={{}}
          setEngineConfig={() => {}}
          isRecording={isRecording}
          isInitialized={isEngineInitialized}
          onApplyChanges={async () => console.log('Apply changes')}
        />
      </main>
      
      {/* MurmurabaSuite Status (Development Only) */}
      <MurmurabaSuiteStatus />
      
      {/* BuildInfo temporarily removed - not exported from murmuraba */}
    </>
  )
}