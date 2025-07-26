import React from 'react'

interface ProcessingBarProps {
  isRecording: boolean
}

export function ProcessingBar({ isRecording }: ProcessingBarProps) {
  return (
    <div className="recording-status-bar">
      <div className="recording-indicator pulse">
        <span className="recording-dot"></span>
        <span className="badge badge-recording">
          {isRecording ? 'Recording Audio' : 'Processing Audio'}
        </span>
      </div>
    </div>
  )
}