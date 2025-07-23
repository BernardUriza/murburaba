import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMurmubaraEngine } from 'murmuraba'
import type { ProcessingLog } from 'murmuraba'

interface AudioLog {
  timestamp: number
  frame: number
  vad: number
  rms: number
  message: string
}

export default function AudioDemo() {
  const [logs, setLogs] = useState<AudioLog[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null)
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoProcessStarted, setAutoProcessStarted] = useState(false)
  
  const originalAudioRef = useRef<HTMLAudioElement>(null)
  const processedAudioRef = useRef<HTMLAudioElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const {
    processFile,
    isInitialized,
    initializationError,
    initializeEngine
  } = useMurmubaraEngine({
    autoInitialize: true,
    logLevel: 'debug',
    allowDegraded: true,
    onLog: (log: ProcessingLog) => {
      if (log.level === 'info' || log.level === 'debug') {
        const match = log.message.match(/Frame (\d+): VAD=([\d.]+), RMS=([\d.]+)/)
        if (match) {
          const newLog: AudioLog = {
            timestamp: Date.now(),
            frame: parseInt(match[1]),
            vad: parseFloat(match[2]),
            rms: parseFloat(match[3]),
            message: log.message
          }
          setLogs(prev => [...prev, newLog])
        } else if (log.message.includes('Processing') || log.message.includes('VAD')) {
          const newLog: AudioLog = {
            timestamp: Date.now(),
            frame: logs.length,
            vad: 0,
            rms: 0,
            message: log.message
          }
          setLogs(prev => [...prev, newLog])
        }
      }
    }
  })

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  // Auto-process on mount
  useEffect(() => {
    if (isInitialized && !autoProcessStarted) {
      setAutoProcessStarted(true)
      processAudioDemo()
    }
  }, [isInitialized, autoProcessStarted, processAudioDemo])

  const processAudioDemo = useCallback(async () => {
    try {
      setIsProcessing(true)
      setError(null)
      setLogs([])
      setProcessedAudioUrl(null)

      // Load original audio
      const response = await fetch('/jfk_speech.wav')
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const originalBlob = new Blob([arrayBuffer], { type: 'audio/wav' })
      setOriginalAudioUrl(URL.createObjectURL(originalBlob))

      // Process with RNNoise
      const startTime = Date.now()
      setLogs([{
        timestamp: startTime,
        frame: 0,
        vad: 0,
        rms: 0,
        message: '🎙️ Iniciando procesamiento de jfk_speech.wav...'
      }])

      const processedBuffer = await processFile(arrayBuffer)
      
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000

      // Create processed audio blob
      const processedBlob = new Blob([processedBuffer], { type: 'audio/wav' })
      setProcessedAudioUrl(URL.createObjectURL(processedBlob))

      setLogs(prev => [...prev, {
        timestamp: endTime,
        frame: prev.length,
        vad: 0,
        rms: 0,
        message: `✅ Procesamiento completado en ${duration.toFixed(2)}s`
      }])

    } catch (err) {
      console.error('Audio demo error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLogs(prev => [...prev, {
        timestamp: Date.now(),
        frame: prev.length,
        vad: 0,
        rms: 0,
        message: `❌ Error: ${err}`
      }])
    } finally {
      setIsProcessing(false)
    }
  }, [processFile])

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
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] Frame ${log.frame}: VAD=${log.vad.toFixed(3)}, RMS=${log.rms.toFixed(3)} - ${log.message}`
    ).join('\n')
    
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
    <div className="bg-gray-900 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🎵 Audio Demo Automático</h2>
        <button
          onClick={processAudioDemo}
          disabled={isProcessing || !isInitialized}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? '⏳ Procesando...' : '🔄 Probar Audio Demo'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {initializationError && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-400">⚠️ Modo degradado: {initializationError}</p>
        </div>
      )}

      {/* Dual Audio Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">🎙️ Audio Original</h3>
          {originalAudioUrl ? (
            <audio
              ref={originalAudioRef}
              controls
              src={originalAudioUrl}
              className="w-full"
            />
          ) : (
            <div className="h-12 bg-gray-700 rounded animate-pulse" />
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">🔊 Audio Procesado</h3>
          {processedAudioUrl ? (
            <div className="space-y-2">
              <audio
                ref={processedAudioRef}
                controls
                src={processedAudioUrl}
                className="w-full"
              />
              <button
                onClick={downloadProcessedAudio}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
              >
                💾 Descargar Audio Limpio
              </button>
            </div>
          ) : (
            <div className="h-12 bg-gray-700 rounded animate-pulse" />
          )}
        </div>
      </div>

      {/* Real-time Logs */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">📊 Logs en Tiempo Real</h3>
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="px-4 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            📥 Exportar Logs
          </button>
        </div>
        <div
          ref={logContainerRef}
          className="h-64 overflow-y-auto bg-gray-900 rounded p-3 font-mono text-xs text-gray-300"
        >
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              {log.vad > 0 && (
                <>
                  <span className="text-blue-400"> Frame {log.frame}:</span>
                  <span className="text-green-400"> VAD={log.vad.toFixed(3)}</span>
                  <span className="text-yellow-400"> RMS={log.rms.toFixed(3)}</span>
                </>
              )}
              <span className="text-gray-300"> {log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500">Esperando procesamiento...</div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      {logs.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">📈 Resumen de Estadísticas</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Frames Procesados</p>
              <p className="text-2xl font-bold text-white">{logs.filter(l => l.frame > 0).length}</p>
            </div>
            <div>
              <p className="text-gray-400">VAD Promedio</p>
              <p className="text-2xl font-bold text-green-400">
                {(logs.filter(l => l.vad > 0).reduce((sum, l) => sum + l.vad, 0) / Math.max(1, logs.filter(l => l.vad > 0).length)).toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">RMS Promedio</p>
              <p className="text-2xl font-bold text-yellow-400">
                {(logs.filter(l => l.rms > 0).reduce((sum, l) => sum + l.rms, 0) / Math.max(1, logs.filter(l => l.rms > 0).length)).toFixed(3)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}