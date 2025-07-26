import React, { useState } from 'react'
import styles from './Settings.module.css'

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
      <div className={`${styles.settingsOverlay} ${isOpen ? styles.active : ''}`} onClick={onClose} />
      <div className={`${styles.settingsPanel} ${isOpen ? styles.active : ''}`} data-testid="settings-panel">
        <div className={styles.settingsHeader}>
          <h3>Settings</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">×</button>
        </div>
        
        <div className={styles.settingsContent}>
          <section className={styles.settingsSection}>
            <h4>VAD Thresholds</h4>
            
            <div className={styles.settingItem}>
              <label htmlFor="silenceThreshold">
                Silence Threshold
              </label>
              <div className={styles.sliderContainer}>
                <input
                  id="silenceThreshold"
                  name="silenceThreshold"
                  type="range"
                  className={styles.slider}
                  min="0"
                  max="1"
                  step="0.01"
                  value={localThresholds.silence}
                  onChange={(e) => setLocalThresholds({
                    ...localThresholds,
                    silence: parseFloat(e.target.value)
                  })}
                />
                <span className={styles.sliderValue}>{localThresholds.silence.toFixed(2)}</span>
              </div>
              <span className={styles.settingHint}>Below {localThresholds.silence.toFixed(2)} = silence</span>
            </div>

            <div className={styles.settingItem}>
              <label htmlFor="voiceThreshold">
                Voice Threshold
              </label>
              <div className={styles.sliderContainer}>
                <input
                  id="voiceThreshold"
                  name="voiceThreshold"
                  type="range"
                  className={styles.slider}
                  min="0"
                  max="1"
                  step="0.01"
                  value={localThresholds.voice}
                  onChange={(e) => setLocalThresholds({
                    ...localThresholds,
                    voice: parseFloat(e.target.value)
                  })}
                />
                <span className={styles.sliderValue}>{localThresholds.voice.toFixed(2)}</span>
              </div>
              <span className={styles.settingHint}>{localThresholds.silence.toFixed(2)} - {localThresholds.voice.toFixed(2)} = noise</span>
            </div>

            <div className={styles.settingItem}>
              <label htmlFor="clearVoiceThreshold">
                Clear Voice Threshold
              </label>
              <div className={styles.sliderContainer}>
                <input
                  id="clearVoiceThreshold"
                  name="clearVoiceThreshold"
                  type="range"
                  className={styles.slider}
                  min="0"
                  max="1"
                  step="0.01"
                  value={localThresholds.clearVoice}
                  onChange={(e) => setLocalThresholds({
                    ...localThresholds,
                    clearVoice: parseFloat(e.target.value)
                  })}
                />
                <span className={styles.sliderValue}>{localThresholds.clearVoice.toFixed(2)}</span>
              </div>
              <span className={styles.settingHint}>Above {localThresholds.clearVoice.toFixed(2)} = clear voice</span>
            </div>
          </section>

          <section className={styles.settingsSection}>
            <h4>Display Settings</h4>
            
            <div className={styles.settingItem}>
              <div className={styles.switchContainer}>
                <div 
                  className={`${styles.switch} ${localDisplay.showVadValues ? styles.active : ''}`}
                  onClick={() => setLocalDisplay({
                    ...localDisplay,
                    showVadValues: !localDisplay.showVadValues
                  })}
                >
                  <div className={styles.switchSlider} />
                </div>
                <label htmlFor="showVadValues">Show VAD values</label>
              </div>
            </div>

            <div className={styles.settingItem}>
              <div className={styles.switchContainer}>
                <div 
                  className={`${styles.switch} ${localDisplay.showVadTimeline ? styles.active : ''}`}
                  onClick={() => setLocalDisplay({
                    ...localDisplay,
                    showVadTimeline: !localDisplay.showVadTimeline
                  })}
                >
                  <div className={styles.switchSlider} />
                </div>
                <label htmlFor="showVadTimeline">Show VAD timeline</label>
              </div>
            </div>
          </section>

          <div className={styles.settingsFooter}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>Cancel</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleApply}>Apply</button>
          </div>
        </div>
      </div>
    </>
  )
}