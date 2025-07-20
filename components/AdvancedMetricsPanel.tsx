import { DiagnosticInfo } from 'murmuraba'

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
    <div className="floating-panel">
      <div className="panel-header">
        <h3>🔬 Engine Diagnostics</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="diagnostics-grid">
        <div className="diagnostic-item">
          <span className="diag-label">Version:</span>
          <span className="diag-value">{diagnostics.engineVersion}</span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">WASM Status:</span>
          <span className="diag-value">
            {diagnostics.wasmLoaded ? '✅ Loaded' : '❌ Not Loaded'}
          </span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Active Processors:</span>
          <span className="diag-value">{diagnostics.activeProcessors}</span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Memory Usage:</span>
          <span className="diag-value">
            {(diagnostics.memoryUsage / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Processing Time:</span>
          <span className="diag-value">{diagnostics.processingTime.toFixed(2)}ms</span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Engine State:</span>
          <span className="diag-value state">
            {diagnostics.engineState}
          </span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Browser:</span>
          <span className="diag-value">{diagnostics.browserInfo?.name || 'Unknown'}</span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Audio APIs:</span>
          <span className="diag-value">
            {diagnostics.browserInfo?.audioAPIsSupported ? '✅ Supported' : '❌ Limited'}
          </span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Performance:</span>
          <span className="diag-value">
            {diagnostics.memoryUsage < 50 * 1024 * 1024 ? '🟢 Good' : 
             diagnostics.memoryUsage < 100 * 1024 * 1024 ? '🟡 Moderate' : '🔴 High'}
          </span>
        </div>
        
        <div className="diagnostic-item">
          <span className="diag-label">Uptime:</span>
          <span className="diag-value">
            Active
          </span>
        </div>
      </div>
    </div>
  )
}