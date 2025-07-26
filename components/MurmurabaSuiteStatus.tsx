import React from 'react'
import { useMurmurabaSuite } from 'murmuraba'
import { TOKENS } from '../packages/murmuraba/src/core/DIContainer'

export function MurmurabaSuiteStatus() {
  const { container, isReady, error } = useMurmurabaSuite()

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
        MurmurabaSuite Status
      </div>
      <div>Ready: {isReady ? '✅' : '❌'}</div>
      {error && <div>Error: {error.message}</div>}
      {isReady && container && (
        <>
          <div style={{ marginTop: 5, borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: 5 }}>
            Services:
          </div>
          <div>• AudioProcessor: {container.has(TOKENS.AudioProcessor) ? '✅' : '❌'}</div>
          <div>• Logger: {container.has(TOKENS.Logger) ? '✅' : '❌'}</div>
          <div>• StateManager: {container.has(TOKENS.StateManager) ? '✅' : '❌'}</div>
          <div>• EventEmitter: {container.has(TOKENS.EventEmitter) ? '✅' : '❌'}</div>
          <div>• MetricsManager: {container.has(TOKENS.MetricsManager) ? '✅' : '❌'}</div>
        </>
      )}
    </div>
  )
}