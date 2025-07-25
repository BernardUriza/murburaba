'use client'

import React, { useState } from 'react'
import { 
  BuildInfo,
  processFileWithMetrics,
  initializeAudioEngine
} from 'murmuraba'
import Swal from 'sweetalert2'

export default function App() {
  // Simplified state - only what's needed for processFileWithMetrics
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState<any>(null)
  const [chunkDuration, setChunkDuration] = useState(8)
  const [isEngineInitialized, setIsEngineInitialized] = useState(false)

  // Essential UI state only
  const [recordingHistory, setRecordingHistory] = useState<Array<{
    id: string;
    date: Date;
    duration: number;
    chunks: number;
    avgNoiseReduction: number;
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
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Starting microphone recording...',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      })
      
      // Pure processFileWithMetrics API call
      const result = await processFileWithMetrics('Use.Mic', {
        recordingDuration: chunkDuration * 1000,
        chunkOptions: {
          chunkDuration: chunkDuration * 1000,
          outputFormat: 'wav' as const
        }
      })
      
      setProcessingResults(result)
      
      // Save to history
      const newRecord = {
        id: `rec-${Date.now()}`,
        date: new Date(),
        duration: chunkDuration,
        chunks: result.chunks?.length || 0,
        avgNoiseReduction: result.averageVad || 0
      }
      const newHistory = [newRecord, ...recordingHistory].slice(0, 10)
      setRecordingHistory(newHistory)
      localStorage.setItem('murmuraba-history', JSON.stringify(newHistory))
      
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
    }
  }

  return (
    <>
      <main className="main-container">
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
              <span className="badge badge-recording">Processing Audio</span>
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
              <button 
                className="btn btn-primary"
                onClick={handleStartRecording}
                disabled={isProcessing}
              >
                <span className="btn-icon">🎙️</span>
                <span>{isProcessing ? 'Processing...' : 'Record Audio'}</span>
              </button>
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

        {/* Processing Results */}
        {processingResults && (
          <section className="results-section glass-card">
            <div className="panel-header">
              <h2 className="panel-title">Processing Results</h2>
              <button 
                className="btn btn-ghost"
                onClick={() => setProcessingResults(null)}
              >
                Clear
              </button>
            </div>
            
            <div className="results-grid">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{processingResults.chunks?.length || 0}</div>
                  <div className="stat-label">Chunks Created</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🔇</div>
                <div className="stat-content">
                  <div className="stat-value">{(processingResults.averageVad * 100).toFixed(1)}%</div>
                  <div className="stat-label">Average VAD</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <div className="stat-value">{formatTime(processingResults.totalDuration || 0)}</div>
                  <div className="stat-label">Total Duration</div>
                </div>
              </div>
            </div>

            {/* Chunks List */}
            {processingResults.chunks?.length > 0 && (
              <div className="chunks-list">
                <h3>Audio Chunks</h3>
                {processingResults.chunks.map((chunk: any, index: number) => (
                  <div key={chunk.id || index} className="chunk-item">
                    <div className="chunk-info">
                      <span className="chunk-id">Chunk {index + 1}</span>
                      <span className="chunk-duration">{formatTime(chunk.duration || 0)}</span>
                    </div>
                    {chunk.vadValue && (
                      <div className="chunk-vad">
                        VAD: {(chunk.vadValue * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Recording History */}
        {recordingHistory.length > 0 && (
          <section className="history-section glass-card">
            <div className="panel-header">
              <h2 className="panel-title">Recording History</h2>
            </div>
            
            <div className="history-list">
              {recordingHistory.map((record) => (
                <div key={record.id} className="history-item">
                  <div className="history-info">
                    <div className="history-date">
                      {record.date.toLocaleDateString()} {record.date.toLocaleTimeString()}
                    </div>
                    <div className="history-stats">
                      {record.chunks} chunks • {formatTime(record.duration)} • VAD: {(record.avgNoiseReduction * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      
      <BuildInfo version="2.0.0" buildDate={new Date().toLocaleDateString()} />
    </>
  )
}