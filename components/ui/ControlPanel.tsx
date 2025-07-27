import React from 'react'
import styles from './ControlPanel.module.css'

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
    <section className={styles.controlPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          <span className={styles.titleIcon}>🎛️</span>
          Audio Controls
        </h2>
        <div className={styles.headerGlow}></div>
      </div>
      
      <div className={styles.controlsGrid}>
        <button
          id="start-recording"
          className={`${styles.actionButton} ${styles.recordButton} ${(isProcessing || !isReady) ? styles.disabled : ''}`}
          onClick={onRecord}
          disabled={isProcessing || !isReady}
          style={{ display: isRecording ? 'none' : 'flex' }}
        >
          <div className={styles.buttonContent}>
            <span className={styles.buttonIcon}>🎙️</span>
            <span className={styles.buttonText}>
              {isProcessing ? 'Processing...' : 'Start Recording'}
            </span>
          </div>
          <div className={styles.buttonGlow}></div>
        </button>
        {isRecording && (
          <button className={`${styles.actionButton} ${styles.stopButton}`} onClick={onStop}>
            <div className={styles.buttonContent}>
              <span className={styles.buttonIcon}>⏹️</span>
              <span className={styles.buttonText}>Stop Recording</span>
            </div>
            <div className={styles.pulseAnimation}></div>
          </button>
        )}
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>
            <span className={styles.labelIcon}>⏱️</span>
            Chunk Duration
          </label>
          <div className={styles.navPills}>
            {durations.map(duration => (
              <button
                key={duration}
                className={`${styles.navPill} ${chunkDuration === duration ? styles.active : ''}`}
                onClick={() => onSetDuration(duration)}
                disabled={isProcessing}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.checkboxLabel}>
            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                checked={true}
                onChange={() => {}}
                disabled={true}
                className={styles.checkbox}
              />
              <div className={styles.checkboxCheckmark}></div>
            </div>
            <span className={styles.checkboxText}>
              <span className={styles.labelIcon}>🎚️</span>
              Enable AGC (Auto Gain Control)
            </span>
          </label>
        </div>
      </div>
    </section>
  )
}