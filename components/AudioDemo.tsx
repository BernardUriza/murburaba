import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  processFileWithMetrics?: any // Accept both old and new signatures
  autoProcess?: boolean
  onProcessComplete?: (processedBuffer: ArrayBuffer) => void
  onError?: (error: Error) => void
  onLog?: (log: AudioLog) => void
}

export default function AudioDemo({
  getEngineStatus,
  processFile,
  processFileWithMetrics,
  autoProcess = true,
  onProcessComplete,
  onError,
  onLog
}: AudioDemoProps) {
  const [logs, setLogs] = useState<AudioLog[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
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
    const interval = setInterval(checkEngineStatus, 500)
    return () => clearInterval(interval)
  }, [getEngineStatus])

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (originalAudioUrl) URL.revokeObjectURL(originalAudioUrl)
      if (processedAudioUrl) URL.revokeObjectURL(processedAudioUrl)
    }
  }, [originalAudioUrl, processedAudioUrl])

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const addLog = useCallback((log: AudioLog) => {
    setLogs(prev => {
      // Limit logs to prevent memory issues
      const newLogs = [...prev, log]
      if (newLogs.length > 1000) {
        return newLogs.slice(-500)
      }
      return newLogs
    })
    onLog?.(log)
  }, [onLog])

  // BLOCK reentry
  const processAudioDemo = useCallback(async () => {
    if (isProcessing) return
    const currentStatus = getEngineStatus()
    if (currentStatus !== 'ready') {
      const errorMsg = `Cannot process audio: Engine is in '${currentStatus}' state. Must be 'ready'.`
      setError(errorMsg)
      onError?.(new Error(errorMsg))
      return
    }
    setIsProcessing(true)
    setError(null)
    setLogs([])
    setProcessedAudioUrl(null)
    try {
      // Try multiple paths to ensure compatibility in dev and prod
      let response = await fetch('/jfk_speech.wav')
      if (!response.ok) {
        response = await fetch('./jfk_speech.wav')
      }
      if (!response.ok) {
        response = await fetch('jfk_speech.wav')
      }
      if (!response.ok) throw new Error(`Failed to load audio: ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      const originalBlob = new Blob([arrayBuffer], { type: 'audio/wav' })
      setOriginalAudioUrl(URL.createObjectURL(originalBlob))
      const startTime = Date.now()
      addLog({ timestamp: startTime, frame: 0, vad: 0, rms: 0, message: '🎙️ Iniciando procesamiento de jfk_speech.wav...' })
      
      let processedBuffer: ArrayBuffer
      
      if (processFileWithMetrics) {
        // Use enhanced processing with VAD metrics
        let frameCount = 0
        
        // Check if new API with chunking is available
        const isNewAPI = processFileWithMetrics.length === 2 // New API accepts 2 params
        
        if (isNewAPI) {
          // Use new API with chunking
          const result = await processFileWithMetrics(arrayBuffer, {
            enableVAD: true,
            chunkOptions: {
              chunkDuration: 8000, // 8 seconds
              outputFormat: 'wav'
            },
            onFrameProcessed: (metrics: any) => {
              frameCount++
              // Only log every 10th frame to avoid overwhelming the UI
              if (frameCount % 10 === 0 || metrics.vad > 0.5) {
                addLog({
                  timestamp: metrics.timestamp || Date.now(),
                  frame: metrics.frame || frameCount,
                  vad: metrics.vad || 0,
                  rms: metrics.rms || 0,
                  message: metrics.vad > 0.5 ? '🎤 Voz detectada' : '🔇 Procesando...'
                })
              }
            }
          })
          
          processedBuffer = result.processedBuffer
          const endTime = Date.now()
          
          // Log chunk information
          if (result.chunks && result.chunks.length > 0) {
            addLog({ 
              timestamp: endTime, 
              frame: frameCount, 
              vad: result.averageVad, 
              rms: 0, 
              message: `✅ Procesamiento completado en ${((endTime-startTime)/1000).toFixed(2)}s - ${result.chunks.length} chunks generados - VAD promedio: ${result.averageVad.toFixed(3)}` 
            })
            
            // Log each chunk info
            result.chunks.forEach((chunk: any, index: number) => {
              addLog({
                timestamp: endTime + index,
                frame: frameCount + index,
                vad: chunk.vadScore,
                rms: chunk.metrics.averageLevel,
                message: `📦 Chunk ${index + 1}: ${(chunk.duration/1000).toFixed(1)}s, VAD: ${chunk.vadScore.toFixed(3)}, ${(chunk.blob.size/1024).toFixed(1)}KB`
              })
            })
          } else {
            addLog({ 
              timestamp: endTime, 
              frame: frameCount, 
              vad: result.averageVad, 
              rms: 0, 
              message: `✅ Procesamiento completado en ${((endTime-startTime)/1000).toFixed(2)}s - VAD promedio: ${result.averageVad.toFixed(3)}` 
            })
          }
        } else {
          // Use legacy API
          const result = await processFileWithMetrics(arrayBuffer, (metrics: any) => {
            frameCount++
            // Only log every 10th frame to avoid overwhelming the UI
            if (frameCount % 10 === 0 || metrics.vad > 0.5) {
              addLog({
                timestamp: metrics.timestamp || Date.now(),
                frame: metrics.frame || frameCount,
                vad: metrics.vad || 0,
                rms: metrics.rms || 0,
                message: metrics.vad > 0.5 ? '🎤 Voz detectada' : '🔇 Procesando...'
              })
            }
          })
          processedBuffer = result.processedBuffer
          const endTime = Date.now()
          addLog({ 
            timestamp: endTime, 
            frame: result.metrics.length, 
            vad: result.averageVad, 
            rms: 0, 
            message: `✅ Procesamiento completado en ${((endTime-startTime)/1000).toFixed(2)}s - VAD promedio: ${result.averageVad.toFixed(3)}` 
          })
        }
      } else {
        // Fallback to standard processing
        processedBuffer = await processFile(arrayBuffer)
        const endTime = Date.now()
        addLog({ timestamp: endTime, frame: logs.length + 1, vad: 0, rms: 0, message: `✅ Procesamiento completado en ${((endTime-startTime)/1000).toFixed(2)}s` })
      }
      
      setProcessedAudioUrl(URL.createObjectURL(new Blob([processedBuffer], { type: 'audio/wav' })))
      onProcessComplete?.(processedBuffer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      addLog({ timestamp: Date.now(), frame: logs.length, vad: 0, rms: 0, message: `❌ Error: ${err}` })
      if (err instanceof Error) onError?.(err)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, getEngineStatus, processFile, processFileWithMetrics, logs.length, addLog, onProcessComplete, onError])

  // Store processAudioDemo in ref to avoid circular dependency
  processAudioDemoRef.current = processAudioDemo

  // Only call process once when engine is ready
  useEffect(() => {
    if (!autoProcess || autoProcessStarted || isProcessing || engineStatus !== 'ready') return
    setAutoProcessStarted(true)
    // Add small delay to ensure engine is fully ready
    setTimeout(() => {
      processAudioDemoRef.current?.()
    }, 500)
  }, [autoProcess, autoProcessStarted, isProcessing, engineStatus])

  const downloadProcessedAudio = () => {
    if (!processedAudioUrl) return
    const a = document.createElement('a')
    a.href = processedAudioUrl
    a.download = 'jfk_speech_cleaned.wav'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const exportLogs = () => {
    const logText = logs.map(log => `[${new Date(log.timestamp).toISOString()}] Frame ${log.frame}: VAD=${log.vad.toFixed(3)}, RMS=${log.rms.toFixed(3)} - ${log.message}`).join('\n')
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audio_demo_logs_${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.audioDemoContainer} data-testid="audio-demo">
      <div className={styles.demoHeader}>
        <h2 className={styles.demoTitle}>🎵 Audio Demo Automático</h2>
        <button
          onClick={processAudioDemo}
          disabled={isProcessing || engineStatus !== 'ready'}
          className={`${styles.btn} ${styles.btnPrimary}`}
          title={engineStatus !== 'ready' ? `Engine status: ${engineStatus}. Debe estar 'ready' para procesar.` : ''}
        >
          <span className={styles.btnIcon}>{isProcessing ? '⏳' : '🔄'}</span>
          <span>{isProcessing ? 'Procesando...' : 'Probar Audio Demo'}</span>
        </button>
      </div>
      <div className={styles.statusCard}>
        <div className={styles.statusRow}>
          <span className={styles.statusLabel}>Engine State:</span>
          <span className={`${styles.statusValue} ${styles[engineStatus] || ''}`} data-testid="engine-status">
            {engineStatus}
          </span>
        </div>
        {engineStatus !== 'ready' && engineStatus !== 'uninitialized' && (
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Info:</span>
            <span className={styles.statusValue}>
              {engineStatus === 'initializing' ? '⏳ Inicializando motor de audio...' :
               engineStatus === 'error' ? '❌ Error en el motor' :
               engineStatus === 'processing' ? '🔄 Procesando audio...' :
               engineStatus === 'degraded' ? '⚠️ Modo degradado activo' : 
               '🔄 Estado: ' + engineStatus}
            </span>
          </div>
        )}
      </div>
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}
      <div className={styles.audioGrid}>
        <div className={styles.audioCard}>
          <h3 className={styles.audioCardTitle}>🎙️ Audio Original</h3>
          {originalAudioUrl ? (
            <audio ref={originalAudioRef} controls src={originalAudioUrl} className={styles.audioPlayer} />
          ) : (<div className={styles.audioPlaceholder} />)}
        </div>
        <div className={styles.audioCard}>
          <h3 className={styles.audioCardTitle}>🔊 Audio Procesado</h3>
          {processedAudioUrl ? (
            <div className={styles.audioCardContent}>
              <audio ref={processedAudioRef} controls src={processedAudioUrl} className={styles.audioPlayer} />
              <button onClick={downloadProcessedAudio} className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}>
                <span className={styles.btnIcon}>💾</span>
                <span>Descargar Audio Limpio</span>
              </button>
            </div>
          ) : (<div className={styles.audioPlaceholder} />)}
        </div>
      </div>
      <div className={styles.logsCard}>
        <div className={styles.logsHeader}>
          <h3 className={styles.logsTitle}>📊 Logs en Tiempo Real</h3>
          <button onClick={exportLogs} disabled={logs.length === 0} className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}>
            <span className={styles.btnIcon}>📥</span>
            <span>Exportar</span>
          </button>
        </div>
        <div ref={logContainerRef} className={styles.logsContainer} data-testid="audio-logs">
          {logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              <span className={styles.logTime}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              {log.vad > 0 && (
                <>
                  <span className={styles.logFrame}> Frame {log.frame}:</span>
                  <span className={styles.logVad}> VAD={log.vad.toFixed(3)}</span>
                  <span className={styles.logRms}> RMS={log.rms.toFixed(3)}</span>
                </>
              )}
              <span className={styles.logMessage}> {log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className={styles.logsEmpty}>
              {engineStatus === 'ready' ? 'Esperando procesamiento...' : 
               engineStatus === 'initializing' ? '⏳ Inicializando motor...' :
               engineStatus === 'uninitialized' ? '❌ Motor no inicializado' :
               'Estado del motor: ' + engineStatus}
            </div>
          )}
        </div>
      </div>
      {logs.length > 0 && (
        <div className={styles.statsCard}>
          <h3 className={styles.statsTitle}>📈 Resumen de Estadísticas</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>Frames Procesados</p>
              <p className={styles.statValue}>{logs.filter(l => l.frame > 0).length}</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>VAD Promedio</p>
              <p className={`${styles.statValue} ${styles.vad}`}>{(logs.filter(l => l.vad > 0).reduce((sum, l) => sum + l.vad, 0) / Math.max(1, logs.filter(l => l.vad > 0).length)).toFixed(3)}</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>RMS Promedio</p>
              <p className="stat-value rms">{(logs.filter(l => l.rms > 0).reduce((sum, l) => sum + l.rms, 0) / Math.max(1, logs.filter(l => l.rms > 0).length)).toFixed(3)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
