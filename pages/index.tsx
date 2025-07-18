import Head from 'next/head'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { WaveformAnalyzer } from '../components/WaveformAnalyzer'
import { RNNoiseDebug } from '../components/RNNoiseDebug'

export default function Home() {
  const {
    isRecording,
    audioChunks,
    chunkDuration,
    startRecording,
    stopRecording,
    setChunkDuration,
    clearChunks,
    isNoiseSuppressionEnabled,
    setNoiseSuppressionEnabled,
    isRNNoiseInitialized,
    isRNNoiseLoading,
    rnnoiseError,
    initializeRNNoise
  } = useAudioRecorder({ initialChunkDuration: 2, enableNoiseSupression: true })

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
          <RNNoiseDebug 
            isInitialized={isRNNoiseInitialized}
            isLoading={isRNNoiseLoading}
            isRecording={isRecording}
            noiseSuppressionEnabled={isNoiseSuppressionEnabled}
            error={rnnoiseError}
          />
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
            
            <div className="noise-reduction-control">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isNoiseSuppressionEnabled}
                  onChange={(e) => setNoiseSuppressionEnabled(e.target.checked)}
                  disabled={isRecording}
                />
                <span className="slider"></span>
              </label>
              <span className="control-label">
                Reducción de ruido
                {isNoiseSuppressionEnabled && ' ✓'}
              </span>
            </div>
            
            {isNoiseSuppressionEnabled && !isRNNoiseInitialized && !isRecording && (
              <button 
                onClick={initializeRNNoise} 
                disabled={isRNNoiseLoading}
                className={`btn ${isRNNoiseLoading ? 'btn-disabled' : 'btn-secondary'}`}
              >
                {isRNNoiseLoading ? '⏳ Inicializando...' : '🔧 Inicializar RNNoise'}
              </button>
            )}
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
                  {isNoiseSuppressionEnabled && chunk.urlWithoutNR ? (
                    <div className="audio-comparison">
                      <div className="audio-item">
                        <label>Con reducción de ruido:</label>
                        <audio controls src={chunk.url} />
                        <WaveformAnalyzer 
                          audioUrl={chunk.url} 
                          label="Señal con RNNoise" 
                          color="#00ff00"
                        />
                      </div>
                      <div className="audio-item">
                        <label>Sin reducción de ruido:</label>
                        <audio controls src={chunk.urlWithoutNR} />
                        <WaveformAnalyzer 
                          audioUrl={chunk.urlWithoutNR} 
                          label="Señal original" 
                          color="#ff0000"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <audio controls src={chunk.url} />
                      <WaveformAnalyzer 
                        audioUrl={chunk.url} 
                        label="Señal de audio" 
                        color="#00ff00"
                      />
                    </>
                  )}
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