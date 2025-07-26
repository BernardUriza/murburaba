import React from 'react'

interface FabButtonsProps {
  showAudioDemo: boolean
  showAdvancedMetrics: boolean
  showSettings: boolean
  showCopilot: boolean
  isEngineInitialized: boolean
  onAudioDemo: () => void
  onAdvancedMetrics: () => void
  onSettings: () => void
  onCopilot: () => void
}

export function FabButtons({
  showAdvancedMetrics,
  isEngineInitialized,
  onAudioDemo,
  onAdvancedMetrics,
  onSettings,
  onCopilot
}: FabButtonsProps) {
  return (
    <div className="fab-container">
      <button className="fab fab-primary" onClick={onAudioDemo} title="Audio Demo">
        🎵
      </button>
      
      <button
        className="fab"
        onClick={onAdvancedMetrics}
        title={showAdvancedMetrics ? 'Hide Advanced Metrics' : 'Show Advanced Metrics'}
        disabled={!isEngineInitialized}
        style={{ opacity: isEngineInitialized ? 1 : 0.5 }}
      >
        {showAdvancedMetrics ? '📉' : '📈'}
      </button>
      
      <div style={{ height: '0.5rem' }} />
      
      <button className="fab" onClick={onSettings} title="Settings">
        ⚙️
      </button>
      
      <button className="fab fab-copilot" onClick={onCopilot} title="Copilot Chat">
        🤖
      </button>
    </div>
  )
}