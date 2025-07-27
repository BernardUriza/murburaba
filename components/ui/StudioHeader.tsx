import React from 'react'
import styles from './StudioHeader.module.css'

interface StudioHeaderProps {
  isProcessing: boolean
  isInitialized: boolean
}

export function StudioHeader({ isProcessing, isInitialized }: StudioHeaderProps) {
  const getStatus = () => {
    if (isProcessing) return 'processing'
    if (isInitialized) return 'ready'
    return 'uninitialized'
  }

  const getStatusLabel = () => {
    if (isProcessing) return 'Processing'
    if (isInitialized) return 'Ready'
    return 'Initializing'
  }

  const getStatusIcon = () => {
    if (isProcessing) return '🔄'
    if (isInitialized) return '✅'
    return '⏳'
  }

  return (
    <div className={styles.studioHeader}>
      <div className={styles.headerBackground}>
        <div className={styles.bgGradient}></div>
        <div className={styles.bgPattern}></div>
      </div>
      
      <div className={styles.headerContent}>
        <div className={styles.brandSection}>
          <div className={styles.logoWrapper}>
            <div className={styles.logoIcon}>🎵</div>
            <div className={styles.logoGlow}></div>
          </div>
          <div className={styles.brandInfo}>
            <h1 className={styles.brandName}>murmuraba</h1>
            <div className={styles.brandMeta}>
              <span className={styles.version}>v2.0.0</span>
              <span className={styles.separator}>•</span>
              <span className={styles.tagline}>Neural Audio Engine</span>
            </div>
          </div>
        </div>
        
        <div className={styles.statusSection}>
          <div className={`${styles.statusIndicator} ${styles[getStatus()]}`}>
            <span className={styles.statusIcon}>{getStatusIcon()}</span>
            <span className={styles.statusLabel}>{getStatusLabel()}</span>
            <div className={styles.statusPulse}></div>
          </div>
        </div>
      </div>
    </div>
  )
}