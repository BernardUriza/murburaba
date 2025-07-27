import React, { useEffect, useState } from 'react'
import { useMurmurabaSuite, SUITE_TOKENS, TOKENS } from 'murmuraba'
import type { IAudioProcessor, IMetricsManager, ProcessingMetrics } from 'murmuraba'
import { useAppSelector } from '../store/hooks'
import { useMediaStream } from '../context/MediaStreamContext'
import styles from './GlobalAudioMonitor.module.css'

export function GlobalAudioMonitor() {
  const { container, isReady } = useMurmurabaSuite()
  const { isProcessing, isRecording, chunks, currentInputLevel } = useAppSelector(state => state.audio)
  const { currentStream } = useMediaStream()
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null)
  const [vadLevel, setVadLevel] = useState(0)
  const [streamInfo, setStreamInfo] = useState<{id: string, tracks: number} | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  useEffect(() => {
    if (!isReady || !container) return
    
    try {
      if (!container.has(SUITE_TOKENS.AudioProcessor)) {
        console.log('AudioProcessor not available yet')
        return
      }
      
      const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
      const metricsManager = container.has(TOKENS.MetricsManager) 
        ? container.get<IMetricsManager>(TOKENS.MetricsManager)
        : null
      
      // Subscribe to metrics updates
      const unsubscribe = processor.onMetrics((newMetrics) => {
        console.log('🎯 GlobalAudioMonitor received metrics:', newMetrics)
        setMetrics(newMetrics)
      })
      
      // Get current metrics from manager
      if (metricsManager && 'getMetrics' in metricsManager) {
        const currentMetrics = (metricsManager as any).getMetrics()
        console.log('Current metrics:', currentMetrics)
      }
      
      // Also subscribe directly to MetricsManager
      let metricsUnsubscribe: (() => void) | null = null
      if (metricsManager && 'on' in metricsManager) {
        (metricsManager as any).on('metrics-update', (metrics: ProcessingMetrics) => {
          console.log('🎯 GlobalAudioMonitor received metrics from MetricsManager:', metrics)
          setMetrics(metrics)
          
          // Get real VAD from MetricsManager
          if (metricsManager && 'getAverageVAD' in metricsManager) {
            const averageVAD = (metricsManager as any).getAverageVAD()
            console.log('🎙️ VAD Level:', averageVAD)
            setVadLevel(averageVAD)
          }
        })
        metricsUnsubscribe = () => (metricsManager as any).off('metrics-update')
      }
      
      // Periodic VAD update
      const vadInterval = setInterval(() => {
        if (metricsManager && 'getAverageVAD' in metricsManager) {
          const averageVAD = (metricsManager as any).getAverageVAD()
          setVadLevel(averageVAD)
        }
      }, 100) // Update every 100ms
      
      return () => {
        unsubscribe()
        if (metricsUnsubscribe) metricsUnsubscribe()
        clearInterval(vadInterval)
      }
    } catch (error) {
      console.error('Failed to setup audio monitoring:', error)
    }
  }, [container, isReady])
  
  // Update stream info when stream changes
  useEffect(() => {
    if (currentStream) {
      setStreamInfo({
        id: currentStream.id,
        tracks: currentStream.getTracks().length
      })
    } else {
      setStreamInfo(null)
    }
  }, [currentStream])
  
  // Always show the monitor for debugging
  return (
    <div className={`${styles.monitor} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <h4>🎙️ Audio Monitor</h4>
        <div className={styles.headerRight}>
          <div className={styles.status}>
            {isRecording && <span className={styles.recording}>● REC</span>}
            {isProcessing && <span className={styles.processing}>⚡ Processing</span>}
            {!isReady && <span style={{color: '#ff9900'}}>⏳ Loading</span>}
          </div>
          <button 
            className={styles.collapseButton}
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <>
          {/* Stream Status */}
          <div style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid #333' }}>
            <div>Stream: {streamInfo ? `✅ ${streamInfo.id.slice(0, 8)}... (${streamInfo.tracks} tracks)` : '❌ No stream'}</div>
            <div>Engine: {isReady ? '✅ Ready' : '⏳ Initializing'}</div>
            <div>Live Input Level: {(currentInputLevel * 100).toFixed(0)}%</div>
          </div>
          
          <div className={styles.metrics}>
        <div className={styles.metric}>
          <label>Input Level</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${(currentInputLevel || (metrics?.inputLevel || 0)) * 100}%`,
                backgroundColor: (currentInputLevel || (metrics?.inputLevel || 0)) > 0.8 ? '#ff4444' : '#44ff44'
              }}
            />
          </div>
          <span>{((currentInputLevel || (metrics?.inputLevel || 0)) * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>Output Level</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${(metrics?.outputLevel || 0) * 100}%`,
                backgroundColor: '#4444ff'
              }}
            />
          </div>
          <span>{((metrics?.outputLevel || 0) * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>Noise Reduction</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${(metrics?.noiseReductionLevel || 0) * 100}%`,
                backgroundColor: '#ff44ff'
              }}
            />
          </div>
          <span>{((metrics?.noiseReductionLevel || 0) * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>VAD Score</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${vadLevel * 100}%`,
                backgroundColor: vadLevel > 0.7 ? '#00ff00' : '#ffaa00'
              }}
            />
          </div>
          <span>{(vadLevel * 100).toFixed(0)}%</span>
        </div>
          </div>
          
          <div className={styles.stats}>
            <div>Latency: {(metrics?.processingLatency || 0).toFixed(1)}ms</div>
            <div>Frames: {metrics?.frameCount || 0}</div>
            <div>Dropped: {metrics?.droppedFrames || 0}</div>
            <div>Chunks: {chunks.length}</div>
          </div>
          
          {/* Debug Info */}
          <div style={{ padding: '10px', fontSize: '11px', color: '#888', borderTop: '1px solid #333' }}>
            <div>🐛 Debug Info:</div>
            <div>- isProcessing: {isProcessing ? 'true' : 'false'}</div>
            <div>- isRecording: {isRecording ? 'true' : 'false'}</div>
            <div>- hasMetrics: {metrics ? 'true' : 'false'}</div>
            <div>- Redux inputLevel: {(currentInputLevel * 100).toFixed(1)}%</div>
          </div>
        </>
      )}
    </div>
  )
}