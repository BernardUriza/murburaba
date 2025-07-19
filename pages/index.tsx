import Head from 'next/head'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { WaveformAnalyzer } from '../components/WaveformAnalyzer'
import AudioEngineToggle from '../components/AudioEngineToggle'
import { useState, useEffect } from 'react'

export default function Home() {
  const {
    isRecording,
    audioChunks,
    chunkDuration,
    startRecording,
    stopRecording,
    setChunkDuration,
    clearChunks,
    isNoiseSuppressionEnabled,
    setNoiseSuppressionEnabled,
    isAudioEngineInitialized,
    isAudioEngineLoading,
    audioEngineError,
    initializeAudioEngine
  } = useAudioRecorder({ initialChunkDuration: 2, enableNoiseSupression: true })

  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showComparison, setShowComparison] = useState(true)
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set())

  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(new Date())
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      const startTime = Date.now()
      interval = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000))
      }, 100)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const toggleChunkExpanded = (chunkId: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev)
      if (next.has(chunkId)) {
        next.delete(chunkId)
      } else {
        next.add(chunkId)
      }
      return next
    })
  }

  const totalProcessedTime = audioChunks.reduce((acc, chunk) => acc + (chunk.duration || chunkDuration), 0)
  const avgNoiseReduction = audioChunks.reduce((acc, chunk) => {
    if (chunk.stats) {
      return acc + chunk.stats.noiseReductionLevel
    }
    return acc
  }, 0) / (audioChunks.filter(c => c.stats).length || 1)

  return (
    <>
      <Head>
        <title>Murmuraba Studio | AI-Powered Audio Enhancement</title>
        <meta name="description" content="Professional real-time noise reduction powered by neural networks" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="modern-container">
        <div className="glass-header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="18" stroke="url(#gradient1)" strokeWidth="2"/>
                  <path d="M14 25V15L24 20L14 25Z" fill="url(#gradient1)"/>
                  <path d="M26 17V23" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M30 14V26" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="gradient1" x1="0" y1="0" x2="40" y2="40">
                      <stop stopColor="#3B82F6"/>
                      <stop offset="1" stopColor="#8B5CF6"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <h1 className="modern-title">Murmuraba Studio</h1>
                <p className="modern-subtitle">Neural Audio Processing</p>
              </div>
            </div>
            <div className="time-display">
              {currentTime ? (
                <>
                  <div className="time">{currentTime.toLocaleTimeString()}</div>
                  <div className="date">{currentTime.toLocaleDateString()}</div>
                </>
              ) : (
                <>
                  <div className="time">--:--:--</div>
                  <div className="date">--/--/----</div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card gradient-1">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{audioChunks.length}</div>
              <div className="stat-label">Audio Chunks</div>
            </div>
          </div>
          
          <div className="stat-card gradient-2">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6V12L16 16" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatTime(totalProcessedTime)}</div>
              <div className="stat-label">Total Processed</div>
            </div>
          </div>
          
          <div className="stat-card gradient-3">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{avgNoiseReduction.toFixed(1)}%</div>
              <div className="stat-label">Avg Noise Reduced</div>
            </div>
          </div>
          
          <div className="stat-card gradient-4">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2"/>
                <path d="M21 12V19C21 20 20 21 19 21H5C4 21 3 20 3 19V5C3 4 4 3 5 3H16" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{isAudioEngineInitialized ? 'Active' : 'Ready'}</div>
              <div className="stat-label">Audio Engine</div>
            </div>
          </div>
        </div>

        <section className="recording-section">
          <div className="recording-panel">
            <div className="panel-header">
              <h2 className="panel-title">Audio Recording Studio</h2>
              <div className="panel-badges">
                {isRecording && (
                  <div className="badge badge-recording">
                    <span className="recording-dot"></span>
                    LIVE
                  </div>
                )}
                {isNoiseSuppressionEnabled && (
                  <div className="badge badge-active">AI Enhanced</div>
                )}
              </div>
            </div>
            
            {isRecording && (
              <div className="recording-visualizer">
                <div className="recording-timer">
                  <div className="timer-display">{formatTime(recordingTime)}</div>
                  <div className="timer-label">Recording Time</div>
                </div>
                <div className="waveform-bars">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="waveform-bar" style={{
                      animationDelay: `${i * 0.05}s`,
                      height: `${20 + Math.random() * 60}%`
                    }}></div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="controls-grid">
              <button 
                onClick={startRecording} 
                disabled={isRecording}
                className={`modern-btn ${isRecording ? 'btn-disabled' : 'btn-primary'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1C12 1 12 6 12 11C12 14 10 16 7 16C4 16 2 14 2 11V6C2 3 4 1 7 1C10 1 12 3 12 6V11Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 16V20M7 20H3M7 20H11" stroke="currentColor" strokeWidth="2"/>
                  <path d="M17 6V11C17 13 19 14 21 13" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Start Recording</span>
              </button>
              
              {isRecording && (
                <button 
                  onClick={stopRecording}
                  className="modern-btn btn-stop"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                  </svg>
                  <span>Stop Recording</span>
                </button>
              )}
              
              {audioChunks.length > 0 && !isRecording && (
                <button 
                  onClick={clearChunks}
                  className="modern-btn btn-secondary"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6H21M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>Clear All</span>
                </button>
              )}
            
              <div className="control-card">
                <div className="control-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>Chunk Duration</span>
                </div>
                <div className="slider-control">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={chunkDuration}
                    onChange={(e) => setChunkDuration(Number(e.target.value))}
                    disabled={isRecording}
                    className="modern-slider"
                  />
                  <div className="slider-value">{chunkDuration}s</div>
                </div>
              </div>
            
              <div className="control-card">
                <div className="control-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M5 12C5 12 9 3 12 3C15 3 19 12 19 12C19 12 15 21 12 21C9 21 5 12 5 12Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>Noise Reduction</span>
                </div>
                <AudioEngineToggle
                  enabled={isNoiseSuppressionEnabled}
                  onToggle={setNoiseSuppressionEnabled}
                  disabled={isRecording}
                  sourceStream={null}
                  isRecording={isRecording}
                />
              </div>
            
              {isNoiseSuppressionEnabled && !isAudioEngineInitialized && !isRecording && (
                <button 
                  onClick={initializeAudioEngine} 
                  disabled={isAudioEngineLoading}
                  className="modern-btn btn-initialize"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={isAudioEngineLoading ? 'spinning' : ''}>
                    <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M18 3L21 3L21 6" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>{isAudioEngineLoading ? 'Initializing AI...' : 'Initialize Audio Engine'}</span>
                </button>
              )}
            </div>
          
            {audioEngineError && (
              <div className="error-card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V13M12 17H12.01M12 3L2 20H22L12 3Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>{audioEngineError}</span>
              </div>
            )}
          </div>
        </section>
          
        {audioChunks.length > 0 && (
          <section className="recordings-section">
            <div className="section-header">
              <h2 className="section-title">Recorded Samples</h2>
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="toggle-view-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12H11M11 12L7 8M11 12L7 16" stroke="currentColor" strokeWidth="2"/>
                  <path d="M13 12H23M23 12L19 8M23 12L19 16" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>{showComparison ? 'Hide Comparison' : 'Show Comparison'}</span>
              </button>
            </div>
            
            <div className="recordings-grid">
              {audioChunks.map((chunk, index) => (
                <div key={chunk.id} className="recording-card">
                  <div className="recording-header">
                    <div className="recording-info">
                      <span className="recording-number">#{index + 1}</span>
                      <span className="recording-time">{chunk.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="recording-duration">{chunkDuration}s</div>
                  </div>
                  
                  {showComparison ? (
                    <div className="audio-comparison-modern">
                      <div className="audio-item-modern enhanced">
                        <div className="audio-label">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span>AI Enhanced</span>
                        </div>
                        <audio controls src={chunk.url} className="modern-audio-player" />
                        <WaveformAnalyzer 
                          audioUrl={chunk.url} 
                          label="Enhanced Signal" 
                          color="#10B981"
                        />
                      </div>
                      
                      <div className="audio-item-modern original">
                        <div className="audio-label">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span>Original</span>
                        </div>
                        <audio controls src={chunk.urlWithoutNR} className="modern-audio-player" />
                        <WaveformAnalyzer 
                          audioUrl={chunk.urlWithoutNR} 
                          label="Original Signal" 
                          color="#EF4444"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="audio-single">
                      <audio controls src={chunk.url} className="modern-audio-player full-width" />
                      <div className="processing-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor"/>
                        </svg>
                        <span>AI Processed</span>
                      </div>
                    </div>
                  )}
                  
                  {chunk.stats && (
                    <>
                      <button
                        onClick={() => toggleChunkExpanded(chunk.id)}
                        className="stats-toggle-btn"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2V12M12 12L17 7M12 12L7 7" stroke="currentColor" strokeWidth="2" transform={expandedChunks.has(chunk.id) ? "rotate(180 12 12)" : ""}/>
                        </svg>
                        <span>{expandedChunks.has(chunk.id) ? 'Hide Details' : 'View Processing Details'}</span>
                      </button>
                      
                      {expandedChunks.has(chunk.id) && (
                        <div className="stats-details">
                          <h4>Processing Statistics</h4>
                          
                          <div className="stats-grid-detail">
                            <div className="stat-detail">
                              <span className="stat-detail-label">Input Samples</span>
                              <span className="stat-detail-value">{chunk.stats.inputSamples.toLocaleString()}</span>
                            </div>
                            
                            <div className="stat-detail">
                              <span className="stat-detail-label">Output Samples</span>
                              <span className="stat-detail-value">{chunk.stats.outputSamples.toLocaleString()}</span>
                            </div>
                            
                            <div className="stat-detail">
                              <span className="stat-detail-label">Noise Reduction</span>
                              <span className="stat-detail-value highlight">{chunk.stats.noiseReductionLevel.toFixed(1)}%</span>
                            </div>
                            
                            <div className="stat-detail">
                              <span className="stat-detail-label">Processing Time</span>
                              <span className="stat-detail-value">{(chunk.stats.processingTimeMs / 1000).toFixed(2)}s</span>
                            </div>
                          </div>
                          
                          <div className="stats-section">
                            <h5>Frame Analysis</h5>
                            <div className="stats-grid-detail">
                              <div className="stat-detail">
                                <span className="stat-detail-label">Total Frames</span>
                                <span className="stat-detail-value">{chunk.stats.totalFramesProcessed}</span>
                              </div>
                              <div className="stat-detail">
                                <span className="stat-detail-label">Active Frames</span>
                                <span className="stat-detail-value">{chunk.stats.activeFrames}</span>
                              </div>
                              <div className="stat-detail">
                                <span className="stat-detail-label">Silence Frames</span>
                                <span className="stat-detail-value">{chunk.stats.silenceFrames}</span>
                              </div>
                              <div className="stat-detail">
                                <span className="stat-detail-label">Activity Ratio</span>
                                <span className="stat-detail-value">
                                  {chunk.stats.totalFramesProcessed > 0 
                                    ? ((chunk.stats.activeFrames / chunk.stats.totalFramesProcessed) * 100).toFixed(1) 
                                    : 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="stats-section">
                            <h5>Energy Levels</h5>
                            <div className="energy-bars">
                              <div className="energy-bar-container">
                                <span className="energy-label">Input</span>
                                <div className="energy-bar">
                                  <div 
                                    className="energy-fill input" 
                                    style={{width: `${Math.min(100, chunk.stats.averageInputEnergy * 1000)}%`}}
                                  ></div>
                                </div>
                                <span className="energy-value">{chunk.stats.averageInputEnergy.toFixed(4)}</span>
                              </div>
                              <div className="energy-bar-container">
                                <span className="energy-label">Output</span>
                                <div className="energy-bar">
                                  <div 
                                    className="energy-fill output" 
                                    style={{width: `${Math.min(100, chunk.stats.averageOutputEnergy * 1000)}%`}}
                                  ></div>
                                </div>
                                <span className="energy-value">{chunk.stats.averageOutputEnergy.toFixed(4)}</span>
                              </div>
                            </div>
                            
                            <div className="peak-levels">
                              <div className="peak-level">
                                <span>Peak Input:</span>
                                <span className="peak-value">{(chunk.stats.peakInputLevel * 100).toFixed(1)}%</span>
                              </div>
                              <div className="peak-level">
                                <span>Peak Output:</span>
                                <span className="peak-value">{(chunk.stats.peakOutputLevel * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="stats-section">
                            <h5>Processing Details</h5>
                            <div className="processing-info">
                              <p>Audio engine processed <strong>{chunk.stats.totalFramesProcessed}</strong> frames of 480 samples each.</p>
                              <p>The algorithm identified <strong>{((chunk.stats.silenceFrames / chunk.stats.totalFramesProcessed) * 100).toFixed(1)}%</strong> as silence/noise.</p>
                              <p>Energy change: <strong className={chunk.stats.averageOutputEnergy > chunk.stats.averageInputEnergy ? "highlight" : ""}>
                                {chunk.stats.averageOutputEnergy > chunk.stats.averageInputEnergy ? "+" : ""}
                                {(((chunk.stats.averageOutputEnergy - chunk.stats.averageInputEnergy) / chunk.stats.averageInputEnergy) * 100).toFixed(1)}%
                              </strong> {chunk.stats.averageOutputEnergy > chunk.stats.averageInputEnergy ? "(speech enhanced)" : "(noise reduced)"}</p>
                              <p>Processing rate: <strong>{((chunk.stats.inputSamples / 48000) / (chunk.stats.processingTimeMs / 1000)).toFixed(1)}x</strong> real-time</p>
                              <p>Estimated noise reduction: <strong className="highlight">{chunk.stats.noiseReductionLevel.toFixed(1)}%</strong></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}