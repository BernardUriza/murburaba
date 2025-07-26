import React from 'react';
import styles from './AudioPlayButton.module.css';

export interface AudioPlayButtonProps {
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
 * Compact audio play button component with play/pause functionality
 */
export function AudioPlayButton({
  label,
  isPlaying,
  isEnabled,
  isPrimary = false,
  onTogglePlayback,
  className = ''
}: AudioPlayButtonProps) {
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