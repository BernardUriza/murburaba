import React from 'react';
import { SyncedWaveforms } from '../SyncedWaveforms';
import styles from './AudioControls.module.css';

interface AudioControlsProps {
  chunkId: string;
  index: number;
  isPlaying: boolean;
  hasProcessedAudio: boolean;
  hasOriginalAudio: boolean;
  isValid: boolean;
  onTogglePlayback: (audioType: 'processed' | 'original') => void;
  onDownload: (format: 'webm' | 'wav' | 'mp3', audioType: 'processed' | 'original') => void;
  processedAudioUrl?: string;
  originalAudioUrl?: string;
  currentlyPlayingType?: 'processed' | 'original' | null;
}

export function AudioControls({
  chunkId,
  index,
  isPlaying,
  hasProcessedAudio,
  hasOriginalAudio,
  isValid,
  onTogglePlayback,
  onDownload,
  processedAudioUrl,
  originalAudioUrl,
  currentlyPlayingType
}: AudioControlsProps) {
  return (
    <div className={styles.detailsSection}>
      <h4 className={styles.sectionTitle}>🎵 Audio Controls</h4>
      
      <div className={styles.audioControlsContainer}>
        {processedAudioUrl && originalAudioUrl && (
          <div className={styles.syncedWaveformsContainer}>
            <SyncedWaveforms
              processedAudioUrl={processedAudioUrl}
              originalAudioUrl={originalAudioUrl}
              isPlaying={isPlaying && currentlyPlayingType !== null}
              disabled={false}
              showVolumeControls={true}
              showPlaybackControls={true}
              processedLabel="Processed Audio"
              originalLabel="Original Audio"
              onPlayingChange={(playing) => {
                if (playing) {
                  onTogglePlayback('processed');
                } else {
                  // Stop current playback
                  if (currentlyPlayingType) {
                    onTogglePlayback(currentlyPlayingType);
                  }
                }
              }}
            />
          </div>
        )}
        
        <div className={styles.audioControlsGrid}>
          {/* Original Audio First */}
          {hasOriginalAudio && (
            <div className={styles.audioGroup}>
              <h5 className={styles.audioGroupTitle}>Original Audio</h5>
              <div className={styles.audioControlsRow}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${isPlaying && currentlyPlayingType === 'original' ? styles.btnPlaying : ''}`}
                  onClick={() => onTogglePlayback('original')}
                  disabled={!hasOriginalAudio || !isValid}
                  aria-label={`${isPlaying && currentlyPlayingType === 'original' ? 'Pause' : 'Play'} original audio`}
                  type="button"
                >
                  <span className={styles.btnIcon} aria-hidden="true">
                    {isPlaying && currentlyPlayingType === 'original' ? '⏸️' : '▶️'}
                  </span>
                  <span>{isPlaying && currentlyPlayingType === 'original' ? 'Pause' : 'Play'} Original</span>
                </button>

                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                  onClick={() => onDownload('wav', 'original')}
                  disabled={!hasOriginalAudio || !isValid}
                  aria-label="Download original audio as WAV"
                  type="button"
                >
                  📄 Original WAV
                </button>

                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                  onClick={() => onDownload('mp3', 'original')}
                  disabled={!hasOriginalAudio || !isValid}
                  aria-label="Download original audio as MP3"
                  type="button"
                >
                  🎵 Original MP3
                </button>
              </div>
            </div>
          )}

          {/* Processed Audio Second */}
          <div className={styles.audioGroup}>
            <h5 className={styles.audioGroupTitle}>Processed Audio</h5>
            <div className={styles.audioControlsRow}>
              <button
                className={`${styles.btn} ${styles.btnSecondary} ${isPlaying && currentlyPlayingType === 'processed' ? styles.btnPlaying : ''}`}
                onClick={() => onTogglePlayback('processed')}
                disabled={!hasProcessedAudio || !isValid}
                aria-label={`${isPlaying && currentlyPlayingType === 'processed' ? 'Pause' : 'Play'} processed audio`}
                type="button"
              >
                <span className={styles.btnIcon} aria-hidden="true">
                  {isPlaying && currentlyPlayingType === 'processed' ? '⏸️' : '▶️'}
                </span>
                <span>{isPlaying && currentlyPlayingType === 'processed' ? 'Pause' : 'Play'} Processed</span>
              </button>

              <button
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                onClick={() => onDownload('wav', 'processed')}
                disabled={!hasProcessedAudio || !isValid}
                aria-label="Download processed audio as WAV"
                type="button"
              >
                📄 WAV
              </button>

              <button
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                onClick={() => onDownload('mp3', 'processed')}
                disabled={!hasProcessedAudio || !isValid}
                aria-label="Download processed audio as MP3"
                type="button"
              >
                🎵 MP3
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}