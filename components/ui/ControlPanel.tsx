import React from 'react'

interface ControlPanelProps {
  isReady: boolean
  isProcessing: boolean
  isRecording: boolean
  enableAGC: boolean
  chunkDuration: number
  onInit: () => void
  onRecord: () => void
  onStop: () => void
  onSetAGC: (v: boolean) => void
  onSetDuration: (d: number) => void
}

export function ControlPanel({
  isReady,
  isProcessing,
  isRecording,
  enableAGC,
  chunkDuration,
  onInit,
  onRecord,
  onStop,
  onSetAGC,
  onSetDuration
}: ControlPanelProps) {
  const durations = [5, 8, 10, 15]

  return (
    <section className="recording-panel glass-card">
      <div className="panel-header">
        <h2 className="panel-title">Audio Controls</h2>
      </div>
      
      <div className="controls-grid">
        <button
          className="btn btn-primary"
          onClick={onRecord}
          disabled={isProcessing}
          style={{ display: isRecording ? 'none' : 'flex' }}
        >
          <span className="btn-icon">🎙️</span>
          <span>{isProcessing ? 'Processing...' : 'Start Recording'}</span>
        </button>
        {isRecording && (
          <button className="btn btn-danger" onClick={onStop}>
            <span className="btn-icon">⏹️</span>
            <span>Stop Recording</span>
          </button>
        )}
        
        <div className="control-group" style={{ marginTop: '1rem' }}>
          <label className="control-label">⏱️ Recording Duration</label>
          <div className="nav-pills" style={{ justifyContent: 'center' }}>
            {durations.map(duration => (
              <button
                key={duration}
                className={`nav-pill ${chunkDuration === duration ? 'active' : ''}`}
                onClick={() => onSetDuration(duration)}
                disabled={isProcessing}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>
        
        <div className="control-group" style={{ marginTop: '1rem' }}>
          <label className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={enableAGC}
              onChange={e => onSetAGC(e.target.checked)}
              disabled={isReady}
              style={{ width: 18, height: 18, cursor: isReady ? 'not-allowed' : 'pointer' }}
            />
            🎚️ Enable AGC (Auto Gain Control)
          </label>
          {isReady && (
            <small style={{ color: '#999', marginTop: '0.25rem', display: 'block' }}>
              Reinitialize engine to change AGC setting
            </small>
          )}
        </div>
      </div>
    </section>
  )
}