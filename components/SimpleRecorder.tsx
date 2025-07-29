import React from 'react'
import { useSimpleRecorder } from '../hooks/useSimpleRecorder'
import styles from './SimpleRecorder.module.css'

export function SimpleRecorder() {
  const { isRecording, metrics, chunks, error, startRecording, stopRecording, setChunks } = useSimpleRecorder()
  
  return (
    <div className={styles.container}>
      <h2 style={{ fontSize: '28px', marginBottom: '20px', textAlign: 'center' }}>
        🎤 Simple Recorder
        <span style={{ fontSize: '16px', color: '#ff4444', display: 'block', marginTop: '5px' }}>
          Direct Audio → Processing → UI (No Redux, No DI, No BS)
        </span>
      </h2>
      
      {error && (
        <div className={styles.error}>❌ {error}</div>
      )}
      
      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`${styles.recordButton} ${isRecording ? styles.recording : ''}`}
        >
          {isRecording ? '⏹️ Stop Recording' : '🔴 Start Recording'}
        </button>
        {isRecording && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#ff4444' }}>
            Recording... {chunks.length * 8}s
          </div>
        )}
      </div>
      
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <label>Input Level</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${metrics.inputLevel * 100}%`,
                backgroundColor: metrics.inputLevel > 0.8 ? '#ff4444' : '#44ff44'
              }}
            />
          </div>
          <span>{(metrics.inputLevel * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>VAD (Voice Activity)</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${metrics.vad * 100}%`,
                backgroundColor: metrics.vad > 0.5 ? '#00ff00' : '#ffaa00'
              }}
            />
          </div>
          <span>{(metrics.vad * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>Noise Reduction</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${metrics.noiseReduction * 100}%`,
                backgroundColor: '#ff00ff'
              }}
            />
          </div>
          <span>{(metrics.noiseReduction * 100).toFixed(0)}%</span>
        </div>
      </div>
      
      <div className={styles.chunks}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Processed Chunks: {chunks.length}</h3>
          {chunks.length > 0 && (
            <button 
              onClick={() => setChunks([])}
              style={{
                background: '#ff4444',
                color: 'white',
                border: 'none',
                padding: '5px 15px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ Clear All
            </button>
          )}
        </div>
        {chunks.map(chunk => (
          <div key={chunk.id} className={styles.chunk}>
            <span>Duration: {chunk.duration.toFixed(1)}s</span>
            <span>VAD: {(chunk.vad * 100).toFixed(0)}%</span>
            <audio 
              controls 
              src={URL.createObjectURL(chunk.blob)}
              style={{ height: '30px' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}