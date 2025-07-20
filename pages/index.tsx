import Head from 'next/head'
import { useMurmubaraEngine } from 'murmuraba'
import { WaveformAnalyzer } from '../components/WaveformAnalyzer'
import { BuildInfo } from '../components/BuildInfo'
import { SyncedWaveforms } from '../components/SyncedWaveforms'
import { AdvancedMetricsPanel } from '../components/AdvancedMetricsPanel'
import { ChunkProcessingResults } from '../components/ChunkProcessingResults'
import { useState } from 'react'
import Swal from 'sweetalert2'
import styles from '../styles/Home.module.css'

export default function Home() {
  const {
    // State
    isInitialized,
    isLoading,
    error,
    engineState,
    metrics,
    diagnostics,
    
    // Recording State
    recordingState,
    currentStream,
    
    // Actions
    initialize,
    destroy,
    
    // Recording Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecordings,
    
    // Audio Playback Actions
    toggleChunkPlayback,
    toggleChunkExpansion,
    
    // Utility
    resetError,
    formatTime,
    getAverageNoiseReduction
  } = useMurmubaraEngine({
    autoInitialize: false,
    logLevel: 'info',
    noiseReductionLevel: 'high',
    bufferSize: 2048,
    defaultChunkDuration: 8
  })

  // Extract values from recordingState
  const { isRecording, isPaused, recordingTime, chunks: processedChunks } = recordingState
  
  // UI-only state
  const [chunkDuration, setChunkDuration] = useState(8)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [noiseReductionLevel, setNoiseReductionLevel] = useState(75)
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null)
  
  // Use average noise reduction from hook
  const averageNoiseReduction = getAverageNoiseReduction()
  
  // Handle chunk expansion with selection
  const handleToggleChunkExpansion = (chunkId: string) => {
    toggleChunkExpansion(chunkId)
    setSelectedChunk(chunkId)
  }
  
  // Simple wrapper for start recording with chunk duration
  const handleStartRecording = async () => {
    try {
      // Show initiating message
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Iniciando grabación...',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
      
      await startRecording(chunkDuration)
    } catch (error) {
      console.error('Failed to start recording:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Error al iniciar grabación',
        text: error instanceof Error ? error.message : 'No se pudo acceder al micrófono',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      })
    }
  }

  return (
    <>
      <Head>
        <title>Murmuraba Studio v1.3.0 | 🎙️ Next-Gen Audio Processing</title>
        <meta name="description" content="Real-time neural audio enhancement with advanced chunk processing" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={styles.modernContainer}>
        {/* Floating Settings Panel */}
        {showSettings && (
          <div className="floating-panel settings-panel">
            <div className="panel-header">
              <h3>⚙️ Settings</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="panel-content">
              <div className="setting-group">
                <label>🔇 Noise Reduction Level</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={noiseReductionLevel}
                    onChange={(e) => setNoiseReductionLevel(Number(e.target.value))}
                    className="slider noise-slider"
                    style={{ flex: 1 }}
                  />
                  <span className="slider-value">{noiseReductionLevel}%</span>
                </div>
              </div>
              <div className="setting-group">
                <label>⏱️ Chunk Duration</label>
                <div className="duration-buttons">
                  {[5, 8, 10, 15, 20, 30].map(duration => (
                    <button 
                      key={duration}
                      className={`duration-btn ${chunkDuration === duration ? 'active' : ''}`}
                      onClick={() => setChunkDuration(duration)}
                    >
                      {duration}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header with Glassmorphism */}
        <div className="glass-header">
          <div className="header-content">
            <h1 className="studio-title">
              <span className="logo-emoji">🎵</span>
              <span className="gradient-text">Murmuraba</span>
              <span className="version-badge">v1.3.0</span>
            </h1>
            <p className="studio-subtitle">✨ Neural Audio Processing Engine</p>
          </div>
          
          {/* Engine Status Bar */}
          <div className="engine-status-bar">
            <div className={`status-indicator ${engineState}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {engineState === 'uninitialized' && '💤 Not Initialized'}
                {engineState === 'initializing' && '🔄 Initializing...'}
                {engineState === 'ready' && '✅ Ready'}
                {engineState === 'processing' && '🎙️ Processing'}
                {engineState === 'error' && '❌ Error'}
              </span>
            </div>
            {diagnostics && (
              <div className="engine-info">
                <span className="info-badge">
                  {diagnostics.wasmLoaded ? '🟢' : '🔴'} WASM
                </span>
                <span className="info-badge">
                  👥 {diagnostics.activeProcessors} Active
                </span>
                <span className="info-badge">
                  💾 {(diagnostics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recording Status Bar */}
        {isRecording && (
          <div className="recording-status-bar">
            <div className="recording-indicator pulse">
              <span className="recording-dot"></span>
              <span className="recording-label">Recording</span>
              <span className="recording-time">{formatTime(recordingTime)}</span>
            </div>
            {isPaused && <span className="pause-badge">PAUSED</span>}
          </div>
        )}

        {/* Real-time Metrics Dashboard */}
        {metrics && isRecording && (
          <section className="metrics-dashboard glass-panel">
            <h2 className="section-title">📊 Real-time Processing Metrics</h2>
            <div className="metrics-grid">
              <div className="metric-card glow">
                <div className="metric-icon">🔇</div>
                <div className="metric-value">{metrics.noiseReductionLevel.toFixed(1)}%</div>
                <div className="metric-label">Noise Reduction</div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill noise-reduction" 
                    style={{width: `${metrics.noiseReductionLevel}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="metric-card glow">
                <div className="metric-icon">⚡</div>
                <div className="metric-value">{metrics.processingLatency.toFixed(2)}ms</div>
                <div className="metric-label">Latency</div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill latency" 
                    style={{width: `${Math.min(100, metrics.processingLatency * 2)}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="metric-card glow">
                <div className="metric-icon">📊</div>
                <div className="metric-value">{(metrics.inputLevel * 100).toFixed(0)}%</div>
                <div className="metric-label">Input Level</div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill input" 
                    style={{width: `${metrics.inputLevel * 100}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="metric-card glow">
                <div className="metric-icon">🎯</div>
                <div className="metric-value">{metrics.frameCount}</div>
                <div className="metric-label">Frames Processed</div>
              </div>
            </div>
          </section>
        )}

        {/* Control Panel */}
        {!isRecording && (
          <section className="control-panel glass-panel">
            <div className="controls-header">
              <h2 className="section-title">🎛️ Audio Controls</h2>
            </div>

            <div className="controls-grid">
              {!isInitialized && !isLoading && (
                <button 
                  className="control-btn primary initialize-btn glow"
                  onClick={initialize}
                >
                  <span className="btn-icon">⚡</span>
                  <span>Initialize Engine</span>
                </button>
              )}

              {isLoading && (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <span>🚀 Initializing Neural Engine...</span>
                </div>
              )}

              {isInitialized && !isRecording && (
                <>
                  <button 
                    className="control-btn primary record-btn pulse"
                    onClick={handleStartRecording}
                  >
                    <span className="btn-icon">🎙️</span>
                    <span>Start Recording</span>
                  </button>
                  
                  <div className="quick-settings">
                    <span className="setting-label">⏱️ Chunks:</span>
                    <div className="chunk-duration-pills">
                      {[5, 8, 10, 15].map(duration => (
                        <button
                          key={duration}
                          className={`pill ${chunkDuration === duration ? 'active' : ''}`}
                          onClick={() => setChunkDuration(duration)}
                        >
                          {duration}s
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {isRecording && (
                <div className="recording-controls">
                  <button 
                    className="control-btn stop"
                    onClick={stopRecording}
                  >
                    <span className="btn-icon">⏹️</span>
                    <span>Stop</span>
                  </button>
                  
                  {!isPaused ? (
                    <button 
                      className="control-btn pause"
                      onClick={pauseRecording}
                    >
                      <span className="btn-icon">⏸️</span>
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button 
                      className="control-btn resume pulse"
                      onClick={resumeRecording}
                    >
                      <span className="btn-icon">▶️</span>
                      <span>Resume</span>
                    </button>
                  )}
                </div>
              )}

              {isInitialized && !isRecording && (
                <button 
                  className="control-btn danger destroy-btn"
                  onClick={() => destroy(true)}
                >
                  <span className="btn-icon">🗑️</span>
                  <span>Destroy Engine</span>
                </button>
              )}
            </div>

            {error && (
              <div className="error-message shake">
                <span>⚠️ {error}</span>
                <button onClick={resetError} className="error-dismiss">✕</button>
              </div>
            )}
          </section>
        )}

        {/* Waveform Visualizer */}
        {currentStream && (
          <section className="waveform-section glass-panel">
            <h2 className="section-title">🌊 Live Waveform Analysis</h2>
            <div className="waveform-container">
              <WaveformAnalyzer 
                stream={currentStream} 
                isActive={isRecording && !isPaused}
                isPaused={isPaused}
              />
              {isPaused && (
                <div className="paused-overlay">
                  <span className="pause-icon">⏸️</span>
                  <span>Paused</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Chunk Processing Results */}
        <ChunkProcessingResults
          chunks={processedChunks}
          averageNoiseReduction={averageNoiseReduction}
          selectedChunk={selectedChunk}
          onTogglePlayback={toggleChunkPlayback}
          onToggleExpansion={handleToggleChunkExpansion}
          onClearAll={clearRecordings}
        />

        {/* Floating Action Buttons */}
        <div className="floating-button-group">
          {/* Audio Control Buttons */}
          {isInitialized && !isRecording && (
            <button 
              className="floating-btn record-fab pulse"
              onClick={handleStartRecording}
              title="Start Recording"
            >
              <span className="fab-icon">🎙️</span>
            </button>
          )}
          
          {isRecording && !isPaused && (
            <>
              <button 
                className="floating-btn pause-fab"
                onClick={pauseRecording}
                title="Pause Recording"
              >
                <span className="fab-icon">⏸️</span>
              </button>
              <button 
                className="floating-btn stop-fab"
                onClick={stopRecording}
                title="Stop Recording"
              >
                <span className="fab-icon">⏹️</span>
              </button>
            </>
          )}
          
          {isRecording && isPaused && (
            <>
              <button 
                className="floating-btn resume-fab pulse"
                onClick={resumeRecording}
                title="Resume Recording"
              >
                <span className="fab-icon">▶️</span>
              </button>
              <button 
                className="floating-btn stop-fab"
                onClick={stopRecording}
                title="Stop Recording"
              >
                <span className="fab-icon">⏹️</span>
              </button>
            </>
          )}
          
          {/* Divider */}
          {isInitialized && <div className="fab-divider"></div>}
          
          {/* Settings and Metrics */}
          <button 
            className="floating-btn settings-fab"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <span className="fab-icon">⚙️</span>
          </button>
          <button 
            className="floating-btn metrics-fab"
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            title={showAdvancedMetrics ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
          >
            <span className="fab-icon">{showAdvancedMetrics ? '📉' : '📈'}</span>
          </button>
        </div>
        
        {/* Advanced Metrics Panel */}
        <AdvancedMetricsPanel
          isVisible={showAdvancedMetrics}
          diagnostics={diagnostics}
          onClose={() => setShowAdvancedMetrics(false)}
        />
      </main>
      
      <BuildInfo version="1.3.0" buildDate={new Date().toLocaleDateString()} />

    </>
  )
}