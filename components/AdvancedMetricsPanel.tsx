import { DiagnosticInfo } from 'murmuraba'
import styles from './AdvancedMetricsPanel.module.css'

interface AdvancedMetricsPanelProps {
  isVisible: boolean
  diagnostics: DiagnosticInfo | null
  onClose: () => void
}

export function AdvancedMetricsPanel({ isVisible, diagnostics, onClose }: AdvancedMetricsPanelProps) {
  if (!isVisible || !diagnostics) {
    return null
  }

  return (
    <div className={styles.floatingPanel}>
      <div className={styles.panelHeader}>
        <h3>🔬 Engine Diagnostics</h3>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>
      
      <div className={styles.diagnosticsGrid}>
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Version:</span>
          <span className={styles.diagValue}>{diagnostics.engineVersion}</span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>WASM Status:</span>
          <span className={styles.diagValue}>
            {diagnostics.wasmLoaded ? '✅ Loaded' : '❌ Not Loaded'}
          </span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Active Processors:</span>
          <span className={styles.diagValue}>{diagnostics.activeProcessors}</span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Memory Usage:</span>
          <span className={styles.diagValue}>
            {(diagnostics.memoryUsage / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Processing Time:</span>
          <span className={styles.diagValue}>{diagnostics.processingTime.toFixed(2)}ms</span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Engine State:</span>
          <span className={`${styles.diagValue} ${styles.state}`}>
            {diagnostics.engineState}
          </span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Browser:</span>
          <span className={styles.diagValue}>{diagnostics.browserInfo?.name || 'Unknown'}</span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Audio APIs:</span>
          <span className={styles.diagValue}>
            {diagnostics.browserInfo?.audioAPIsSupported ? '✅ Supported' : '❌ Limited'}
          </span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Performance:</span>
          <span className={styles.diagValue}>
            {diagnostics.memoryUsage < 50 * 1024 * 1024 ? '🟢 Good' : 
             diagnostics.memoryUsage < 100 * 1024 * 1024 ? '🟡 Moderate' : '🔴 High'}
          </span>
        </div>
        
        <div className={styles.diagnosticItem}>
          <span className={styles.diagLabel}>Uptime:</span>
          <span className={styles.diagValue}>
            Active
          </span>
        </div>
      </div>
    </div>
  )
}