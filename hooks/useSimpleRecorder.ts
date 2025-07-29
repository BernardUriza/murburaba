import { useState, useCallback, useRef, useEffect } from 'react'
import { SimplifiedAudioRecorder, SimpleMetrics, SimpleChunk } from '../packages/murmuraba/src/simple/SimplifiedAudioRecorder'

export function useSimpleRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [metrics, setMetrics] = useState<SimpleMetrics>({
    inputLevel: 0,
    vad: 0,
    noiseReduction: 0
  })
  const [chunks, setChunks] = useState<SimpleChunk[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const recorderRef = useRef<SimplifiedAudioRecorder | null>(null)
  
  // Initialize recorder
  useEffect(() => {
    const recorder = new SimplifiedAudioRecorder()
    recorderRef.current = recorder
    
    recorder.initialize().catch(err => {
      console.error('Failed to initialize recorder:', err)
      setError(err.message)
    })
    
    return () => {
      recorder.destroy()
    }
  }, [])
  
  const startRecording = useCallback(async () => {
    if (!recorderRef.current || isRecording) return
    
    try {
      setError(null)
      setChunks([])
      
      await recorderRef.current.startRecording(
        // Metrics callback - DIRECT UPDATE
        (newMetrics) => {
          setMetrics(newMetrics)
        },
        // Chunk callback - DIRECT UPDATE
        (chunk) => {
          setChunks(prev => [...prev, chunk])
        }
      )
      
      setIsRecording(true)
    } catch (err: any) {
      console.error('Failed to start recording:', err)
      setError(err.message)
    }
  }, [isRecording])
  
  const stopRecording = useCallback(() => {
    if (!recorderRef.current || !isRecording) return
    
    recorderRef.current.stopRecording()
    setIsRecording(false)
  }, [isRecording])
  
  return {
    isRecording,
    metrics,
    chunks,
    error,
    startRecording,
    stopRecording
  }
}