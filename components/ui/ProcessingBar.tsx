import React, { useEffect, useState } from 'react'
import { useMurmurabaSuite, TOKENS } from 'murmuraba'
import type { IMetricsManager } from 'murmuraba'

interface ProcessingBarProps {
  isRecording: boolean
}

export function ProcessingBar({ isRecording }: ProcessingBarProps) {
  const [audioLevel, setAudioLevel] = useState(0)
  const { container, isReady } = useMurmurabaSuite()
  
  useEffect(() => {
    if (!isReady || !container) return
    
    try {
      const metricsManager = container.has(TOKENS.MetricsManager) 
        ? container.get<IMetricsManager>(TOKENS.MetricsManager) as any
        : null
        
      if (metricsManager && metricsManager.on) {
        metricsManager.on('metrics-update', (metrics: any) => {
          setAudioLevel(metrics.inputLevel || 0)
        })
      }
    } catch (error) {
      console.error('Failed to setup audio monitoring in ProcessingBar:', error)
    }
  }, [container, isReady])
  
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