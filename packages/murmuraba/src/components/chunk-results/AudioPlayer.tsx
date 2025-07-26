import React from 'react';
import styles from './AudioPlayer.module.css';

export interface AudioPlayerProps {
  /** Label for the audio type (e.g., "Original", "Processed") */
  label: string;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether the audio is available/enabled */
  isEnabled: boolean;
  /** Whether this is the primary variant */
  isPrimary?: boolean;
  /** Callback when play/pause is clicked */
  onTogglePlayback: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact audio player component with play/pause functionality
 */
export function AudioPlayer({
  label,
  isPlaying,
  isEnabled,
  isPrimary = false,
  onTogglePlayback,
  className = ''
}: AudioPlayerProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTogglePlayback();
    }
  };

  return (
    <button
      className={`
        ${styles.audioPlayer} 
        ${isPrimary ? styles.primary : styles.secondary}
        ${isPlaying ? styles.playing : ''}
        ${!isEnabled ? styles.disabled : ''}
        ${className}
      `.trim()}
      onClick={onTogglePlayback}
      onKeyDown={handleKeyDown}
      disabled={!isEnabled}
      aria-label={`${isPlaying ? 'Pause' : 'Play'} ${label.toLowerCase()} audio`}
      type="button"
    >
      <span className={styles.icon} aria-hidden="true">
        {isPlaying ? '⏸️' : '▶️'}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}