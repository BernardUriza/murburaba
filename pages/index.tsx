import Head from 'next/head'
import { useMurmubaraEngine } from '../hooks/useMurmubaraEngine'
import { WaveformAnalyzer } from '../components/WaveformAnalyzer'
import { BuildInfo } from '../components/BuildInfo'
import { useState, useEffect, useRef } from 'react'
import type { StreamController, ChunkMetrics } from '../types'

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
  const [processedChunks, setProcessedChunks] = useState<ChunkMetrics[]>([])
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null)
  const [streamController, setStreamController] = useState<StreamController | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioUrlsRef = useRef<string[]>([])

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
          noiseSuppression: false, // We handle this
          autoGainControl: true
        } 
      })

      setCurrentStream(stream)

      // Process with chunking
      const controller = await processStreamChunked(stream, {
        chunkDuration: chunkDuration * 1000,
        onChunkProcessed: (chunk) => {
          setProcessedChunks(prev => [...prev, chunk])
        }
      })

      setStreamController(controller)

      // Also record the processed audio
      const processedStream = controller.stream
      const recorder = new MediaRecorder(processedStream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const url = URL.createObjectURL(event.data)
          audioUrlsRef.current.push(url)
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
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
    if (streamController) {
      streamController.stop()
    }
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop())
    }
    setIsRecording(false)
    setIsPaused(false)
    setStreamController(null)
    setCurrentStream(null)
  }

  const pauseRecording = () => {
    if (streamController && !isPaused) {
      streamController.pause()
      setIsPaused(true)
    }
  }

  const resumeRecording = () => {
    if (streamController && isPaused) {
      streamController.resume()
      setIsPaused(false)
    }
  }

  const clearRecordings = () => {
    audioUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    audioUrlsRef.current = []
    setProcessedChunks([])
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
        <title>Murmuraba Studio v0.1.2 | Next-Gen Audio Processing</title>
        <meta name="description" content="Real-time neural audio enhancement with advanced chunk processing" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="modern-container">
        <div className="glass-header">
          <div className="header-content">
            <h1 className="studio-title">
              <span className="gradient-text">Murmuraba</span>
              <span className="version-badge">v0.1.2</span>
            </h1>
            <p className="studio-subtitle">Neural Audio Processing Engine</p>
          </div>
          
          {/* Engine Status */}
          <div className="engine-status-bar">
            <div className={`status-indicator ${engineState}`}>
              <span className="status-dot"></span>
              <span className="status-text">{engineState.toUpperCase()}</span>
            </div>
            {diagnostics && (
              <div className="engine-info">
                <span>WASM: {diagnostics.wasmLoaded ? '✓' : '✗'}</span>
                <span>Processors: {diagnostics.activeProcessors}</span>
                <span>Memory: {(diagnostics.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Metrics Dashboard */}
        {metrics && (
          <section className="metrics-dashboard glass-panel">
            <h2 className="section-title">Real-time Processing Metrics</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value">{metrics.noiseReductionLevel.toFixed(1)}%</div>
                <div className="metric-label">Noise Reduction</div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill noise-reduction" 
                    style={{width: `${metrics.noiseReductionLevel}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-value">{metrics.processingLatency.toFixed(2)}ms</div>
                <div className="metric-label">Latency</div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill latency" 
                    style={{width: `${Math.min(100, metrics.processingLatency * 2)}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-value">{(metrics.inputLevel * 100).toFixed(0)}%</div>
                <div className="metric-label">Input Level</div>
                <div className="metric-bar">
                  <div 
                    className="metric-fill input" 
                    style={{width: `${metrics.inputLevel * 100}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-value">{metrics.frameCount}</div>
                <div className="metric-label">Frames Processed</div>
              </div>
            </div>
          </section>
        )}

        {/* Control Panel */}
        <section className="control-panel glass-panel">
          <div className="controls-header">
            <h2 className="section-title">Audio Controls</h2>
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-time">{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>

          <div className="controls-grid">
            {!isInitialized && !isLoading && (
              <button 
                className="control-btn primary initialize-btn"
                onClick={initialize}
              >
                <span className="btn-icon">⚡</span>
                Initialize Engine
              </button>
            )}

            {isLoading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Initializing Neural Engine...</span>
              </div>
            )}

            {isInitialized && !isRecording && (
              <>
                <button 
                  className="control-btn primary record-btn"
                  onClick={startRecording}
                >
                  <span className="btn-icon">🎙️</span>
                  Start Recording
                </button>
                
                <div className="chunk-config">
                  <label>Chunk Duration</label>
                  <select 
                    value={chunkDuration} 
                    onChange={(e) => setChunkDuration(Number(e.target.value))}
                    className="chunk-select"
                  >
                    <option value={2}>2 seconds</option>
                    <option value={4}>4 seconds</option>
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                  </select>
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
                  Stop
                </button>
                
                {!isPaused ? (
                  <button 
                    className="control-btn pause"
                    onClick={pauseRecording}
                  >
                    <span className="btn-icon">⏸️</span>
                    Pause
                  </button>
                ) : (
                  <button 
                    className="control-btn resume"
                    onClick={resumeRecording}
                  >
                    <span className="btn-icon">▶️</span>
                    Resume
                  </button>
                )}
              </div>
            )}

            {isInitialized && (
              <button 
                className="control-btn danger destroy-btn"
                onClick={() => destroy(true)}
              >
                <span className="btn-icon">🗑️</span>
                Destroy Engine
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={resetError} className="error-dismiss">✕</button>
            </div>
          )}
        </section>

        {/* Waveform Visualizer */}
        {currentStream && (
          <section className="waveform-section glass-panel">
            <h2 className="section-title">Live Waveform Analysis</h2>
            <WaveformAnalyzer 
              stream={currentStream} 
              isActive={isRecording && !isPaused}
              isPaused={isPaused}
            />
          </section>
        )}

        {/* Chunk Processing Results */}
        {processedChunks.length > 0 && (
          <section className="chunks-section glass-panel">
            <div className="chunks-header">
              <h2 className="section-title">Processed Chunks ({processedChunks.length})</h2>
              <div className="chunks-stats">
                <span>Average Noise Reduction: {averageNoiseReduction.toFixed(1)}%</span>
                <button 
                  className="control-btn secondary clear-btn"
                  onClick={clearRecordings}
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="chunks-timeline">
              {processedChunks.map((chunk, index) => (
                <div key={index} className="chunk-card">
                  <div className="chunk-header">
                    <span className="chunk-number">Chunk #{index + 1}</span>
                    <span className="chunk-duration">{(chunk.duration / 1000).toFixed(1)}s</span>
                  </div>
                  
                  <div className="chunk-metrics">
                    <div className="chunk-metric">
                      <span className="metric-icon">🔇</span>
                      <span className="metric-text">
                        {chunk.noiseRemoved.toFixed(1)}% noise removed
                      </span>
                    </div>
                    <div className="chunk-metric">
                      <span className="metric-icon">⚡</span>
                      <span className="metric-text">
                        {chunk.metrics.processingLatency.toFixed(0)}ms latency
                      </span>
                    </div>
                  </div>
                  
                  <div className="chunk-visualization">
                    <div 
                      className="noise-reduction-bar"
                      style={{
                        background: `linear-gradient(to right, 
                          var(--accent-color) ${chunk.noiseRemoved}%, 
                          var(--panel-bg) ${chunk.noiseRemoved}%)`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Advanced Metrics Toggle */}
        <section className="advanced-section">
          <button 
            className="control-btn secondary"
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
          >
            {showAdvancedMetrics ? 'Hide' : 'Show'} Advanced Metrics
          </button>
          
          {showAdvancedMetrics && diagnostics && (
            <div className="advanced-metrics glass-panel">
              <h3>Engine Diagnostics</h3>
              <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>
      
      <BuildInfo version="0.1.2" buildDate={new Date().toLocaleDateString()} />

      <style jsx>{`
        .modern-container {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: #ffffff;
        }

        .glass-header {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .header-content {
          text-align: center;
          margin-bottom: 1.5rem;
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
          border-radius: 10px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #4caf50;
          animation: pulse 2s infinite;
        }

        .status-indicator.uninitialized .status-dot { background: #666; }
        .status-indicator.initializing .status-dot { background: #ff9800; }
        .status-indicator.ready .status-dot { background: #4caf50; }
        .status-indicator.processing .status-dot { background: #2196f3; }
        .status-indicator.error .status-dot { background: #f44336; }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .engine-info {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #888;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #fff;
        }

        .metrics-dashboard {
          animation: slideIn 0.5s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
        }

        .recording-dot {
          width: 12px;
          height: 12px;
          background: #ff0000;
          border-radius: 50%;
          animation: recordPulse 1s infinite;
        }

        @keyframes recordPulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
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
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
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

        .btn-icon {
          font-size: 1.2rem;
        }

        .chunk-config {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .chunk-select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
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
          color: #888;
        }

        .chunks-timeline {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .chunk-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .chunk-card:hover {
          transform: translateY(-2px);
          border-color: rgba(102, 126, 234, 0.5);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
        }

        .chunk-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .chunk-number {
          font-weight: 700;
          color: #667eea;
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

        .chunk-metric {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .metric-icon {
          font-size: 1rem;
        }

        .chunk-visualization {
          margin-top: 1rem;
        }

        .noise-reduction-bar {
          height: 6px;
          border-radius: 3px;
          transition: all 0.3s ease;
        }

        .waveform-section {
          animation: slideIn 0.5s ease-out;
        }

        .advanced-section {
          text-align: center;
          margin-top: 2rem;
        }

        .advanced-metrics {
          margin-top: 1rem;
          text-align: left;
        }

        .advanced-metrics pre {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 10px;
          overflow-x: auto;
          font-size: 0.875rem;
          color: #888;
        }

        :root {
          --accent-color: #667eea;
          --panel-bg: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </>
  )
}