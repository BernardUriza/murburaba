import React, { useState } from 'react'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  vadThresholds: {
    silence: number
    voice: number
    clearVoice: number
  }
  displaySettings: {
    showVadValues: boolean
    showVadTimeline: boolean
  }
  onThresholdChange: (thresholds: any) => void
  onDisplayChange: (settings: any) => void
}

export function Settings({
  isOpen,
  onClose,
  vadThresholds,
  displaySettings,
  onThresholdChange,
  onDisplayChange
}: SettingsProps) {
  const [localThresholds, setLocalThresholds] = useState(vadThresholds)
  const [localDisplay, setLocalDisplay] = useState(displaySettings)

  const handleApply = () => {
    onThresholdChange(localThresholds)
    onDisplayChange(localDisplay)
  }

  return (
    <>
      <div className={`settings-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`settings-panel ${isOpen ? 'active' : ''}`} data-testid="settings-panel">
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">×</button>
        </div>
        
        <div className="settings-content">
          <section className="settings-section">
            <h4>VAD Thresholds</h4>
            
            <div className="setting-item">
              <label htmlFor="silenceThreshold">
                Silence Threshold
                <span className="setting-value">{localThresholds.silence.toFixed(2)}</span>
              </label>
              <input
                id="silenceThreshold"
                name="silenceThreshold"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localThresholds.silence}
                onChange={(e) => setLocalThresholds({
                  ...localThresholds,
                  silence: parseFloat(e.target.value)
                })}
              />
              <span className="setting-hint">Below {localThresholds.silence.toFixed(2)} = silence</span>
            </div>

            <div className="setting-item">
              <label htmlFor="voiceThreshold">
                Voice Threshold
                <span className="setting-value">{localThresholds.voice.toFixed(2)}</span>
              </label>
              <input
                id="voiceThreshold"
                name="voiceThreshold"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localThresholds.voice}
                onChange={(e) => setLocalThresholds({
                  ...localThresholds,
                  voice: parseFloat(e.target.value)
                })}
              />
              <span className="setting-hint">{localThresholds.silence.toFixed(2)} - {localThresholds.voice.toFixed(2)} = noise</span>
            </div>

            <div className="setting-item">
              <label htmlFor="clearVoiceThreshold">
                Clear Voice Threshold
                <span className="setting-value">{localThresholds.clearVoice.toFixed(2)}</span>
              </label>
              <input
                id="clearVoiceThreshold"
                name="clearVoiceThreshold"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={localThresholds.clearVoice}
                onChange={(e) => setLocalThresholds({
                  ...localThresholds,
                  clearVoice: parseFloat(e.target.value)
                })}
              />
              <span className="setting-hint">Above {localThresholds.clearVoice.toFixed(2)} = clear voice</span>
            </div>
          </section>

          <section className="settings-section">
            <h4>Display Settings</h4>
            
            <div className="setting-item">
              <label htmlFor="showVadValues">
                <input
                  id="showVadValues"
                  type="checkbox"
                  checked={localDisplay.showVadValues}
                  onChange={(e) => setLocalDisplay({
                    ...localDisplay,
                    showVadValues: e.target.checked
                  })}
                />
                Show VAD values
              </label>
            </div>

            <div className="setting-item">
              <label htmlFor="showVadTimeline">
                <input
                  id="showVadTimeline"
                  type="checkbox"
                  checked={localDisplay.showVadTimeline}
                  onChange={(e) => setLocalDisplay({
                    ...localDisplay,
                    showVadTimeline: e.target.checked
                  })}
                />
                Show VAD timeline
              </label>
            </div>
          </section>

          <div className="settings-actions">
            <button className="btn-primary" onClick={handleApply}>Apply</button>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  )
}