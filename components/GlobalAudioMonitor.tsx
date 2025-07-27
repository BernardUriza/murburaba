import React, { useEffect, useState } from 'react'
import { useMurmurabaSuite, SUITE_TOKENS, TOKENS } from 'murmuraba'
import type { IAudioProcessor, IMetricsManager, ProcessingMetrics } from 'murmuraba'
import { useAppSelector } from '../store/hooks'
import styles from './GlobalAudioMonitor.module.css'

export function GlobalAudioMonitor() {
  const { container, isReady } = useMurmurabaSuite()
  const { isProcessing, isRecording, chunks } = useAppSelector(state => state.audio)
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null)
  const [vadLevel, setVadLevel] = useState(0)
  
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
        
        // Calculate average VAD from chunks
        if (chunks.length > 0) {
          const avgVad = chunks.reduce((sum, chunk) => sum + chunk.averageVad, 0) / chunks.length
          setVadLevel(avgVad)
        }
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
        })
        metricsUnsubscribe = () => (metricsManager as any).off('metrics-update')
      }
      
      return () => {
        unsubscribe()
        if (metricsUnsubscribe) metricsUnsubscribe()
      }
    } catch (error) {
      console.error('Failed to setup audio monitoring:', error)
    }
  }, [container, isReady, chunks])
  
  if (!isReady || !metrics) return null
  
  return (
    <div className={styles.monitor}>
      <div className={styles.header}>
        <h4>Audio Monitor</h4>
        <div className={styles.status}>
          {isRecording && <span className={styles.recording}>● REC</span>}
          {isProcessing && <span className={styles.processing}>⚡ Processing</span>}
        </div>
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
          <label>Output Level</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${metrics.outputLevel * 100}%`,
                backgroundColor: '#4444ff'
              }}
            />
          </div>
          <span>{(metrics.outputLevel * 100).toFixed(0)}%</span>
        </div>
        
        <div className={styles.metric}>
          <label>Noise Reduction</label>
          <div className={styles.bar}>
            <div 
              className={styles.fill}
              style={{ 
                width: `${metrics.noiseReductionLevel * 100}%`,
                backgroundColor: '#ff44ff'
              }}
            />
          </div>
          <span>{(metrics.noiseReductionLevel * 100).toFixed(0)}%</span>
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
        <div>Latency: {metrics.processingLatency.toFixed(1)}ms</div>
        <div>Frames: {metrics.frameCount}</div>
        <div>Dropped: {metrics.droppedFrames}</div>
        <div>Chunks: {chunks.length}</div>
      </div>
    </div>
  )
}