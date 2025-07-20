import Head from 'next/head'
import { useMurmubaraEngine } from '../hooks/useMurmubaraEngine'
import { WaveformAnalyzer } from '../components/WaveformAnalyzer'
import { BuildInfo } from '../components/BuildInfo'
import { SyncedWaveforms } from '../components/SyncedWaveforms'
import { useState, useEffect, useRef } from 'react'
import type { StreamController, ChunkMetrics } from '../types'
import { getAudioConverter, AudioConverter } from '../utils/audioConverter'
import Swal from 'sweetalert2'

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
  const [chunkDuration, setChunkDuration] = useState(8)
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

      // Record processed audio - detect supported mime type
      const processedStream = controller.stream
      
      // Check for supported audio formats
      const mimeType = (() => {
        // Note: Even if MediaRecorder says it supports MP4, it might not work properly
        // So we'll stick with WebM which is more reliable for MediaRecorder
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
        if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
        if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
        return 'audio/webm'; // fallback
      })()
      
      console.log('Using MIME type for recording:', mimeType)
      
      // Store the mime type globally for later use
      ;(window as any).recordingMimeType = mimeType
      
      const recorder = new MediaRecorder(processedStream, { mimeType })
      const originalRecorder = new MediaRecorder(stream, { mimeType })
      
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
      
      // Add onstop handlers to ensure proper finalization
      recorder.onstop = () => {
        console.log('MediaRecorder stopped, finalizing recordings...')
      }
      
      originalRecorder.onstop = () => {
        console.log('Original MediaRecorder stopped')
      }

      // Start continuous recording with timeslice
      recorder.start(100) // collect data every 100ms
      originalRecorder.start(100)
      
      // Save recorder references
      mediaRecorderRef.current = recorder
      originalRecorderRef.current = originalRecorder
      
      // Process recorded chunks when each chunk completes
      const processRecordedChunks = setInterval(() => {
        chunkRecordings.forEach((recordings, chunkId) => {
          // Process if we have any data and chunk is finalized or has enough data
          if ((recordings.processed.length > 0 || recordings.original.length > 0) && 
              (recordings.finalized || recordings.processed.length > 5)) {
            // Create blobs from accumulated data with correct mime type
            const mimeType = (window as any).recordingMimeType || 'audio/webm'
            const processedBlob = recordings.processed.length > 0 
              ? new Blob(recordings.processed, { type: mimeType })
              : null
            const originalBlob = recordings.original.length > 0
              ? new Blob(recordings.original, { type: mimeType })
              : null
            
            console.log(`Creating URLs for chunk ${chunkId}:`, {
              processedDataChunks: recordings.processed.length,
              originalDataChunks: recordings.original.length,
              processedBlobSize: processedBlob?.size,
              originalBlobSize: originalBlob?.size
            })
            
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
      ;(window as any).recordingMimeType = mimeType // Store mime type for blob creation
      
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

  const toggleChunkPlayback = async (chunkId: string, audioType: 'processed' | 'original') => {
    const chunk = processedChunks.find(c => c.id === chunkId)
    if (!chunk) {
      console.error('Chunk not found:', chunkId)
      return
    }

    const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl
    if (!audioUrl) {
      console.error(`No ${audioType} audio URL for chunk:`, chunkId)
      console.log('Chunk data:', chunk)
      return
    }

    const audioKey = `${chunkId}-${audioType}`
    
    // Check if we need to convert the audio
    let playableUrl = audioUrl
    const mimeType = (window as any).recordingMimeType || 'audio/webm'
    
    // Always convert to WAV for maximum compatibility
    console.log('Converting audio from', mimeType, 'to WAV for playback...')
    try {
      const converter = getAudioConverter()
      playableUrl = await converter.convertBlobUrl(audioUrl)
      console.log('Audio converted successfully')
    } catch (error) {
      console.error('Failed to convert audio:', error)
      console.error('Falling back to original URL')
      // Fall back to original URL if conversion fails
      playableUrl = audioUrl
    }
    
    if (!audioRefs.current[audioKey]) {
      audioRefs.current[audioKey] = new Audio()
      
      // Add error handling for audio playback
      audioRefs.current[audioKey].onerror = (e) => {
        console.error('Audio playback error:', e)
        console.error('Audio URL:', audioUrl)
        console.error('Audio type:', audioType)
        // Try to get more details about the audio element
        const audio = audioRefs.current[audioKey]
        console.error('Audio element details:', {
          readyState: audio.readyState,
          networkState: audio.networkState,
          error: audio.error,
          canPlayType: {
            webm: audio.canPlayType('audio/webm'),
            webmOpus: audio.canPlayType('audio/webm; codecs=opus'),
            ogg: audio.canPlayType('audio/ogg'),
            mp4: audio.canPlayType('audio/mp4'),
            wav: audio.canPlayType('audio/wav')
          }
        })
        console.error('Recording MIME type:', (window as any).recordingMimeType)
      }
      
      audioRefs.current[audioKey].onended = () => {
        setProcessedChunks(prev => prev.map(c => 
          c.id === chunkId ? { ...c, isPlaying: false } : c
        ))
      }
      
      // Set the source after adding event handlers
      audioRefs.current[audioKey].src = playableUrl
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
      audio.play().catch(error => {
        console.error('Failed to play audio:', error)
        // Try to check if it's a format issue
        if (error.name === 'NotSupportedError') {
          console.error('Audio format not supported. The recording might be in a format that the browser cannot play.')
          console.error('MIME type used for recording:', (window as any).recordingMimeType)
          
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Audio playback error',
            text: 'The recording format may not be supported by your browser',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          })
        }
      })
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
                  onClick={startRecording}
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
            
            <div className="chunks-list">
              {processedChunks.map((chunk, index) => (
                <div 
                  key={chunk.id} 
                  className={`chunk-item ${chunk.isExpanded ? 'expanded' : ''} ${chunk.isPlaying ? 'playing' : ''}`}
                >
                  <div className="chunk-main">
                    {/* Chunk Info */}
                    <div className="chunk-info">
                      <span className="chunk-number">
                        <span className="chunk-icon">🎼</span>
                        #{index + 1}
                      </span>
                      <span className="chunk-duration">⏱️ {(chunk.duration / 1000).toFixed(1)}s</span>
                    </div>
                    
                    {/* Metrics */}
                    <div className="chunk-stats">
                      <div className="stat-item">
                        <span className="stat-icon">🔇</span>
                        <span className="stat-value">{chunk.noiseRemoved.toFixed(1)}%</span>
                        <span className="stat-label">reduced</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">⚡</span>
                        <span className="stat-value">{chunk.metrics.processingLatency.toFixed(0)}ms</span>
                        <span className="stat-label">latency</span>
                      </div>
                    </div>
                    
                    {/* Noise Meter */}
                    <div className="chunk-noise-meter">
                      <div className="noise-bar">
                        <div 
                          className="noise-fill"
                          style={{
                            width: `${chunk.noiseRemoved}%`,
                            background: `linear-gradient(90deg, 
                              hsl(${120 - chunk.noiseRemoved * 1.2}, 70%, 50%) 0%, 
                              hsl(${120 - chunk.noiseRemoved * 0.6}, 70%, 60%) 100%)`
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="chunk-actions">
                      <button 
                        className={`action-btn play-original ${chunk.isPlaying && selectedChunk === chunk.id ? 'active' : ''}`}
                        onClick={() => toggleChunkPlayback(chunk.id, 'original')}
                        disabled={!chunk.originalAudioUrl}
                        title="Play Original"
                      >
                        <span className="btn-icon">🔊</span>
                        <span className="btn-text">Original</span>
                      </button>
                      <button 
                        className={`action-btn play-processed ${chunk.isPlaying && selectedChunk === chunk.id ? 'active' : ''}`}
                        onClick={() => toggleChunkPlayback(chunk.id, 'processed')}
                        disabled={!chunk.processedAudioUrl}
                        title="Play Enhanced"
                      >
                        <span className="btn-icon">🎵</span>
                        <span className="btn-text">Enhanced</span>
                      </button>
                      <button 
                        className="action-btn expand-btn"
                        onClick={() => toggleChunkExpansion(chunk.id)}
                        title={chunk.isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <span className="btn-icon">{chunk.isExpanded ? '▲' : '▼'}</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {chunk.isExpanded && (
                    <div className="chunk-details">
                      {/* Synced Waveforms */}
                      <div className="waveforms-section">
                        <SyncedWaveforms
                          originalAudioUrl={chunk.originalAudioUrl}
                          processedAudioUrl={chunk.processedAudioUrl}
                          isPlaying={chunk.isPlaying}
                          onPlayingChange={(playing) => {
                            if (playing) {
                              toggleChunkPlayback(chunk.id, 'processed')
                            } else {
                              // Stop playback
                              setProcessedChunks(prev => prev.map(c => 
                                c.id === chunk.id ? { ...c, isPlaying: false } : c
                              ))
                            }
                          }}
                        />
                      </div>
                      
                      {/* Technical Details */}
                      <div className="technical-details mt-4">
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Technical Details</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Start Time:</span>
                            <span className="detail-value">{new Date(chunk.startTime).toLocaleTimeString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">End Time:</span>
                            <span className="detail-value">{new Date(chunk.endTime).toLocaleTimeString()}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Processing Time:</span>
                            <span className="detail-value">{chunk.metrics.processingLatency.toFixed(2)}ms</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Frame Count:</span>
                            <span className="detail-value">{chunk.metrics.frameCount} frames</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Input Level:</span>
                            <span className="detail-value">{(chunk.metrics.inputLevel * 100).toFixed(1)}%</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Output Level:</span>
                            <span className="detail-value">{(chunk.metrics.outputLevel * 100).toFixed(1)}%</span>
                          </div>
                        </div>
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
          {/* Audio Control Buttons */}
          {isInitialized && !isRecording && (
            <button 
              className="floating-btn record-fab pulse"
              onClick={startRecording}
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
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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

        .recording-status-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2rem;
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .recording-label {
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 1rem;
        }

        .pause-badge {
          background: #ff9800;
          color: white;
          padding: 0.25rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.875rem;
          animation: pulse 2s infinite;
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

        /* Chunks List */
        .chunks-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .chunk-item {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .chunk-item.playing {
          border-color: #4caf50;
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
        }
        
        .chunk-main {
          display: grid;
          grid-template-columns: 150px 200px 1fr 300px;
          align-items: center;
          padding: 1rem 1.5rem;
          gap: 1.5rem;
        }
        
        .chunk-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .chunk-number {
          font-weight: 700;
          color: #667eea;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
        }
        
        .chunk-duration {
          color: #888;
          font-size: 0.875rem;
        }
        
        .chunk-stats {
          display: flex;
          gap: 2rem;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }
        
        .stat-icon {
          font-size: 1.2rem;
        }
        
        .stat-value {
          font-weight: 700;
          color: #fff;
          font-size: 1.1rem;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: #888;
          text-transform: uppercase;
        }
        
        .chunk-noise-meter {
          flex: 1;
        }
        
        .noise-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .chunk-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.875rem;
        }
        
        .action-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }
        
        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .action-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
        }
        
        .expand-btn {
          padding: 0.5rem;
          min-width: 40px;
        }
        
        .btn-icon {
          font-size: 1rem;
        }
        
        .btn-text {
          font-weight: 500;
        }
        
        .chunk-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .detail-label {
          font-size: 0.75rem;
          color: #888;
          text-transform: uppercase;
        }
        
        .detail-value {
          font-weight: 600;
          color: #fff;
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

        .record-fab {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .pause-fab {
          background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
          color: white;
        }

        .stop-fab {
          background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
          color: white;
        }

        .resume-fab {
          background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
          color: white;
        }

        .fab-icon {
          font-size: 1.5rem;
          z-index: 1;
        }

        .fab-divider {
          width: 40px;
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0.5rem auto;
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
          .chunk-main {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .chunk-info {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          
          .chunk-stats {
            justify-content: center;
            margin: 1rem 0;
          }
          
          .chunk-actions {
            justify-content: center;
            flex-wrap: wrap;
          }
          
          .action-btn {
            flex: 1;
            min-width: 120px;
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