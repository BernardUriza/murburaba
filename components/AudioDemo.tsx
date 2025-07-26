import React, { useState, useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { addNotification } from '../store/slices/uiSlice'
import { useAudioProcessor } from '../hooks/useAudioProcessor'
import styles from './AudioDemo.module.css'

interface AudioDemoProps {
  autoProcess?: boolean
  onProcessComplete?: (buffer: ArrayBuffer) => void
  onError?: (error: Error) => void
}

type Urls = { original: string | null; processed: string | null }

export default function AudioDemo({
  autoProcess = true,
  onProcessComplete,
  onError
}: AudioDemoProps) {
  const dispatch = useAppDispatch()
  const { isProcessing, enableAGC, chunkDuration } = useAppSelector(s => s.audio)
  const { isReady, processFile } = useAudioProcessor()

  const [urls, setUrls] = useState<Urls>({ original: null, processed: null })
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  const handleProcess = useCallback(async () => {
    setError(null)
    try {
      // Load demo audio
      const resp = await fetch('/demo.wav')
      if (!resp.ok) throw new Error('Failed to load demo audio')
      const arrBuf = await resp.arrayBuffer()
      setUrls(u => ({
        ...u,
        original: URL.createObjectURL(new Blob([arrBuf], { type: 'audio/wav' }))
      }))
      // Process audio
      const file = new File([arrBuf], 'demo.wav', { type: 'audio/wav' })
      const result = await processFile(file)
      const chunk = result?.chunks?.[0]
      if (!chunk?.blob) throw new Error('No processed audio')
      setUrls(u => ({
        ...u,
        processed: URL.createObjectURL(chunk.blob)
      }))
      onProcessComplete?.(await chunk.blob.arrayBuffer())
      dispatch(addNotification({ type: 'success', message: 'Demo processed!' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed'
      setError(msg)
      dispatch(addNotification({ type: 'error', message: msg }))
      onError?.(err instanceof Error ? err : new Error(msg))
    }
  }, [processFile, dispatch, onProcessComplete, onError])

  useEffect(() => {
    if (autoProcess && isReady && !started && !isProcessing) {
      setStarted(true)
      handleProcess()
    }
  }, [autoProcess, isReady, started, isProcessing, handleProcess])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>🎧 Audio Demo</h3>
        <span className={isReady ? styles.ready : styles.notReady}>
          {isReady ? 'ready' : 'initializing'}
        </span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button
        onClick={handleProcess}
        disabled={isProcessing || !isReady}
        className={styles.processButton}
      >
        {isProcessing ? '⏳ Processing...' : '🎵 Process Demo'}
      </button>

      <div className={styles.audioPlayers}>
        <AudioBlock label="Original" src={urls.original} />
        <AudioBlock label="Processed" src={urls.processed} />
      </div>

      <div className={styles.settings}>
        <strong>AGC:</strong> {enableAGC ? 'ON' : 'OFF'}
        {' | '}
        <strong>Duration:</strong> {chunkDuration}s
      </div>
    </div>
  )
}

// Legibilidad: bloque para player
function AudioBlock({ label, src }: { label: string; src: string | null }) {
  return (
    <div>
      <h4>{label}</h4>
      <audio src={src ?? undefined} controls style={{ width: 240 }} />
    </div>
  )
}
