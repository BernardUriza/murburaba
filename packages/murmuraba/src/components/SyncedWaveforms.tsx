import React, { useState, useCallback, useMemo } from 'react';
import { WaveformAnalyzer } from './WaveformAnalyzer';

interface SyncedWaveformsProps {
  originalAudioUrl?: string;
  processedAudioUrl?: string;
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
  showVolumeControls?: boolean;
  showPlaybackControls?: boolean;
  originalLabel?: string;
  processedLabel?: string;
  originalColor?: string;
  processedColor?: string;
}

export const SyncedWaveforms: React.FC<SyncedWaveformsProps> = ({
  originalAudioUrl,
  processedAudioUrl,
  isPlaying = false,
  onPlayingChange,
  className = '',
  'aria-label': ariaLabel,
  disabled = false,
  showVolumeControls = true,
  showPlaybackControls = true,
  originalLabel = 'Original Audio',
  processedLabel = 'Processed Audio (Noise Reduced)',
  originalColor = '#ef4444',
  processedColor = '#10b981'
}) => {
  const [originalVolume, setOriginalVolume] = useState(0.5);
  const [processedVolume, setProcessedVolume] = useState(0.8);

  const handlePlayingChange = useCallback((playing: boolean) => {
    if (!disabled) {
      onPlayingChange?.(playing);
    }
  }, [disabled, onPlayingChange]);

  const handleOriginalVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(1, parseFloat(e.target.value)));
    setOriginalVolume(value);
  }, []);

  const handleProcessedVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(1, parseFloat(e.target.value)));
    setProcessedVolume(value);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePlayingChange(!isPlaying);
    }
  }, [disabled, isPlaying, handlePlayingChange]);

  // Memoized styles for performance
  const containerStyle = useMemo(() => ({
    opacity: disabled ? 0.6 : 1,
    pointerEvents: disabled ? 'none' as const : 'auto' as const,
  }), [disabled]);

  const volumeControlsStyle = useMemo(() => ({
    display: 'flex',
    gap: '2rem',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
  }), []);

  const volumeControlStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '200px',
  }), []);

  const buttonStyle = useMemo(() => ({
    padding: '8px 24px',
    borderRadius: '24px',
    border: 'none',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: disabled ? '#666' : (isPlaying ? '#dc2626' : '#4f46e5'),
    color: 'white',
    opacity: disabled ? 0.6 : 1,
    ':hover': {
      backgroundColor: disabled ? '#666' : (isPlaying ? '#b91c1c' : '#3730a3'),
    },
  }), [disabled, isPlaying]);

  return (
    <div 
      className={`synced-waveforms ${className}`}
      style={containerStyle}
      role="region"
      aria-label={ariaLabel || 'Synchronized audio waveform comparison'}
    >
      {/* Original waveform */}
      <div className="waveform-section" style={{ marginBottom: '1rem' }}>
        <WaveformAnalyzer
          audioUrl={originalAudioUrl}
          label={originalLabel}
          color={originalColor}
          isActive={true}
          isPaused={!isPlaying}
          hideControls={true}
          isMuted={false}
          volume={originalVolume}
          disabled={disabled}
          aria-label={`${originalLabel} waveform visualization`}
        />
      </div>

      {/* Processed waveform */}
      <div className="waveform-section" style={{ marginBottom: '1rem' }}>
        <WaveformAnalyzer
          audioUrl={processedAudioUrl}
          label={processedLabel}
          color={processedColor}
          isActive={true}
          isPaused={!isPlaying}
          hideControls={true}
          volume={processedVolume}
          disabled={disabled}
          aria-label={`${processedLabel} waveform visualization`}
        />
      </div>

      {/* Volume controls */}
      {showVolumeControls && (
        <div 
          className="volume-controls" 
          style={volumeControlsStyle}
          role="group"
          aria-label="Volume controls"
        >
          <div style={volumeControlStyle}>
            <label 
              htmlFor="original-volume"
              style={{ color: originalColor, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              🔴 Original:
            </label>
            <input
              id="original-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={originalVolume}
              onChange={handleOriginalVolumeChange}
              disabled={disabled}
              style={{ 
                width: '100px',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
              aria-label="Original audio volume"
            />
            <span 
              style={{ 
                minWidth: '40px', 
                textAlign: 'right',
                fontSize: '14px',
                color: '#666'
              }}
              aria-live="polite"
            >
              {Math.round(originalVolume * 100)}%
            </span>
          </div>
          
          <div style={volumeControlStyle}>
            <label 
              htmlFor="processed-volume"
              style={{ color: processedColor, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              🟢 Enhanced:
            </label>
            <input
              id="processed-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={processedVolume}
              onChange={handleProcessedVolumeChange}
              disabled={disabled}
              style={{ 
                width: '100px',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
              aria-label="Enhanced audio volume"
            />
            <span 
              style={{ 
                minWidth: '40px', 
                textAlign: 'right',
                fontSize: '14px',
                color: '#666'
              }}
              aria-live="polite"
            >
              {Math.round(processedVolume * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Playback controls */}
      {showPlaybackControls && (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: '1rem',
            marginBottom: '1rem'
          }}
        >
          <button
            onClick={() => handlePlayingChange(!isPlaying)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            style={buttonStyle}
            aria-label={isPlaying ? 'Pause synchronized playback' : 'Play synchronized playback'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play Both'}
          </button>
        </div>
      )}

      {/* Visual comparison info */}
      <div 
        style={{ 
          fontSize: '12px', 
          color: '#666', 
          textAlign: 'center', 
          marginTop: '1rem',
          lineHeight: '1.4'
        }}
        role="note"
        aria-label="Comparison information"
      >
        <p style={{ margin: '0 0 0.25rem 0' }}>
          🔴 Original audio | 🟢 Noise-reduced audio
        </p>
        <p style={{ margin: 0 }}>
          Watch how the waveforms change to see the noise reduction in action
        </p>
      </div>

      {/* Error states */}
      {!originalAudioUrl && !processedAudioUrl && (
        <div 
          style={{ 
            textAlign: 'center', 
            color: '#999', 
            fontStyle: 'italic',
            padding: '2rem'
          }}
          role="status"
        >
          No audio files provided for comparison
        </div>
      )}
    </div>
  );
};