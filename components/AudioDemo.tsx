import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { addNotification } from '../store/slices/uiSlice'
import { useAudioProcessor } from '../hooks/useAudioProcessor'
import styles from './AudioDemo.module.css'

interface AudioDemoProps {
  autoProcess?: boolean
  onProcessComplete?: (buffer: ArrayBuffer) => void
  onError?: (error: Error) => void
  onChunkProcessed?: (chunkIndex: number, metrics: ChunkMetrics) => void
  onMetricsUpdate?: (metrics: ProcessingMetrics) => void
}

interface LogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
}

interface ChunkMetrics {
  index: number
  duration: number
  rms: number
  peak: number
  silenceRatio: number
  processTime: number
}

interface ProcessingMetrics {
  totalChunks: number
  processedChunks: number
  totalDuration: number
  avgProcessTime: number
  currentRMS: number
  currentPeak: number
}

type Urls = { original: string | null; processedChunks: string[] }

const MAX_LOG_ENTRIES = 500
const LOG_LEVELS = {
  debug: { color: '#6B7280', icon: '🔍' },
  info: { color: '#3B82F6', icon: 'ℹ️' },
  warn: { color: '#F59E0B', icon: '⚠️' },
  error: { color: '#EF4444', icon: '❌' }
}

export default function AudioDemo({
  autoProcess = false,
  onProcessComplete,
  onError,
  onChunkProcessed,
  onMetricsUpdate
}: AudioDemoProps) {
  const dispatch = useAppDispatch()
  const { isProcessing, enableAGC, chunkDuration } = useAppSelector(s => s.audio)
  const { isReady, processFile } = useAudioProcessor()

  const [urls, setUrls] = useState<Urls>({ original: null, processedChunks: [] })
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<ProcessingMetrics>({
    totalChunks: 0,
    processedChunks: 0,
    totalDuration: 0,
    avgProcessTime: 0,
    currentRMS: 0,
    currentPeak: 0
  })
  const [chunkMetrics, setChunkMetrics] = useState<ChunkMetrics[]>([])
  const [isExporting, setIsExporting] = useState(false)
  
  const logsEndRef = useRef<HTMLDivElement>(null)
  const urlCleanupRef = useRef<Set<string>>(new Set())
  const processLockRef = useRef(false)
  const startTimeRef = useRef<number>(0)

  // Logging helper
  const log = useCallback((level: LogEntry['level'], message: string, data?: any) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      data
    }
    setLogs(prev => {
      const newLogs = [...prev, entry]
      return newLogs.slice(-MAX_LOG_ENTRIES)
    })
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      urlCleanupRef.current.forEach(url => URL.revokeObjectURL(url))
      urlCleanupRef.current.clear()
    }
  }, [])

  const cleanupUrls = useCallback(() => {
    urls.processedChunks.forEach(url => {
      URL.revokeObjectURL(url)
      urlCleanupRef.current.delete(url)
    })
    if (urls.original) {
      URL.revokeObjectURL(urls.original)
      urlCleanupRef.current.delete(urls.original)
    }
    setUrls({ original: null, processedChunks: [] })
  }, [urls])

  const exportLogs = useCallback(() => {
    const logData = logs.map(l => ({
      time: new Date(l.timestamp).toISOString(),
      level: l.level,
      message: l.message,
      data: l.data
    }))
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audio-demo-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [logs])

  const exportProcessedAudio = useCallback(async () => {
    if (urls.processedChunks.length === 0) {
      log('warn', 'No processed audio to export')
      return
    }
    
    setIsExporting(true)
    try {
      // Create a zip or concatenated file of all chunks
      const chunks = await Promise.all(
        urls.processedChunks.map(url => fetch(url).then(r => r.blob()))
      )
      
      // For simplicity, export first chunk as example
      const url = URL.createObjectURL(chunks[0])
      const a = document.createElement('a')
      a.href = url
      a.download = `processed-audio-${Date.now()}.wav`
      a.click()
      URL.revokeObjectURL(url)
      
      log('info', 'Audio exported successfully')
    } catch (err) {
      log('error', 'Failed to export audio', err)
    } finally {
      setIsExporting(false)
    }
  }, [urls.processedChunks, log])

  const handleProcess = useCallback(async () => {
    // Prevent re-entrant calls
    if (processLockRef.current) {
      log('warn', 'Process already in progress, ignoring duplicate call')
      return
    }
    processLockRef.current = true
    
    // Check if engine is actually ready
    if (!isReady) {
      log('error', 'Engine is not ready yet. Try initializing the audio engine first.')
      setError('Engine is not ready yet. Try initializing the audio engine first.')
      processLockRef.current = false
      return
    }
    
    setError(null)
    cleanupUrls()
    setChunkMetrics([])
    startTimeRef.current = performance.now()
    
    try {
      // Load demo audio
      log('info', 'Loading demo audio file...')
      const resp = await fetch('/jfk_speech.wav')
      if (!resp.ok) throw new Error('Failed to load demo audio')
      const arrBuf = await resp.arrayBuffer()
      log('info', `Audio loaded successfully`, { size: arrBuf.byteLength })
      
      const originalUrl = URL.createObjectURL(new Blob([arrBuf], { type: 'audio/wav' }))
      urlCleanupRef.current.add(originalUrl)
      setUrls(u => ({ ...u, original: originalUrl }))
      
      // Process audio
      const file = new File([arrBuf], 'jfk_speech.wav', { type: 'audio/wav' })
      log('info', `Starting audio processing`, { 
        fileName: file.name, 
        size: file.size,
        chunkDuration,
        enableAGC,
        isReady 
      })
      
      // Log engine state before processing
      log('debug', 'Engine state check', { isReady })
      
      const processingCallbacks = {
        onChunkStart: (index: number) => {
          log('debug', `Processing chunk ${index + 1}`)
          setMetrics(prev => ({ ...prev, processedChunks: index }))
        },
        onChunkComplete: (index: number, chunkData: any) => {
          const chunkTime = performance.now() - startTimeRef.current
          const metric: ChunkMetrics = {
            index,
            duration: chunkDuration,
            rms: Math.random() * 0.3 + 0.1, // Simulated, replace with actual
            peak: Math.random() * 0.5 + 0.3, // Simulated, replace with actual
            silenceRatio: Math.random() * 0.2,
            processTime: chunkTime
          }
          setChunkMetrics(prev => [...prev, metric])
          onChunkProcessed?.(index, metric)
          log('debug', `Chunk ${index + 1} complete`, metric)
        }
      }
      
      const result = await processFile(file, {
        chunkDuration,
        enableAGC,
        ...processingCallbacks
      })
      
      log('info', `Processing completed`, { 
        chunks: result?.chunks?.length || 0,
        totalTime: performance.now() - startTimeRef.current 
      })
      
      if (!result) {
        throw new Error('Processing failed - processFile returned null')
      }
      
      if (!result.chunks || result.chunks.length === 0) {
        throw new Error('Processing completed but no audio chunks were generated')
      }
      
      // Update final metrics
      const totalTime = performance.now() - startTimeRef.current
      const finalMetrics: ProcessingMetrics = {
        totalChunks: result.chunks.length,
        processedChunks: result.chunks.length,
        totalDuration: result.chunks.length * chunkDuration,
        avgProcessTime: totalTime / result.chunks.length,
        currentRMS: 0.25, // Simulated
        currentPeak: 0.45 // Simulated
      }
      setMetrics(finalMetrics)
      onMetricsUpdate?.(finalMetrics)
      
      // Create URLs for all chunks
      const chunkUrls = result.chunks
        .filter(chunk => chunk.blob)
        .map((chunk, idx) => {
          const url = URL.createObjectURL(chunk.blob!)
          urlCleanupRef.current.add(url)
          log('debug', `Created URL for chunk ${idx + 1}`)
          return url
        })
      
      log('info', `Created ${chunkUrls.length} chunk URLs`)
      setUrls(u => ({ ...u, processedChunks: chunkUrls }))
      
      // For callback, use first chunk
      if (result.chunks[0]?.blob) {
        onProcessComplete?.(await result.chunks[0].blob.arrayBuffer())
      }
      dispatch(addNotification({ type: 'success', message: 'Demo processed!' }))
      log('info', '✅ Processing complete!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed'
      setError(msg)
      log('error', msg, err)
      dispatch(addNotification({ type: 'error', message: msg }))
      onError?.(err instanceof Error ? err : new Error(msg))
    } finally {
      processLockRef.current = false
    }
  }, [processFile, dispatch, onProcessComplete, onError, onChunkProcessed, onMetricsUpdate, chunkDuration, enableAGC, log, cleanupUrls])

  useEffect(() => {
    if (autoProcess && isReady && !started) {
      setStarted(true)
      handleProcess()
    }
  }, [autoProcess, isReady, started, handleProcess])

  const formatTime = (ms: number) => {
    const date = new Date(ms)
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0')
  }

  return (
    <div className={styles.advancedContainer}>
      <div className={styles.header}>
        <h3>🎧 Audio Demo - Advanced</h3>
        <div className={styles.headerActions}>
          <span className={isReady ? styles.ready : styles.notReady}>
            {isReady ? 'ready' : 'initializing'}
          </span>
          <button 
            onClick={exportLogs} 
            className={styles.iconButton}
            disabled={logs.length === 0}
            title="Export logs"
          >
            📥 Logs
          </button>
          <button 
            onClick={exportProcessedAudio} 
            className={styles.iconButton}
            disabled={urls.processedChunks.length === 0 || isExporting}
            title="Export audio"
          >
            💾 Audio
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.mainGrid}>
        {/* Left Panel - Controls & Metrics */}
        <div className={styles.controlPanel}>
          <button
            onClick={handleProcess}
            disabled={isProcessing || !isReady}
            className={styles.processButton}
          >
            {isProcessing ? '⏳ Processing...' : '🎵 Process Demo'}
          </button>

          {/* Live Metrics */}
          <div className={styles.metricsCard}>
            <h4>📊 Live Metrics</h4>
            <div className={styles.metricsGrid}>
              <MetricItem label="Total Chunks" value={metrics.totalChunks} />
              <MetricItem label="Processed" value={metrics.processedChunks} />
              <MetricItem label="Duration" value={`${metrics.totalDuration.toFixed(1)}s`} />
              <MetricItem label="Avg Time" value={`${metrics.avgProcessTime.toFixed(0)}ms`} />
              <MetricItem label="RMS" value={metrics.currentRMS.toFixed(3)} />
              <MetricItem label="Peak" value={metrics.currentPeak.toFixed(3)} />
            </div>
          </div>

          {/* Chunk Metrics */}
          {chunkMetrics.length > 0 && (
            <div className={styles.chunkMetricsCard}>
              <h4>📦 Chunk Analysis</h4>
              <div className={styles.chunkList}>
                {chunkMetrics.map(chunk => (
                  <div key={chunk.index} className={styles.chunkItem}>
                    <span>Chunk {chunk.index + 1}</span>
                    <span>RMS: {chunk.rms.toFixed(3)}</span>
                    <span>Peak: {chunk.peak.toFixed(3)}</span>
                    <span>{chunk.processTime.toFixed(0)}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.settings}>
            <strong>AGC:</strong> {enableAGC ? 'ON' : 'OFF'}
            {' | '}
            <strong>Duration:</strong> {chunkDuration}s
            {' | '}
            <strong>Chunks:</strong> {urls.processedChunks.length}
          </div>
        </div>

        {/* Center Panel - Audio Players */}
        <div className={styles.audioPanel}>
          <div className={styles.audioPlayers}>
            <AudioBlock label="Original" src={urls.original} />
            {urls.processedChunks.length === 0 ? (
              <AudioBlock label="Processed" src={null} />
            ) : (
              urls.processedChunks.map((chunkUrl, index) => (
                <AudioBlock 
                  key={index} 
                  label={`Chunk ${index + 1}`} 
                  src={chunkUrl}
                  metrics={chunkMetrics[index]}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Logs */}
        <div className={styles.logsPanel}>
          <div className={styles.logsHeader}>
            <h4>📜 Processing Logs</h4>
            <span className={styles.logCount}>{logs.length} entries</span>
          </div>
          <div className={styles.logsContainer}>
            {logs.map(log => (
              <div 
                key={log.id} 
                className={styles.logEntry}
                style={{ color: LOG_LEVELS[log.level].color }}
              >
                <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
                <span className={styles.logIcon}>{LOG_LEVELS[log.level].icon}</span>
                <span className={styles.logMessage}>{log.message}</span>
                {log.data && (
                  <pre className={styles.logData}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Legibilidad: bloque para player
function AudioBlock({ 
  label, 
  src, 
  metrics 
}: { 
  label: string
  src: string | null
  metrics?: ChunkMetrics 
}) {
  return (
    <div className={styles.audioCard}>
      <h4 className={styles.audioCardTitle}>{label}</h4>
      {src ? (
        <>
          <audio src={src} controls className={styles.audioPlayer} />
          {metrics && (
            <div className={styles.audioMetrics}>
              <span>RMS: {metrics.rms.toFixed(3)}</span>
              <span>Peak: {metrics.peak.toFixed(3)}</span>
              <span>Silence: {(metrics.silenceRatio * 100).toFixed(0)}%</span>
            </div>
          )}
        </>
      ) : (
        <div className={styles.audioPlaceholder}>
          <span className={styles.placeholderText}>
            {label === 'Processed' ? 'Click "Process Demo" to generate audio' : 'Loading...'}
          </span>
        </div>
      )}
    </div>
  )
}

// MetricItem component
function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.metricItem}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  )
}
