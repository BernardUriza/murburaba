import React, { useEffect, useState } from 'react'
import { useMurmurabaSuite, TOKENS } from 'murmuraba'
import type { IMetricsManager } from 'murmuraba'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setVadLevel as setReduxVadLevel } from '../store/slices/audioSlice'
import { useMediaStream } from '../context/MediaStreamContext'
import styles from './GlobalAudioMonitor.module.css'

export function GlobalAudioMonitor() {
  const dispatch = useAppDispatch()
  const { container, isReady } = useMurmurabaSuite()
  const { 
    isProcessing, 
    isRecording, 
    chunks, 
    currentInputLevel,
    currentOutputLevel,
    noiseReductionLevel,
    vadLevel
  } = useAppSelector(state => state.audio)
  
  // Debug log
  useEffect(() => {
    if (Math.random() < 0.05) {
      console.log('🎨 GlobalAudioMonitor levels:', {
        input: currentInputLevel,
        output: currentOutputLevel,
        vad: vadLevel,
        noise: noiseReductionLevel
      })
    }
  }, [currentInputLevel, currentOutputLevel, vadLevel, noiseReductionLevel])
  const { currentStream } = useMediaStream()
  const [localVadLevel, setLocalVadLevel] = useState(0)
  const [streamInfo, setStreamInfo] = useState<{id: string, tracks: number} | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  useEffect(() => {
    if (!isReady || !container) return
    
    try {
      // Get MetricsManager and subscribe to metrics updates
      const metricsManager = container.has(TOKENS.MetricsManager) 
        ? container.get<IMetricsManager>(TOKENS.MetricsManager)
        : null
      
      if (!metricsManager) return
      
      // Subscribe to metrics updates instead of polling
      const unsubscribe = metricsManager.onMetricsUpdate((metrics) => {
        // Update VAD from metrics
        if ('getAverageVAD' in metricsManager) {
          const averageVAD = (metricsManager as any).getAverageVAD()
          setLocalVadLevel(averageVAD)
          dispatch(setReduxVadLevel(averageVAD))
        }
      })
      
      return () => {
        unsubscribe()
      }
    } catch (error) {
      console.error('Failed to setup audio monitoring:', error)
    }
  }, [container, isReady, dispatch])
  
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
                width: `${currentInputLevel * 100}%`,
                backgroundColor: currentInputLevel > 0.8 ? '#ff4444' : '#44ff44'
              }}
            />
          </div>
          <span>{(currentInputLevel * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>Output Level</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${currentOutputLevel * 100}%`,
                backgroundColor: '#4444ff'
              }}
            />
          </div>
          <span>{(currentOutputLevel * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>Noise Reduction</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${noiseReductionLevel * 100}%`,
                backgroundColor: '#ff44ff'
              }}
            />
          </div>
          <span>{(noiseReductionLevel * 100).toFixed(0)}%</span>
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
            <div>Latency: 0.0ms</div>
            <div>Frames: 0</div>
            <div>Dropped: 0</div>
            <div>Chunks: {chunks.length}</div>
          </div>
          
          {/* Debug Info */}
          <div style={{ padding: '10px', fontSize: '11px', color: '#888', borderTop: '1px solid #333' }}>
            <div>🐛 Debug Info:</div>
            <div>- isProcessing: {isProcessing ? 'true' : 'false'}</div>
            <div>- isRecording: {isRecording ? 'true' : 'false'}</div>
            <div>- vadLevel: {(vadLevel * 100).toFixed(1)}%</div>
            <div>- outputLevel: {(currentOutputLevel * 100).toFixed(1)}%</div>
            <div>- Redux inputLevel: {(currentInputLevel * 100).toFixed(1)}%</div>
          </div>
        </>
      )}
    </div>
  )
}