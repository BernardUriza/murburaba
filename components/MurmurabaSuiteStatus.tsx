import React, { useState, useEffect } from 'react'
import { useMurmurabaSuite } from 'murmuraba'
import { useAppSelector } from '../store/hooks'
import { selectEngineStatus } from '../store/selectors'

export function MurmurabaSuiteStatus() {
  const { isReady, error } = useMurmurabaSuite()
  const engineStatus = useAppSelector(selectEngineStatus)
  const [wasmInfo, setWasmInfo] = useState<{ loaded: boolean; size?: number; path?: string }>({
    loaded: false
  })

  useEffect(() => {
    // Check WASM file info
    fetch('/rnnoise.wasm', { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          const size = response.headers.get('Content-Length')
          setWasmInfo({
            loaded: true,
            size: size ? parseInt(size) : undefined,
            path: '/rnnoise.wasm'
          })
        }
      })
      .catch(() => {
        setWasmInfo({ loaded: false })
      })
  }, [])

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return null // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      padding: '10px 15px',
      background: isReady ? '#4caf50' : error ? '#f44336' : '#ff9800',
      color: 'white',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 5 }}>
        🎙️ Murmuraba Engine Status
      </div>
      <div>Engine: {engineStatus.isInitialized ? '✅ Initialized' : '⏳ Loading'}</div>
      <div>Status: {engineStatus.isInitialized && !engineStatus.isProcessing && !engineStatus.isRecording ? '🟢 Ready' : engineStatus.isRecording ? '🎙️ Recording' : engineStatus.isProcessing ? '🔴 Processing' : '⚪ Idle'}</div>
      
      <div style={{ marginTop: 5, borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 5 }}>
        WASM Module:
      </div>
      <div>• File: {wasmInfo.loaded ? '✅ /rnnoise.wasm' : '❌ Not found'}</div>
      {wasmInfo.size && (
        <div>• Size: {(wasmInfo.size / 1024).toFixed(1)} KB</div>
      )}
      <div>• Algorithm: RNNoise (Xiph.org)</div>
      
      {error && (
        <div style={{ marginTop: 5, borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 5, color: '#ffcccb' }}>
          Error: {error.message}
        </div>
      )}
    </div>
  )
}