import React from 'react'
import { useAppSelector } from '../../store/hooks'

interface ProcessingBarProps {
  isRecording: boolean
}

export function ProcessingBar({ isRecording }: ProcessingBarProps) {
  // Use Redux state instead of direct listener to avoid duplicate updates
  const audioLevel = useAppSelector(state => state.audio.currentInputLevel || 0)
  
  return (
    <div className="recording-status-bar">
      <div className="recording-indicator pulse">
        <span className="recording-dot"></span>
        <span className="badge badge-recording">
          {isRecording ? 'Recording' : 'Processing'}
        </span>
        
        {/* Minimal Audio Level Indicator */}
        <div style={{
          marginLeft: '15px',
          width: '60px',
          height: '4px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '2px',
          overflow: 'hidden',
          display: 'inline-block',
          verticalAlign: 'middle'
        }}>
          <div style={{
            width: `${audioLevel * 100}%`,
            height: '100%',
            background: '#44ff44',
            transition: 'width 0.1s ease-out',
            opacity: audioLevel > 0 ? 1 : 0.3
          }} />
        </div>
      </div>
    </div>
  )
}