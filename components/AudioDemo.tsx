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

type Urls = { original: string | null; processedChunks: string[] }

export default function AudioDemo({
  autoProcess = false,
  onProcessComplete,
  onError
}: AudioDemoProps) {
  const dispatch = useAppDispatch()
  const { isProcessing, enableAGC, chunkDuration } = useAppSelector(s => s.audio)
  const { isReady, processFile } = useAudioProcessor()

  const [urls, setUrls] = useState<Urls>({ original: null, processedChunks: [] })
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  const handleProcess = useCallback(async () => {
    setError(null)
    try {
      // Load demo audio
      console.log('[AudioDemo] Loading demo audio...')
      const resp = await fetch('/jfk_speech.wav')
      if (!resp.ok) throw new Error('Failed to load demo audio')
      const arrBuf = await resp.arrayBuffer()
      console.log('[AudioDemo] Audio loaded, size:', arrBuf.byteLength)
      
      setUrls(u => ({
        ...u,
        original: URL.createObjectURL(new Blob([arrBuf], { type: 'audio/wav' }))
      }))
      
      // Process audio
      const file = new File([arrBuf], 'jfk_speech.wav', { type: 'audio/wav' })
      console.log('[AudioDemo] Processing file:', file.name, 'size:', file.size)
      
      const result = await processFile(file, {
        chunkDuration,
        enableAGC
      })
      console.log('[AudioDemo] Process result:', result)
      
      if (!result) {
        throw new Error('Processing failed - processFile returned null')
      }
      
      console.log('[AudioDemo] Chunks in result:', result.chunks?.length || 0)
      if (!result.chunks || result.chunks.length === 0) {
        throw new Error('Processing completed but no audio chunks were generated')
      }
      
      // Create URLs for all chunks
      const chunkUrls = result.chunks
        .filter(chunk => chunk.blob)
        .map(chunk => URL.createObjectURL(chunk.blob!))
      
      console.log('[AudioDemo] Created URLs for', chunkUrls.length, 'chunks')
      setUrls(u => ({
        ...u,
        processedChunks: chunkUrls
      }))
      
      // For callback, use first chunk
      if (result.chunks[0]?.blob) {
        onProcessComplete?.(await result.chunks[0].blob.arrayBuffer())
      }
      dispatch(addNotification({ type: 'success', message: 'Demo processed!' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed'
      setError(msg)
      dispatch(addNotification({ type: 'error', message: msg }))
      onError?.(err instanceof Error ? err : new Error(msg))
    }
  }, [processFile, dispatch, onProcessComplete, onError, chunkDuration, enableAGC])

  useEffect(() => {
    if (autoProcess && isReady && !started) {
      setStarted(true)
      handleProcess()
    }
  }, [autoProcess, isReady, started, handleProcess])

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
        {urls.processedChunks.length === 0 ? (
          <AudioBlock label="Processed" src={null} />
        ) : (
          urls.processedChunks.map((chunkUrl, index) => (
            <AudioBlock 
              key={index} 
              label={`Chunk ${index + 1}`} 
              src={chunkUrl} 
            />
          ))
        )}
      </div>

      <div className={styles.settings}>
        <strong>AGC:</strong> {enableAGC ? 'ON' : 'OFF'}
        {' | '}
        <strong>Duration:</strong> {chunkDuration}s
        {' | '}
        <strong>Chunks:</strong> {urls.processedChunks.length}
      </div>
    </div>
  )
}

// Legibilidad: bloque para player
function AudioBlock({ label, src }: { label: string; src: string | null }) {
  return (
    <div className={styles.audioCard}>
      <h4 className={styles.audioCardTitle}>{label}</h4>
      {src ? (
        <audio src={src} controls className={styles.audioPlayer} />
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
