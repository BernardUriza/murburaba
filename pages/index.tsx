'use client'

import React, { useState } from 'react'
import { 
  BuildInfo,
  processFileWithMetrics,
  initializeAudioEngine,
  getEngineStatus,
  processFile,
  // UI Components
  SimpleWaveformAnalyzer,
  ChunkProcessingResults,
  AdvancedMetricsPanel
} from 'murmuraba'
import AudioDemo from '../components/AudioDemo'
import Settings from '../components/Settings'
import CopilotChat from '../components/CopilotChat'
import Swal from 'sweetalert2'

export default function App() {
  const [mounted, setMounted] = useState(false)
  
  // Ensure component is mounted before accessing browser APIs
  React.useEffect(() => {
    setMounted(true)
  }, [])
  // Engine & Processing State
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState<any>(null)
  const [chunkDuration, setChunkDuration] = useState(8)
  const [isEngineInitialized, setIsEngineInitialized] = useState(false)
  
  // UI State
  const [showAudioDemo, setShowAudioDemo] = useState(false)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null)
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCopilot, setShowCopilot] = useState(false)

  // Utility functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Initialize engine function
  const handleInitializeEngine = async () => {
    try {
      setIsProcessing(true)
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Initializing audio engine...',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
      
      await initializeAudioEngine({
        algorithm: 'spectral',
        logLevel: 'info',
        allowDegraded: true
      })
      
      setIsEngineInitialized(true)
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Audio engine initialized!',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
      
    } catch (error) {
      console.error('Engine initialization failed:', error)
      Swal.fire({
        icon: 'error',
        title: 'Engine Initialization Failed',
        text: error instanceof Error ? error.message : 'Unknown error occurred',
        confirmButtonText: 'OK'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Pure processFileWithMetrics recording
  const handleStartRecording = async () => {
    if (!isEngineInitialized) {
      Swal.fire({
        icon: 'warning',
        title: 'Engine Not Initialized',
        text: 'Please initialize the audio engine first',
        confirmButtonText: 'OK'
      })
      return
    }

    try {
      setIsProcessing(true)
      setIsRecording(true)
      
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
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      setCurrentStream(stream)
      
      // Pure processFileWithMetrics API call
      const result = await processFileWithMetrics('Use.Mic', {
        recordingDuration: chunkDuration * 1000,
        chunkOptions: {
          chunkDuration: chunkDuration * 1000,
          outputFormat: 'wav' as const
        }
      })
      
      setProcessingResults(result)
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Recording completed successfully!',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      })
      
    } catch (error) {
      console.error('Recording failed:', error)
      Swal.fire({
        icon: 'error',
        title: 'Recording Failed',
        text: error instanceof Error ? error.message : 'Unknown error occurred',
        confirmButtonText: 'OK'
      })
    } finally {
      setIsProcessing(false)
      setIsRecording(false)
      // Stop media stream
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
        setCurrentStream(null)
      }
    }
  }

  // Handle chunk expansion with selection
  const handleToggleChunkExpansion = (chunkId: string) => {
    setSelectedChunk(prev => prev === chunkId ? null : chunkId)
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
        <div className={`slide-panel-overlay ${showAudioDemo ? 'active' : ''}`} onClick={() => setShowAudioDemo(false)} />
        <div className={`slide-panel audio-demo-panel ${showAudioDemo ? 'active' : ''}`}>
          <div className="panel-header">
            <h3>🎵 Audio Demo</h3>
            <button className="close-btn" onClick={() => setShowAudioDemo(false)}>×</button>
          </div>
          <div className="panel-content">
            {showAudioDemo && (
              <AudioDemo 
                getEngineStatus={getEngineStatus}
                processFile={processFile}
                processFileWithMetrics={processFileWithMetrics}
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
            {!isEngineInitialized ? (
              <button 
                className="btn btn-primary"
                onClick={handleInitializeEngine}
                disabled={isProcessing}
              >
                <span className="btn-icon">⚡</span>
                <span>{isProcessing ? 'Initializing...' : 'Initialize Engine'}</span>
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
                      setIsRecording(false);
                      setIsProcessing(false);
                      if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                        setCurrentStream(null);
                      }
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
                    onClick={() => setChunkDuration(duration)}
                    disabled={isProcessing}
                  >
                    {duration}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Waveform Visualizer */}
        {currentStream && isRecording && (
          <section className="waveform-section glass-panel">
            <h2 className="section-title">🌊 Live Waveform Analysis</h2>
            <div className="waveform-container">
              <SimpleWaveformAnalyzer 
                stream={currentStream} 
                isActive={isRecording}
                isPaused={false}
              />
            </div>
          </section>
        )}

        {/* Chunk Processing Results */}
        {processingResults && (
          <ChunkProcessingResults
            chunks={processingResults.chunks || []}
            averageNoiseReduction={processingResults.averageVad || 0}
            selectedChunk={selectedChunk}
            onTogglePlayback={handleToggleChunkPlayback}
            onToggleExpansion={handleToggleChunkExpansion}
            onClearAll={() => setProcessingResults(null)}
            onDownloadChunk={handleDownloadChunk}
          />
        )}

        {/* Floating Action Buttons */}
        <div className="fab-container">
          {/* Audio Demo Button */}
          <button 
            className="fab fab-primary"
            onClick={() => setShowAudioDemo(!showAudioDemo)}
            title="Audio Demo"
          >
            🎵
          </button>
          
          {/* Advanced Metrics Button */}
          <button 
            className="fab"
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
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
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙️
          </button>
          
          {/* Copilot Chat Button */}
          <button 
            className="fab fab-copilot"
            onClick={() => setShowCopilot(true)}
            title="Copilot Chat"
          >
            🤖
          </button>
        </div>
        
        {/* Advanced Metrics Panel */}
        <AdvancedMetricsPanel
          isVisible={showAdvancedMetrics}
          diagnostics={isEngineInitialized ? {
            version: '2.0.0',
            engineVersion: '1.0.0',
            reactVersion: '18.0.0',
            wasmLoaded: true,
            activeProcessors: 1,
            memoryUsage: 1024 * 1024 * 10,
            processingTime: 12.5,
            engineState: 'ready' as const
          } : null}
          onClose={() => setShowAdvancedMetrics(false)}
        />
        
        {/* Settings Modal */}
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        
        {/* Copilot Chat Modal */}
        <CopilotChat isOpen={showCopilot} onClose={() => setShowCopilot(false)} />
      </main>
      
      <BuildInfo version="2.0.0" buildDate={new Date().toLocaleDateString()} />
    </>
  )
}