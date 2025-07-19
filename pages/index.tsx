import Head from 'next/head'
import { useMurmubaraEngine } from '../hooks/useMurmubaraEngine'
import { WaveformAnalyzer } from '../components/WaveformAnalyzer'
import { BuildInfo } from '../components/BuildInfo'
import { useState, useEffect, useRef } from 'react'
import type { StreamController, ChunkMetrics } from '../types'

interface ProcessedChunk extends ChunkMetrics {
  id: string
  processedAudioUrl?: string
  originalAudioUrl?: string
  isPlaying: boolean
  isExpanded: boolean
}

export default function Home() {
  const {
    isInitialized,
    isLoading,
    error,
    engineState,
    metrics,
    diagnostics,
    initialize,
    destroy,
    processStream,
    processStreamChunked,
    resetError
  } = useMurmubaraEngine({
    autoInitialize: false,
    logLevel: 'info',
    noiseReductionLevel: 'high',
    bufferSize: 2048
  })

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [chunkDuration, setChunkDuration] = useState(4)
  const [processedChunks, setProcessedChunks] = useState<ProcessedChunk[]>([])
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)
  const [originalStream, setOriginalStream] = useState<MediaStream | null>(null)
  const [streamController, setStreamController] = useState<StreamController | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [noiseReductionLevel, setNoiseReductionLevel] = useState(75)
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const originalRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording && !isPaused) {
      const startTime = Date.now() - recordingTime * 1000
      interval = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000))
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused, recordingTime])

  const startRecording = async () => {
    try {
      if (!isInitialized) {
        await initialize()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        } 
      })

      setOriginalStream(stream)
      
      // Set the stream for the waveform to display
      setCurrentStream(stream)

      // Store chunks and their recordings
      const chunkRecordings = new Map<string, { processed: Blob[], original: Blob[], finalized: boolean }>()
      let recordingChunkId: string | null = null
      let previousChunkId: string | null = null
      
      // Process with chunking
      const controller = await processStreamChunked(stream, {
        chunkDuration: chunkDuration * 1000,
        onChunkProcessed: (chunk) => {
          const chunkId = `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const enhancedChunk: ProcessedChunk = {
            ...chunk,
            id: chunkId,
            isPlaying: false,
            isExpanded: false
          }
          setProcessedChunks(prev => [...prev, enhancedChunk])
          
          // Finalize previous chunk if exists
          if (previousChunkId && chunkRecordings.has(previousChunkId)) {
            const prevRecording = chunkRecordings.get(previousChunkId)!
            prevRecording.finalized = true
          }
          
          // Initialize recording storage for this chunk
          chunkRecordings.set(chunkId, { processed: [], original: [], finalized: false })
          previousChunkId = recordingChunkId
          recordingChunkId = chunkId
        }
      })

      setStreamController(controller)

      // Record processed audio
      const processedStream = controller.stream
      const recorder = new MediaRecorder(processedStream, { mimeType: 'audio/webm' })
      const originalRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && recordingChunkId) {
          const recordings = chunkRecordings.get(recordingChunkId)
          if (recordings) {
            recordings.processed.push(event.data)
          }
        }
      }
      
      originalRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && recordingChunkId) {
          const recordings = chunkRecordings.get(recordingChunkId)
          if (recordings) {
            recordings.original.push(event.data)
          }
        }
      }

      // Start continuous recording with timeslice
      recorder.start(100) // collect data every 100ms
      originalRecorder.start(100)
      
      // Process recorded chunks when each chunk completes
      const processRecordedChunks = setInterval(() => {
        chunkRecordings.forEach((recordings, chunkId) => {
          // Process if we have any data and chunk is finalized or has enough data
          if ((recordings.processed.length > 0 || recordings.original.length > 0) && 
              (recordings.finalized || recordings.processed.length > 5)) {
            // Create blobs from accumulated data
            const processedBlob = recordings.processed.length > 0 
              ? new Blob(recordings.processed, { type: 'audio/webm' })
              : null
            const originalBlob = recordings.original.length > 0
              ? new Blob(recordings.original, { type: 'audio/webm' })
              : null
            
            // Create URLs if blobs exist
            const processedUrl = processedBlob ? URL.createObjectURL(processedBlob) : undefined
            const originalUrl = originalBlob ? URL.createObjectURL(originalBlob) : undefined
            
            // Update chunk with URLs (keep existing URLs if new ones are undefined)
            setProcessedChunks(prev => prev.map(chunk => {
              if (chunk.id === chunkId) {
                return {
                  ...chunk,
                  processedAudioUrl: processedUrl || chunk.processedAudioUrl,
                  originalAudioUrl: originalUrl || chunk.originalAudioUrl
                }
              }
              return chunk
            }))
            
            // Don't clear recordings yet - keep accumulating
            // Only clear when chunk is complete or recording stops
          }
        })
      }, 1000) // Check every second
      
      // Store interval ID and recordings map for cleanup
      mediaRecorderRef.current = recorder
      originalRecorderRef.current = originalRecorder
      ;(window as any).processRecordedChunksInterval = processRecordedChunks
      ;(window as any).chunkRecordings = chunkRecordings
      
      setIsRecording(true)
      setRecordingTime(0)
    } catch (err) {
      console.error('Error starting recording:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    if (originalRecorderRef.current) {
      originalRecorderRef.current.stop()
    }
    if (streamController) {
      streamController.stop()
    }
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop())
    }
    if (originalStream) {
      originalStream.getTracks().forEach(track => track.stop())
    }
    
    // Finalize all pending recordings before clearing
    if ((window as any).chunkRecordings) {
      const recordings = (window as any).chunkRecordings as Map<string, any>
      recordings.forEach((recording) => {
        recording.finalized = true
      })
      // Give time for final processing
      setTimeout(() => {
        recordings.clear()
      }, 1500)
    }
    
    // Clear the processing interval
    if ((window as any).processRecordedChunksInterval) {
      clearInterval((window as any).processRecordedChunksInterval)
      delete (window as any).processRecordedChunksInterval
    }
    
    setIsRecording(false)
    setIsPaused(false)
    setStreamController(null)
    setCurrentStream(null)
    setOriginalStream(null)
  }

  const pauseRecording = () => {
    if (streamController && !isPaused) {
      streamController.pause()
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause()
      }
      if (originalRecorderRef.current?.state === 'recording') {
        originalRecorderRef.current.pause()
      }
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (streamController && isPaused) {
      streamController.resume()
      if (mediaRecorderRef.current?.state === 'paused') {
        mediaRecorderRef.current.resume()
      }
      if (originalRecorderRef.current?.state === 'paused') {
        originalRecorderRef.current.resume()
      }
      setIsPaused(false)
    }
  }

  const clearRecordings = () => {
    processedChunks.forEach(chunk => {
      if (chunk.processedAudioUrl) URL.revokeObjectURL(chunk.processedAudioUrl)
      if (chunk.originalAudioUrl) URL.revokeObjectURL(chunk.originalAudioUrl)
    })
    setProcessedChunks([])
  }

  const toggleChunkPlayback = (chunkId: string, audioType: 'processed' | 'original') => {
    const chunk = processedChunks.find(c => c.id === chunkId)
    if (!chunk) return

    const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl
    if (!audioUrl) return

    const audioKey = `${chunkId}-${audioType}`
    
    if (!audioRefs.current[audioKey]) {
      audioRefs.current[audioKey] = new Audio(audioUrl)
      audioRefs.current[audioKey].onended = () => {
        setProcessedChunks(prev => prev.map(c => 
          c.id === chunkId ? { ...c, isPlaying: false } : c
        ))
      }
    }

    const audio = audioRefs.current[audioKey]
    
    if (chunk.isPlaying) {
      audio.pause()
      audio.currentTime = 0
      setProcessedChunks(prev => prev.map(c => 
        c.id === chunkId ? { ...c, isPlaying: false } : c
      ))
    } else {
      // Stop all other audio
      Object.values(audioRefs.current).forEach(a => {
        a.pause()
        a.currentTime = 0
      })
      setProcessedChunks(prev => prev.map(c => ({ ...c, isPlaying: false })))
      
      // Play this audio
      audio.play()
      setProcessedChunks(prev => prev.map(c => 
        c.id === chunkId ? { ...c, isPlaying: true } : c
      ))
    }
  }

  const toggleChunkExpansion = (chunkId: string) => {
    setProcessedChunks(prev => prev.map(c => {
      if (c.id === chunkId) {
        return { ...c, isExpanded: !c.isExpanded };
      } else {
        // Close other chunks when opening a new one
        return { ...c, isExpanded: false };
      }
    }))
    setSelectedChunk(chunkId)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const averageNoiseReduction = processedChunks.length > 0
    ? processedChunks.reduce((acc, chunk) => acc + chunk.noiseRemoved, 0) / processedChunks.length
    : 0

  return (
    <>
      <Head>
        <title>Murmuraba Studio v0.1.2 | 🎙️ Next-Gen Audio Processing</title>
        <meta name="description" content="Real-time neural audio enhancement with advanced chunk processing" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="modern-container">
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
                  {[2, 4, 5, 10].map(duration => (
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
              <span className="version-badge">v0.1.2</span>
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
        <section className="control-panel glass-panel">
          <div className="controls-header">
            <h2 className="section-title">🎛️ Audio Controls</h2>
            {isRecording && (
              <div className="recording-indicator pulse">
                <span className="recording-dot"></span>
                <span className="recording-time">{formatTime(recordingTime)}</span>
              </div>
            )}
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
                  onClick={startRecording}
                >
                  <span className="btn-icon">🎙️</span>
                  <span>Start Recording</span>
                </button>
                
                <div className="quick-settings">
                  <span className="setting-label">⏱️ Chunks:</span>
                  <div className="chunk-duration-pills">
                    {[2, 4, 5, 10].map(duration => (
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
        {processedChunks.length > 0 && (
          <section className="chunks-section glass-panel">
            <div className="chunks-header">
              <h2 className="section-title">
                🎵 Processed Chunks ({processedChunks.length})
              </h2>
              <div className="chunks-stats">
                <span className="stat-badge">
                  📉 Avg Reduction: {averageNoiseReduction.toFixed(1)}%
                </span>
                <button 
                  className="control-btn secondary clear-btn"
                  onClick={clearRecordings}
                >
                  <span>🧹 Clear All</span>
                </button>
              </div>
            </div>
            
            <div className="chunks-grid">
              {processedChunks.map((chunk, index) => (
                <div 
                  key={chunk.id} 
                  className={`chunk-card ${chunk.isExpanded ? 'expanded' : ''} ${chunk.isPlaying ? 'playing' : ''}`}
                >
                  <div className="chunk-header" onClick={() => toggleChunkExpansion(chunk.id)} style={{ cursor: 'pointer' }}>
                    <span className="chunk-number">
                      <span className="chunk-icon">🎼</span>
                      Chunk #{index + 1}
                    </span>
                    <span className="chunk-duration">
                      ⏱️ {(chunk.duration / 1000).toFixed(1)}s
                    </span>
                  </div>
                  
                  <div className="chunk-metrics" onClick={() => toggleChunkExpansion(chunk.id)} style={{ cursor: 'pointer' }}>
                    <div className="metric-row">
                      <span className="metric-icon">🔇</span>
                      <span className="metric-text">
                        {chunk.noiseRemoved.toFixed(1)}% noise removed
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-icon">⚡</span>
                      <span className="metric-text">
                        {chunk.metrics.processingLatency.toFixed(0)}ms latency
                      </span>
                    </div>
                  </div>
                  
                  <div className="chunk-visualization" onClick={() => toggleChunkExpansion(chunk.id)} style={{ cursor: 'pointer' }}>
                    <div className="noise-meter">
                      <div 
                        className="noise-fill"
                        style={{
                          width: `${chunk.noiseRemoved}%`,
                          background: `linear-gradient(90deg, 
                            hsl(${120 - chunk.noiseRemoved * 1.2}, 70%, 50%) 0%, 
                            hsl(${120 - chunk.noiseRemoved * 0.6}, 70%, 60%) 100%)`
                        }}
                      ></div>
                      <span className="noise-label">{chunk.noiseRemoved.toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  {chunk.isExpanded && (
                    <div className="chunk-controls">
                      <h4>🎧 Compare Audio</h4>
                      <div className="audio-comparison">
                        <button 
                          className={`audio-btn original ${chunk.isPlaying && selectedChunk === chunk.id ? 'active' : ''}`}
                          onClick={() => toggleChunkPlayback(chunk.id, 'original')}
                          disabled={!chunk.originalAudioUrl}
                        >
                          <span className="audio-icon">🔊</span>
                          <span>Original</span>
                        </button>
                        <button 
                          className={`audio-btn processed ${chunk.isPlaying && selectedChunk === chunk.id ? 'active' : ''}`}
                          onClick={() => toggleChunkPlayback(chunk.id, 'processed')}
                          disabled={!chunk.processedAudioUrl}
                        >
                          <span className="audio-icon">🎵</span>
                          <span>Enhanced</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Floating Action Buttons */}
        <div className="floating-button-group">
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
        {showAdvancedMetrics && diagnostics && (
          <div className="floating-panel metrics-panel">
            <div className="panel-header">
              <h3>🔬 Engine Diagnostics</h3>
              <button className="close-btn" onClick={() => setShowAdvancedMetrics(false)}>✕</button>
            </div>
            <div className="diagnostics-grid">
              <div className="diagnostic-item">
                <span className="diag-label">Version:</span>
                <span className="diag-value">{diagnostics.engineVersion}</span>
              </div>
              <div className="diagnostic-item">
                <span className="diag-label">WASM Status:</span>
                <span className="diag-value">{diagnostics.wasmLoaded ? '✅ Loaded' : '❌ Not Loaded'}</span>
              </div>
              <div className="diagnostic-item">
                <span className="diag-label">Active Processors:</span>
                <span className="diag-value">{diagnostics.activeProcessors}</span>
              </div>
              <div className="diagnostic-item">
                <span className="diag-label">Memory Usage:</span>
                <span className="diag-value">{(diagnostics.memoryUsage / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="diagnostic-item">
                <span className="diag-label">Processing Time:</span>
                <span className="diag-value">{diagnostics.processingTime.toFixed(2)}ms</span>
              </div>
              <div className="diagnostic-item">
                <span className="diag-label">Engine State:</span>
                <span className="diag-value state">{diagnostics.engineState}</span>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <BuildInfo version="0.1.2" buildDate={new Date().toLocaleDateString()} />

      <style jsx>{`
        .modern-container {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
          color: #ffffff;
          position: relative;
          overflow-x: hidden;
        }

        /* Animations */
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(102, 126, 234, 0.5); }
          50% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.8), 0 0 30px rgba(102, 126, 234, 0.5); }
          100% { box-shadow: 0 0 5px rgba(102, 126, 234, 0.5); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .pulse { animation: pulse 2s infinite; }
        .glow { animation: glow 3s infinite; }
        .shake { animation: shake 0.5s; }

        /* Floating Panel */
        .floating-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(30, 30, 40, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          min-width: 400px;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .panel-header h3 {
          font-size: 1.5rem;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 1.5rem;
          cursor: pointer;
          transition: color 0.3s;
        }

        .close-btn:hover {
          color: #fff;
        }

        .panel-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .setting-group label {
          font-size: 0.9rem;
          color: #aaa;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Sliders */
        .slider {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          margin: 0.5rem 0;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          transition: all 0.3s;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
        }

        .slider-value {
          display: inline-block;
          min-width: 50px;
          text-align: center;
          font-weight: 700;
          color: #667eea;
          font-size: 1.1rem;
        }

        .duration-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .duration-btn {
          flex: 1;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          transition: all 0.3s;
        }

        .duration-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }

        /* Glass Header */
        .glass-header {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
        }

        .glass-header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
          animation: float 20s infinite;
        }

        .header-content {
          text-align: center;
          margin-bottom: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .studio-title {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }

        .logo-emoji {
          font-size: 3.5rem;
          animation: float 3s infinite;
        }

        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .version-badge {
          font-size: 1rem;
          background: rgba(102, 126, 234, 0.2);
          color: #667eea;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 600;
        }

        .studio-subtitle {
          color: #888;
          font-size: 1.2rem;
        }

        .engine-status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          position: relative;
          z-index: 1;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #4caf50;
          animation: pulse 2s infinite;
        }

        .status-indicator.uninitialized .status-dot { background: #666; }
        .status-indicator.initializing .status-dot { background: #ff9800; }
        .status-indicator.ready .status-dot { background: #4caf50; }
        .status-indicator.processing .status-dot { background: #2196f3; }
        .status-indicator.error .status-dot { background: #f44336; }

        .engine-info {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
        }

        .info-badge {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .settings-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
        }

        .settings-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(90deg);
        }

        /* Glass Panel */
        .glass-panel {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Metrics Dashboard */
        .metrics-dashboard {
          animation: slideIn 0.5s ease-out;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .metric-card {
          background: rgba(0, 0, 0, 0.3);
          padding: 1.5rem;
          border-radius: 15px;
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }

        .metric-card:hover {
          transform: translateY(-5px);
        }

        .metric-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 900;
          color: #667eea;
          margin-bottom: 0.5rem;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
        }

        .metric-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .metric-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .metric-fill.noise-reduction { background: linear-gradient(90deg, #667eea, #764ba2); }
        .metric-fill.latency { background: linear-gradient(90deg, #f093fb, #f5576c); }
        .metric-fill.input { background: linear-gradient(90deg, #4facfe, #00f2fe); }

        /* Control Panel */
        .controls-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 0, 0, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 0, 0, 0.3);
        }

        .recording-dot {
          width: 12px;
          height: 12px;
          background: #ff0000;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        .controls-grid {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .control-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .control-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .control-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .control-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .control-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .control-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .control-btn.stop {
          background: #f44336;
        }

        .control-btn.pause {
          background: #ff9800;
        }

        .control-btn.resume {
          background: #4caf50;
        }

        .control-btn.danger {
          background: rgba(244, 67, 54, 0.2);
          border: 1px solid #f44336;
          color: #f44336;
        }

        .recording-controls {
          display: flex;
          align-items: center;
          gap: 20px;
          background: rgba(255, 255, 255, 0.05);
          padding: 16px 24px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-icon {
          font-size: 1.2rem;
        }

        .quick-settings {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
        }

        .setting-label {
          font-size: 0.875rem;
          color: #888;
        }

        .chunk-duration-pills {
          display: flex;
          gap: 0.5rem;
        }

        .pill {
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .pill.active {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }

        .loading-state {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(102, 126, 234, 0.3);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          background: rgba(244, 67, 54, 0.2);
          border: 1px solid #f44336;
          color: #f44336;
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
        }

        .error-dismiss {
          background: none;
          border: none;
          color: #f44336;
          cursor: pointer;
          font-size: 1.2rem;
        }

        /* Waveform Section */
        .waveform-section {
          animation: slideIn 0.5s ease-out;
        }

        .waveform-container {
          position: relative;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          padding: 1rem;
          overflow: hidden;
        }

        .paused-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(0, 0, 0, 0.8);
          padding: 1rem 2rem;
          border-radius: 10px;
          font-size: 1.5rem;
          color: #ff9800;
        }

        .pause-icon {
          font-size: 2rem;
        }

        /* Chunks Section */
        .chunks-section {
          animation: slideIn 0.5s ease-out;
        }

        .chunks-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .chunks-stats {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-badge {
          background: rgba(102, 126, 234, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          color: #667eea;
        }

        .chunks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .chunk-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .chunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .chunk-card:hover::before {
          opacity: 1;
        }

        .chunk-card:hover {
          transform: translateY(-5px);
          border-color: rgba(102, 126, 234, 0.5);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
        }

        .chunk-card.expanded {
          grid-column: span 2;
        }

        .chunk-card.playing {
          border-color: #4caf50;
          animation: pulse 2s infinite;
        }

        .chunk-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .chunk-number {
          font-weight: 700;
          color: #667eea;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .chunk-icon {
          font-size: 1.2rem;
        }

        .chunk-duration {
          color: #888;
          font-size: 0.875rem;
        }

        .chunk-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .metric-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .chunk-visualization {
          margin: 1rem 0;
        }

        .noise-meter {
          height: 40px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          position: relative;
          overflow: hidden;
        }

        .noise-fill {
          height: 100%;
          border-radius: 20px;
          transition: all 0.5s ease;
          position: relative;
        }

        .noise-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 700;
          color: white;
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }

        .chunk-controls {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chunk-controls h4 {
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .audio-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .audio-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .audio-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .audio-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .audio-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          animation: pulse 2s infinite;
        }

        .audio-icon {
          font-size: 2rem;
        }

        /* Floating Button Group */
        .floating-button-group {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          z-index: 999;
        }

        .floating-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .floating-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .floating-btn:hover::before {
          width: 100px;
          height: 100px;
        }

        .floating-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .settings-fab {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .metrics-fab {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .fab-icon {
          font-size: 1.5rem;
          z-index: 1;
        }

        .metrics-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          max-width: 90vw;
          max-height: 80vh;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .floating-button-group {
            bottom: 1rem;
            right: 1rem;
          }
          
          .metrics-panel {
            width: calc(100% - 2rem);
            max-width: calc(100% - 2rem);
          }
        }

        .diagnostics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .diagnostic-item {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .diag-label {
          color: #888;
          font-size: 0.875rem;
        }

        .diag-value {
          font-weight: 700;
          color: #667eea;
        }

        .diag-value.state {
          text-transform: uppercase;
          font-size: 0.875rem;
        }

        :root {
          --accent-color: #667eea;
          --panel-bg: rgba(255, 255, 255, 0.05);
        }

        @media (max-width: 768px) {
          .chunks-grid {
            grid-template-columns: 1fr;
          }
          
          .chunk-card.expanded {
            grid-column: span 1;
          }
          
          .studio-title {
            font-size: 2rem;
          }
          
          .floating-panel {
            min-width: 90%;
            max-width: 90%;
          }
        }
      `}</style>
    </>
  )
}