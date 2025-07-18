import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'

interface AudioChunk {
  id: number
  url: string
  timestamp: Date
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([])
  const [chunkDuration, setChunkDuration] = useState(2)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunkIdRef = useRef(0)
  const isStillRecordingRef = useRef(false)

  const handleAudioChunk = (currentChunks: Blob[]) => {
    if (currentChunks.length > 0) {
      const audioBlob = new Blob(currentChunks, { type: 'audio/webm' })
      const url = URL.createObjectURL(audioBlob)
      
      setAudioChunks(prev => [...prev, {
        id: chunkIdRef.current++,
        url,
        timestamp: new Date()
      }])
    }
  }

  const scheduleChunkStop = (mediaRecorder: MediaRecorder) => {
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }, chunkDuration * 1000)
  }

  const createMediaRecorder = (stream: MediaStream): MediaRecorder | null => {
    if (!isStillRecordingRef.current || !streamRef.current || !streamRef.current.active) {
      return null
    }
    
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder
    const currentChunks: Blob[] = []
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        currentChunks.push(event.data)
      }
    }
    
    mediaRecorder.onstop = () => {
      handleAudioChunk(currentChunks)
      
      // Iniciar el siguiente chunk si seguimos grabando
      if (isStillRecordingRef.current && streamRef.current && streamRef.current.active) {
        setTimeout(() => startNextChunk(stream), 100)
      }
    }
    
    return mediaRecorder
  }

  const startNextChunk = (stream: MediaStream) => {
    const mediaRecorder = createMediaRecorder(stream)
    if (mediaRecorder) {
      mediaRecorder.start()
      scheduleChunkStop(mediaRecorder)
    }
  }

  const initializeRecording = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setAudioChunks([])
      chunkIdRef.current = 0
      setIsRecording(true)
      isStillRecordingRef.current = true
      return stream
    } catch (error) {
      console.error('Error al acceder al micrófono:', error)
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.')
      return null
    }
  }

  const startRecording = async () => {
    const stream = await initializeRecording()
    if (stream) {
      startNextChunk(stream)
    }
  }

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const stopRecording = () => {
    isStillRecordingRef.current = false
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    cleanupStream()
    setIsRecording(false)
  }
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      cleanupStream()
    }
  }, [])

  return (
    <>
      <Head>
        <title>Mi Proyecto Next.js</title>
        <meta name="description" content="Proyecto sencillo creado con Next.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="container">
        <h1>Bienvenido a Next.js!</h1>
        <p>Este es un proyecto sencillo de Next.js.</p>
        
        <section className="audio-recorder">
          <h2>Grabador de Audio</h2>
          <div className="controls-container">
            <div className="button-group">
              <button 
                onClick={startRecording} 
                disabled={isRecording}
                className={`btn ${isRecording ? 'btn-disabled' : 'btn-primary'}`}
              >
                🎤 Grabar Audio
              </button>
              <button 
                onClick={stopRecording} 
                disabled={!isRecording}
                className={`btn ${!isRecording ? 'btn-disabled' : 'btn-danger'}`}
              >
                ⏹️ Detener
              </button>
            </div>
            
            <div className="chunk-duration-control">
              <label htmlFor="chunk-duration">
                Duración de chunks (segundos):
              </label>
              <input
                id="chunk-duration"
                type="number"
                min="1"
                max="10"
                value={chunkDuration}
                onChange={(e) => setChunkDuration(Number(e.target.value))}
                disabled={isRecording}
                className="duration-input"
              />
            </div>
          </div>
          
          {isRecording && (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              Grabando... (chunks de {chunkDuration}s)
            </div>
          )}
          
          {audioChunks.length > 0 && (
            <div className="chunks-list">
              <h3>Chunks de Audio:</h3>
              {audioChunks.map((chunk, index) => (
                <div key={chunk.id} className="audio-chunk">
                  <div className="chunk-header">
                    <span>Chunk {index + 1}</span>
                    <span className="chunk-time">
                      {chunk.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <audio controls src={chunk.url} />
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className="grid">
          <div className="card">
            <h2>Documentación →</h2>
            <p>Encuentra información detallada sobre las características y API de Next.js.</p>
          </div>
          
          <div className="card">
            <h2>Aprende →</h2>
            <p>Aprende sobre Next.js con un tutorial interactivo!</p>
          </div>
          
          <div className="card">
            <h2>Ejemplos →</h2>
            <p>Descubre y despliega proyectos de ejemplo con Next.js.</p>
          </div>
        </section>
      </main>
    </>
  )
}