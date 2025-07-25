import React, { useState } from 'react'
import { 
  useMurmubaraEngine,
  BuildInfo,
  AdvancedMetricsPanel,
  ChunkProcessingResults,
  getEngineStatus,
  processFile,
  processFileWithMetrics
} from 'murmuraba'
import { SimpleWaveformAnalyzer } from '../packages/murmuraba/src/components/SimpleWaveformAnalyzer'
import Swal from 'sweetalert2'
import { WASMErrorDisplay } from './components/WASMErrorDisplay'
import AudioDemo from './components/AudioDemo'
import { CopilotChat } from './components/CopilotChat'
import { Settings } from './components/Settings'

export default function App() {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    exportChunkAsWav: _exportChunkAsWav,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    exportChunkAsMp3: _exportChunkAsMp3,
    downloadChunk,
    
    // Utility
    resetError,
    formatTime,
    getAverageNoiseReduction
  } = useMurmubaraEngine({
    autoInitialize: false,
    logLevel: 'info',
    defaultChunkDuration: 8,
    allowDegraded: true, // Allow degraded mode when WASM fails
    ...engineConfig
  })

  // Extract values from recordingState
  const { isRecording, isPaused, recordingTime, chunks: processedChunks } = recordingState
  
  // UI-only state
  const [chunkDuration, setChunkDuration] = useState(8)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCopilot, setShowCopilot] = useState(false)
  const [showAudioDemo, setShowAudioDemo] = useState(false)
  const [vadThresholds, setVadThresholds] = useState({
    silence: 0.1,
    voice: 0.5,
    clearVoice: 0.8
  })
  const [displaySettings, setDisplaySettings] = useState({
    showVadValues: true,
    showVadTimeline: true
  })
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
    console.log('🔧 handleToggleChunkExpansion called with:', chunkId)
    console.log('🔧 toggleChunkExpansion function exists:', !!toggleChunkExpansion)
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
      
      // Show success message when degraded mode is active
      if (engineState === 'degraded') {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'warning',
          title: 'Grabación iniciada en modo degradado',
          text: 'La reducción de ruido no está disponible',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        })
      }
    } catch (error) {
      console.error('Failed to start recording:', error)
      
      let errorMessage = 'No se pudo acceder al micrófono';
      let errorTitle = 'Error al iniciar grabación';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Specific handling for WASM errors
        if (error.message.includes('WASM') || error.message.includes('initialize')) {
          errorTitle = 'Error de inicialización';
          errorMessage = 'El motor de audio no pudo inicializarse. Por favor, recarga la página.';
        } else if (error.message.includes('Permission')) {
          errorTitle = 'Permiso denegado';
          errorMessage = 'Por favor, permite el acceso al micrófono para grabar.';
        }
      }
      
      Swal.fire({
        icon: 'error',
        title: errorTitle,
        text: errorMessage,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d33'
      })
    }
  }

  return (
    <>
      <main className="main-container">
        {/* Modern Slide-in Audio Demo Panel */}
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

        {/* Settings Panel */}
        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          vadThresholds={vadThresholds}
          displaySettings={displaySettings}
          onThresholdChange={setVadThresholds}
          onDisplayChange={setDisplaySettings}
        />

        {/* Copilot Chat Interface */}
        <CopilotChat
          isOpen={showCopilot}
          onClose={() => setShowCopilot(false)}
          engineConfig={engineConfig}
          setEngineConfig={setEngineConfig}
          isRecording={isRecording}
          isInitialized={isInitialized}
          onApplyChanges={async () => {
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
        />

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
            {/* Modern Status Section */}
            <div className="engine-status-modern">
              <div className={`status-indicator ${engineState}`}>
                <span className="status-pulse"></span>
                <span className="status-label">
                  {engineState === 'uninitialized' && 'offline'}
                  {engineState === 'initializing' && 'loading'}
                  {engineState === 'ready' && 'ready'}
                  {engineState === 'processing' && 'processing'}
                  {engineState === 'error' && 'error'}
                </span>
              </div>
              {diagnostics && engineState === 'ready' && (
                <div className="engine-metrics">
                  <div className="metric-item">
                    <span className="metric-value">{diagnostics.activeProcessors}</span>
                    <span className="metric-label">active</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-value">{(diagnostics.memoryUsage / 1024 / 1024).toFixed(0)}</span>
                    <span className="metric-label">MB</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-dot" data-status={diagnostics.wasmLoaded ? 'active' : 'inactive'}></span>
                    <span className="metric-label">WASM</span>
                  </div>
                </div>
              )}
            </div>
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
                      className={`meter-fill input-level ${
                        metrics.inputLevel > 0.8 ? 'high' :
                        metrics.inputLevel > 0.6 ? 'medium' : 
                        'low'
                      }`}
                      style={{
                        width: `${metrics.inputLevel * 100}%`
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
                        width: `${metrics.outputLevel * 100}%`
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
              <WASMErrorDisplay error={error} onDismiss={resetError} />
            )}
          </section>
        )}

        {/* Waveform Visualizer */}
        {currentStream && (
          <section className="waveform-section glass-panel">
            <h2 className="section-title">🌊 Live Waveform Analysis</h2>
            <div className="waveform-container">
              <SimpleWaveformAnalyzer 
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
            onClick={() => setShowAudioDemo(!showAudioDemo)}
            title="Audio Demo"
          >
            🎵
          </button>
          <button 
            className="fab fab-secondary"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            className="fab fab-secondary"
            onClick={() => setShowCopilot(!showCopilot)}
            title="Copilot Chat"
          >
            🤖
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