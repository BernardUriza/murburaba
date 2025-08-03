/**
 * Refactored Gain Control Component
 * Following Clean Architecture principles with proper separation of concerns
 */

import React, { useState, useCallback, useMemo } from 'react';
import { GainPreset, GainPresetService } from 'murmuraba/src/domain/gain/gain-domain';

export interface GainControlProps {
  currentGain: number;
  dbValue: number;
  description: string;
  isNormal: boolean;
  isBoost: boolean;
  isEnabled: boolean;
  onGainChange: (gain: number) => Promise<void>;
  onPresetApply: (preset: GainPreset) => Promise<void>;
  onToggleEnabled: () => void;
}

export const GainControlPanel: React.FC<GainControlProps> = React.memo(({
  currentGain,
  dbValue,
  description,
  isNormal,
  isBoost,
  isEnabled,
  onGainChange,
  onPresetApply,
  onToggleEnabled
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Memoized preset data to prevent unnecessary recalculations
  const presets = useMemo(() => GainPresetService.getAllPresets(), []);

  const handleGainChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isChanging) return; // Prevent rapid changes
    
    const newGain = parseFloat(event.target.value);
    setIsChanging(true);
    
    try {
      await onGainChange(newGain);
    } catch (error) {
      console.error('Failed to change gain:', error);
    } finally {
      // Add small delay to prevent excessive updates
      setTimeout(() => setIsChanging(false), 100);
    }
  }, [onGainChange, isChanging]);

  const handlePresetClick = useCallback(async (preset: GainPreset) => {
    if (isChanging) return;
    
    setIsChanging(true);
    try {
      await onPresetApply(preset);
    } catch (error) {
      console.error('Failed to apply preset:', error);
    } finally {
      setTimeout(() => setIsChanging(false), 100);
    }
  }, [onPresetApply, isChanging]);

  const gainLevelClass = useMemo(() => {
    if (isBoost) return 'gain-level-boost';
    if (!isNormal) return 'gain-level-adjusted';
    return 'gain-level-normal';
  }, [isNormal, isBoost]);

  return (
    <div className="gain-control-panel">
      {/* Main Control Header */}
      <div className="gain-control-header">
        <button
          onClick={onToggleEnabled}
          className={`btn btn-secondary gain-toggle ${!isEnabled ? 'disabled' : ''}`}
          aria-label="Toggle gain control"
        >
          <span className="btn-icon">🎚️</span>
          <span>Microphone Gain</span>
          {!isEnabled && <span className="status-indicator">OFF</span>}
        </button>
        
        <div className={`gain-status ${gainLevelClass}`}>
          <span className="gain-value">{currentGain.toFixed(1)}x</span>
          <span className="gain-db">({dbValue >= 0 ? '+' : ''}{dbValue.toFixed(1)}dB)</span>
        </div>
      </div>

      {isEnabled && (
        <div className="gain-control-content">
          {/* Primary Controls */}
          <div className="gain-primary-controls">
            <div className="gain-slider-container">
              <label htmlFor="gain-slider" className="gain-slider-label">
                Input Level
              </label>
              <input
                id="gain-slider"
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={currentGain}
                onChange={handleGainChange}
                disabled={isChanging}
                className="gain-slider"
                aria-describedby="gain-description"
              />
              <div id="gain-description" className="gain-description">
                {description}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="gain-presets">
              <span className="presets-label">Quick Settings:</span>
              <div className="preset-buttons">
                {presets.map(({ preset, value, description: presetDesc }) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    disabled={isChanging}
                    className={`btn btn-ghost preset-btn ${
                      Math.abs(currentGain - value.getValue()) < 0.01 ? 'active' : ''
                    }`}
                    title={presetDesc}
                    aria-label={`Set gain to ${preset.toLowerCase()}: ${presetDesc}`}
                  >
                    {preset === GainPreset.LOW && '🔇'}
                    {preset === GainPreset.NORMAL && '🔊'}
                    {preset === GainPreset.HIGH && '📢'}
                    {preset === GainPreset.BOOST && '🚀'}
                    <span className="preset-label">{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Controls Toggle */}
          <div className="gain-advanced-toggle">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn btn-ghost btn-sm"
              aria-expanded={showAdvanced}
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              <span>Advanced Controls</span>
            </button>
          </div>

          {/* Advanced Controls */}
          {showAdvanced && (
            <div className="gain-advanced-controls">
              <div className="gain-fine-tune">
                <label>Fine Tune:</label>
                <div className="fine-tune-buttons">
                  <button
                    onClick={() => onGainChange(Math.max(0.5, currentGain - 0.05))}
                    disabled={isChanging || currentGain <= 0.5}
                    className="btn btn-ghost btn-sm"
                    aria-label="Decrease gain by 0.05"
                  >
                    −0.05
                  </button>
                  <button
                    onClick={() => onGainChange(Math.min(3.0, currentGain + 0.05))}
                    disabled={isChanging || currentGain >= 3.0}
                    className="btn btn-ghost btn-sm"
                    aria-label="Increase gain by 0.05"
                  >
                    +0.05
                  </button>
                </div>
              </div>

              <div className="gain-info-display">
                <div className="info-row">
                  <span>Raw Value:</span>
                  <span>{currentGain.toFixed(3)}</span>
                </div>
                <div className="info-row">
                  <span>Decibels:</span>
                  <span>{dbValue.toFixed(2)}dB</span>
                </div>
                <div className="info-row">
                  <span>Status:</span>
                  <span className={gainLevelClass}>
                    {isBoost ? 'Boosting' : isNormal ? 'Normal' : 'Adjusted'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

GainControlPanel.displayName = 'GainControlPanel';