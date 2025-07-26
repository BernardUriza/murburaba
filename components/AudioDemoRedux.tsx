import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setProcessing, setProcessingResults, addChunk } from '../store/slices/audioSlice'
import { addNotification } from '../store/slices/uiSlice'
import styles from './AudioDemo.module.css'

export interface AudioLog {
  timestamp: number
  frame: number
  vad: number
  rms: number
  message: string
}

export interface AudioDemoProps {
  getEngineStatus: () => string
  processFile: (arrayBuffer: ArrayBuffer) => Promise<ArrayBuffer>
  processFileWithMetrics?: any
  autoProcess?: boolean
  onProcessComplete?: (processedBuffer: ArrayBuffer) => void
  onError?: (error: Error) => void
  onLog?: (log: AudioLog) => void
}

export default function AudioDemoRedux({
  getEngineStatus,
  processFile,
  processFileWithMetrics,
  autoProcess = true,
  onProcessComplete,
  onError,
  onLog
}: AudioDemoProps) {
  const dispatch = useAppDispatch()
  const { isProcessing, chunkDuration, enableAGC } = useAppSelector(state => state.audio)
  
  const [logs, setLogs] = useState<AudioLog[]>([])
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null)
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoProcessStarted, setAutoProcessStarted] = useState(false)
  const [engineStatus, setEngineStatus] = useState<string>('uninitialized')
  
  const originalAudioRef = useRef<HTMLAudioElement>(null)
  const processedAudioRef = useRef<HTMLAudioElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const processAudioDemoRef = useRef<(() => Promise<void>) | null>(null)

  // Poll engine status
  useEffect(() => {
    const checkEngineStatus = () => {
      try {
        setEngineStatus(getEngineStatus())
      } catch {
        setEngineStatus('uninitialized')
      }
    }
    
    checkEngineStatus()
    const interval = setInterval(checkEngineStatus, 1000)
    return () => clearInterval(interval)
  }, [getEngineStatus])

  const addLog = (log: AudioLog) => {
    setLogs(prev => [...prev, log])
    onLog?.(log)
    
    // Auto scroll logs
    requestAnimationFrame(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      }
    })
  }

  const processAudioDemo = useCallback(async () => {
    try {
      dispatch(setProcessing(true))
      setError(null)
      
      addLog({
        timestamp: Date.now(),
        frame: 0,
        vad: 0,
        rms: 0,
        message: '🎵 Starting audio processing demo...'
      })

      // Load demo audio file  
      const response = await fetch('/demo.wav')
      if (!response.ok) throw new Error('Failed to load demo audio')
      
      const arrayBuffer = await response.arrayBuffer()
      const originalBlob = new Blob([arrayBuffer], { type: 'audio/wav' })
      const originalUrl = URL.createObjectURL(originalBlob)
      setOriginalAudioUrl(originalUrl)

      // Process with metrics if available
      if (processFileWithMetrics) {
        addLog({
          timestamp: Date.now(),
          frame: 0,
          vad: 0,
          rms: 0,
          message: '📊 Processing with metrics...'
        })

        const result = await processFileWithMetrics(arrayBuffer, {
          enableAGC,
          chunkOptions: {
            chunkDuration: chunkDuration * 1000,
            outputFormat: 'wav'
          },
          onFrameProcessed: (metrics: any) => {
            addLog({
              timestamp: metrics.timestamp,
              frame: metrics.frame,
              vad: metrics.vad,
              rms: metrics.rms,
              message: `Frame ${metrics.frame} - VAD: ${metrics.vad.toFixed(3)}, RMS: ${metrics.rms.toFixed(3)}`
            })
          }
        })

        dispatch(setProcessingResults(result))
        dispatch(addNotification({
          type: 'success',
          message: 'Audio demo processed successfully!'
        }))

        const processedBlob = new Blob([result.processedBuffer], { type: 'audio/wav' })
        const processedUrl = URL.createObjectURL(processedBlob)
        setProcessedAudioUrl(processedUrl)
        
        onProcessComplete?.(result.processedBuffer)
      } else {
        // Fallback to basic processing
        const processedBuffer = await processFile(arrayBuffer)
        const processedBlob = new Blob([processedBuffer], { type: 'audio/wav' })
        const processedUrl = URL.createObjectURL(processedBlob)
        setProcessedAudioUrl(processedUrl)
        
        onProcessComplete?.(processedBuffer)
      }

      addLog({
        timestamp: Date.now(),
        frame: 0,
        vad: 0,
        rms: 0,
        message: '✅ Audio processing completed!'
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed'
      setError(errorMessage)
      
      dispatch(addNotification({
        type: 'error',
        message: errorMessage
      }))
      
      addLog({
        timestamp: Date.now(),
        frame: 0,
        vad: 0,
        rms: 0,
        message: `❌ Error: ${errorMessage}`
      })
      
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      dispatch(setProcessing(false))
    }
  }, [processFile, processFileWithMetrics, enableAGC, chunkDuration, dispatch, onProcessComplete, onError, onLog])

  // Store reference for external access
  useEffect(() => {
    processAudioDemoRef.current = processAudioDemo
  }, [processAudioDemo])

  // Auto process on mount if enabled
  useEffect(() => {
    if (autoProcess && engineStatus === 'ready' && !autoProcessStarted && !isProcessing) {
      setAutoProcessStarted(true)
      processAudioDemo()
    }
  }, [autoProcess, engineStatus, autoProcessStarted, isProcessing, processAudioDemo])

  const handlePlayOriginal = () => originalAudioRef.current?.play()
  const handlePlayProcessed = () => processedAudioRef.current?.play()

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>🎧 Audio Processing Demo</h3>
        <div className={styles.status}>
          Engine: <span className={engineStatus === 'ready' ? styles.ready : styles.notReady}>
            {engineStatus}
          </span>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className={styles.controls}>
        <button 
          onClick={processAudioDemo}
          disabled={isProcessing || engineStatus !== 'ready'}
          className={styles.processButton}
        >
          {isProcessing ? '⏳ Processing...' : '🎵 Process Demo Audio'}
        </button>
      </div>

      <div className={styles.audioPlayers}>
        <div className={styles.audioSection}>
          <h4>Original Audio</h4>
          <audio 
            ref={originalAudioRef}
            src={originalAudioUrl || undefined}
            controls
            className={styles.audioPlayer}
          />
          <button 
            onClick={handlePlayOriginal}
            disabled={!originalAudioUrl}
            className={styles.playButton}
          >
            ▶️ Play Original
          </button>
        </div>

        <div className={styles.audioSection}>
          <h4>Processed Audio (Noise Reduced)</h4>
          <audio 
            ref={processedAudioRef}
            src={processedAudioUrl || undefined}
            controls
            className={styles.audioPlayer}
          />
          <button 
            onClick={handlePlayProcessed}
            disabled={!processedAudioUrl}
            className={styles.playButton}
          >
            ▶️ Play Processed
          </button>
        </div>
      </div>

      <div className={styles.settings}>
        <p>
          <strong>AGC:</strong> {enableAGC ? 'ON' : 'OFF'} | 
          <strong> Chunk Duration:</strong> {chunkDuration}s
        </p>
      </div>

      <div className={styles.logsSection}>
        <h4>📊 Processing Logs</h4>
        <div className={styles.logs} ref={logContainerRef}>
          {logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              <span className={styles.logTime}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={styles.logMessage}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}