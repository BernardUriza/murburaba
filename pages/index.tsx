import Head from 'next/head'
import React, { useState } from 'react'
import { 
  useMurmubaraEngine,
  WaveformAnalyzer,
  BuildInfo,
  AdvancedMetricsPanel,
  ErrorBoundary,
  ChunkProcessingResults
} from 'murmuraba'
import Swal from 'sweetalert2'

export default function Home() {
  // Engine configuration state with localStorage persistence
  const [engineConfig, setEngineConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('murmuraba-config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved config:', e);
        }
      }
    }
    return {
      bufferSize: 16384,
      processWindow: 1024,
      hopSize: 256,
      spectralFloorDb: -80,
      noiseFloorDb: -60,
      denoiseStrength: 0.85,
      spectralGateThreshold: 0.3,
      smoothingFactor: 0.95,
      frequencyBands: 32,
      adaptiveNoiseReduction: true,
      enableSpectralGating: true,
      enableDynamicRangeCompression: true,
      compressionRatio: 4,
      compressionThreshold: -20,
      compressionKnee: 10,
      compressionAttack: 5,
      compressionRelease: 50,
      webAudioLatencyHint: 'balanced' as 'interactive' | 'balanced' | 'playback',
      workletProcessorPath: '/static/murmuraba-processor.js',
      enableDebugLogs: false,
      enableMetrics: true,
      metricsUpdateInterval: 100,
      maxChunkRetries: 3,
      chunkRetryDelay: 500,
      enableAutoGainControl: true,
      targetLUFS: -16,
      maxGainBoost: 12,
      enableHighFrequencyRecovery: true,
      highFrequencyThreshold: 8000,
      enableTransientPreservation: true,
      transientThreshold: 0.7,
      enablePsychoacousticModel: true,
      psychoacousticMaskingCurve: 'fletcher-munson' as 'fletcher-munson' | 'equal-loudness' | 'custom'
    };
  });

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
    
    // Export Actions
    exportChunkAsWav,
    exportChunkAsMp3,
    downloadChunk,
    
    // Utility
    resetError,
    formatTime,
    getAverageNoiseReduction
  } = useMurmubaraEngine({
    autoInitialize: false,
    logLevel: 'info',
    defaultChunkDuration: 8,
    ...engineConfig
  })

  // Extract values from recordingState
  const { isRecording, isPaused, recordingTime, chunks: processedChunks } = recordingState
  
  // UI-only state
  const [chunkDuration, setChunkDuration] = useState(8)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [noiseReductionLevel, setNoiseReductionLevel] = useState(75)
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null)
  const [recordingHistory, setRecordingHistory] = useState<Array<{
    id: string;
    date: Date;
    duration: number;
    chunks: number;
    avgNoiseReduction: number;
    config: typeof engineConfig;
  }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('murmuraba-history');
      if (saved) {
        try {
          const history = JSON.parse(saved);
          return history.map((item: any) => ({
            ...item,
            date: new Date(item.date)
          }));
        } catch (e) {
          console.error('Failed to parse history:', e);
        }
      }
    }
    return [];
  });
  
  
  // Use average noise reduction from hook
  const averageNoiseReduction = getAverageNoiseReduction()
  
  // Save config to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('murmuraba-config', JSON.stringify(engineConfig));
    }
  }, [engineConfig]);
  
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
      <main className="main-container">
        <div className="prairie-grass"></div>
        {/* Floating Settings Panel */}
        {showSettings && (
          <div className="floating-panel settings-panel">
            <div className="panel-header">
              <h3>Settings</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="panel-content">
              {/* Noise Reduction Level */}
              <div className="setting-group">
                <label className="setting-label">Noise Reduction Level</label>
                <div className="radio-group">
                  {(['low', 'medium', 'high', 'auto'] as const).map(level => (
                    <label key={level} className="radio-label">
                      <input
                        type="radio"
                        name="noiseLevel"
                        checked={engineConfig.noiseReductionLevel === level}
                        onChange={() => setEngineConfig((prev: any) => ({ ...prev, noiseReductionLevel: level }))}
                        disabled={isRecording}
                      />
                      <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Algorithm Selection */}
              <div className="setting-group">
                <label className="setting-label">Processing Algorithm</label>
                <select 
                  value={engineConfig.algorithm}
                  onChange={(e) => setEngineConfig((prev: any) => ({ 
                    ...prev, 
                    algorithm: e.target.value as 'rnnoise' | 'spectral' | 'adaptive' 
                  }))}
                  disabled={isRecording}
                  className="select-input"
                >
                  <option value="rnnoise">RNNoise (Neural Network)</option>
                  <option value="spectral">Spectral Subtraction</option>
                  <option value="adaptive">Adaptive Filtering</option>
                </select>
              </div>

              {/* Buffer Size */}
              <div className="setting-group">
                <label className="setting-label">Buffer Size</label>
                <select 
                  value={engineConfig.bufferSize}
                  onChange={(e) => setEngineConfig((prev: any) => ({ 
                    ...prev, 
                    bufferSize: Number(e.target.value) as 256 | 512 | 1024 | 2048 | 4096
                  }))}
                  disabled={isRecording}
                  className="select-input"
                >
                  <option value="256">256 samples (lowest latency)</option>
                  <option value="512">512 samples (balanced)</option>
                  <option value="1024">1024 samples (recommended)</option>
                  <option value="2048">2048 samples (better quality)</option>
                  <option value="4096">4096 samples (highest quality)</option>
                </select>
              </div>

              {/* Advanced Options */}
              <div className="setting-group">
                <label className="setting-label">Performance Options</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={engineConfig.useWorker}
                    onChange={(e) => setEngineConfig((prev: any) => ({ ...prev, useWorker: e.target.checked }))}
                    disabled={isRecording}
                  />
                  <span>Use Web Worker (better performance)</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={engineConfig.allowDegraded}
                    onChange={(e) => setEngineConfig((prev: any) => ({ ...prev, allowDegraded: e.target.checked }))}
                    disabled={isRecording}
                  />
                  <span>Allow degraded mode (fallback)</span>
                </label>
              </div>
              
              {/* Chunk Duration */}
              <div className="setting-group">
                <label className="setting-label">Chunk Duration</label>
                <div className="duration-buttons">
                  {[5, 8, 10, 15, 20, 30].map(duration => (
                    <button 
                      key={duration}
                      className={`duration-btn ${chunkDuration === duration ? 'active' : ''}`}
                      onClick={() => setChunkDuration(duration)}
                      disabled={isRecording}
                    >
                      {duration}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply Button */}
              {isInitialized && (
                <div className="setting-group">
                  <button 
                    className="control-btn primary"
                    onClick={async () => {
                      await destroy();
                      await initialize();
                      Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Settings applied!',
                        showConfirmButton: false,
                        timer: 2000
                      });
                    }}
                    disabled={isRecording}
                  >
                    Apply Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header with Glassmorphism */}
        <div className="studio-header">
          <div className="header-content">
            <div className="logo-area">
              <div className="logo-icon">🌾</div>
              <div>
                <h1 className="studio-title">
              <span className="logo-emoji">🎵</span>
              Murmuraba
              <span className="version-badge">v1.3.0</span>
            </h1>
                <p className="studio-subtitle">Neural Audio Processing Engine</p>
              </div>
            </div>
          </div>
          
          {/* Engine Status Bar */}
          <div className="nav-pills">
            <button className={`nav-pill ${engineState === 'ready' ? 'active' : ''}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {engineState === 'uninitialized' && '💤 Not Initialized'}
                {engineState === 'initializing' && '🔄 Initializing...'}
                {engineState === 'ready' && '✅ Ready'}
                {engineState === 'processing' && '🎙️ Processing'}
                {engineState === 'error' && '❌ Error'}
              </span>
            </button>
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
              <span className="badge badge-recording">Recording</span>
              <span className="recording-time">{formatTime(recordingTime)}</span>
            </div>
            {isPaused && <span className="badge badge-warning">PAUSED</span>}
          </div>
        )}

        {/* Real-time Metrics Dashboard */}
        {metrics && isRecording && (
          <section className="stats-section">
            <div className="glass-card">
              <h2 className="panel-title">Real-time Processing Metrics</h2>
              
              {/* Live Audio Meter */}
              <div className="audio-meter-container">
                <div className="audio-meter">
                  <div className="meter-label">Input</div>
                  <div className="meter-bar">
                    <div 
                      className="meter-fill input-level"
                      style={{
                        width: `${metrics.inputLevel * 100}%`,
                        background: metrics.inputLevel > 0.8 ? 
                          'var(--error-main)' : 
                          metrics.inputLevel > 0.6 ? 
                            'var(--warning-main)' : 
                            'var(--grass-light)'
                      }}
                    />
                  </div>
                </div>
                <div className="audio-meter">
                  <div className="meter-label">Output</div>
                  <div className="meter-bar">
                    <div 
                      className="meter-fill output-level"
                      style={{
                        width: `${metrics.outputLevel * 100}%`,
                        background: 'var(--prairie-sky)'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🔇</div>
                  <div className="stat-content">
                    <div className="stat-value">{metrics.noiseReductionLevel.toFixed(1)}%</div>
                    <div className="stat-label">Noise Reduction</div>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill noise-reduction" 
                      style={{width: `${metrics.noiseReductionLevel}%`}}
                    ></div>
                  </div>
                </div>
              
                <div className="stat-card">
                  <div className="stat-icon">⚡</div>
                  <div className="stat-content">
                    <div className="stat-value">{metrics.processingLatency.toFixed(2)}ms</div>
                    <div className="stat-label">Latency</div>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill latency" 
                      style={{width: `${Math.min(100, metrics.processingLatency * 2)}%`}}
                    ></div>
                  </div>
                </div>
              
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-value">{(metrics.inputLevel * 100).toFixed(0)}%</div>
                    <div className="stat-label">Input Level</div>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill input" 
                      style={{width: `${metrics.inputLevel * 100}%`}}
                    ></div>
                  </div>
                </div>
              
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-content">
                    <div className="stat-value">{metrics.frameCount}</div>
                    <div className="stat-label">Frames Processed</div>
                  </div>
              </div>
            </div>
            </div>
          </section>
        )}

        {/* Control Panel */}
        {!isRecording && (
          <section className="recording-panel glass-card">
            <div className="panel-header">
              <h2 className="panel-title">Audio Controls</h2>
            </div>

            <div className="controls-grid">
              {!isInitialized && !isLoading && (
                <button 
                  className="btn btn-primary"
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
                    className="btn btn-primary"
                    onClick={handleStartRecording}
                  >
                    <span className="btn-icon">🎙️</span>
                    <span>Start Recording</span>
                  </button>
                  
                  <div className="control-group" style={{ marginTop: '1rem' }}>
                    <label className="control-label">⏱️ Chunk Duration</label>
                    <div className="nav-pills" style={{ justifyContent: 'center' }}>
                      {[5, 8, 10, 15].map(duration => (
                        <button
                          key={duration}
                          className={`nav-pill ${chunkDuration === duration ? 'active' : ''}`}
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
                    className="btn btn-secondary"
                    onClick={() => {
                      stopRecording();
                      // Save to history
                      if (processedChunks.length > 0) {
                        const newRecord = {
                          id: `rec-${Date.now()}`,
                          date: new Date(),
                          duration: recordingTime,
                          chunks: processedChunks.length,
                          avgNoiseReduction: averageNoiseReduction,
                          config: engineConfig
                        };
                        const newHistory = [newRecord, ...recordingHistory].slice(0, 10); // Keep last 10
                        setRecordingHistory(newHistory);
                        localStorage.setItem('murmuraba-history', JSON.stringify(newHistory));
                      }
                    }}
                  >
                    <span className="btn-icon">⏹️</span>
                    <span>Stop</span>
                  </button>
                  
                  {!isPaused ? (
                    <button 
                      className="btn btn-ghost"
                      onClick={pauseRecording}
                    >
                      <span className="btn-icon">⏸️</span>
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary"
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
                  className="btn btn-ghost"
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
          onExportWav={exportChunkAsWav}
          onExportMp3={exportChunkAsMp3}
          onDownloadChunk={downloadChunk}
        />

        {/* Floating Action Buttons */}
        <div className="fab-container">
          {/* Audio Control Buttons */}
          {isInitialized && !isRecording && (
            <button 
              className="fab"
              onClick={handleStartRecording}
              title="Start Recording"
            >
              🎙️
            </button>
          )}
          
          {isRecording && !isPaused && (
            <>
              <button 
                className="fab fab-secondary"
                onClick={pauseRecording}
                title="Pause Recording"
              >
                ⏸️
              </button>
              <button 
                className="fab fab-secondary"
                onClick={stopRecording}
                title="Stop Recording"
              >
                ⏹️
              </button>
            </>
          )}
          
          {isRecording && isPaused && (
            <>
              <button 
                className="fab"
                onClick={resumeRecording}
                title="Resume Recording"
              >
                ▶️
              </button>
              <button 
                className="fab fab-secondary"
                onClick={stopRecording}
                title="Stop Recording"
              >
                ⏹️
              </button>
            </>
          )}
          
          {/* Divider */}
          {isInitialized && <div className="fab-divider"></div>}
          
          {/* Settings and Metrics */}
          <button 
            className="fab fab-secondary"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            className="fab"
            onClick={() => {
              if (!diagnostics) {
                Swal.fire({
                  toast: true,
                  position: 'top-end',
                  icon: 'warning',
                  title: 'Engine not initialized',
                  text: 'Initialize the engine first to see advanced metrics',
                  showConfirmButton: false,
                  timer: 3000,
                  timerProgressBar: true
                })
                return
              }
              setShowAdvancedMetrics(!showAdvancedMetrics)
            }}
            title={showAdvancedMetrics ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
            disabled={!isInitialized || !diagnostics}
            style={{ opacity: (!isInitialized || !diagnostics) ? 0.5 : 1 }}
          >
            {showAdvancedMetrics ? '📉' : '📈'}
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