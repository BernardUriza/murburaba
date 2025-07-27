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
  currentlyPlayingType,
}: AudioControlsProps) {
  return (
    <div className={styles.slimContainer}>
      <div className={styles.slimControlsBar}>
        {/* Playback Controls */}
        <div className={styles.slimPlaybackGroup}>
          {hasOriginalAudio && (
            <button
              className={`${styles.slimBtn} ${isPlaying && currentlyPlayingType === 'original' ? styles.slimBtnActive : ''}`}
              onClick={() => onTogglePlayback('original')}
              disabled={!hasOriginalAudio || !isValid}
              aria-label={`${isPlaying && currentlyPlayingType === 'original' ? 'Pause' : 'Play'} original`}
              type="button"
            >
              {isPlaying && currentlyPlayingType === 'original' ? '⏸' : '▶'}
              <span className={styles.slimBtnLabel}>Original</span>
            </button>
          )}

          <button
            className={`${styles.slimBtn} ${styles.slimBtnPrimary} ${isPlaying && currentlyPlayingType === 'processed' ? styles.slimBtnActive : ''}`}
            onClick={() => onTogglePlayback('processed')}
            disabled={!hasProcessedAudio || !isValid}
            aria-label={`${isPlaying && currentlyPlayingType === 'processed' ? 'Pause' : 'Play'} processed`}
            type="button"
          >
            {isPlaying && currentlyPlayingType === 'processed' ? '⏸' : '▶'}
            <span className={styles.slimBtnLabel}>Processed</span>
          </button>
        </div>

        {/* Divider */}
        <div className={styles.slimDivider} />

        {/* Download Controls */}
        <div className={styles.slimDownloadGroup}>
          <span className={styles.slimGroupLabel}>📥</span>

          <div className={styles.slimDownloadOptions}>
            <button
              className={styles.slimDownloadBtn}
              onClick={() => onDownload('wav', 'processed')}
              disabled={!hasProcessedAudio || !isValid}
              aria-label="Download WAV"
              type="button"
            >
              WAV
            </button>

            <button
              className={styles.slimDownloadBtn}
              onClick={() => onDownload('mp3', 'processed')}
              disabled={!hasProcessedAudio || !isValid}
              aria-label="Download MP3"
              type="button"
            >
              MP3
            </button>

            {hasOriginalAudio && (
              <button
                className={`${styles.slimDownloadBtn} ${styles.slimDownloadBtnSecondary}`}
                onClick={() => onDownload('wav', 'original')}
                disabled={!hasOriginalAudio || !isValid}
                aria-label="Download original"
                type="button"
              >
                Original
              </button>
            )}
          </div>
        </div>

        {/* Compact Waveform */}
        {processedAudioUrl && originalAudioUrl && (
          <div className={styles.slimWaveformToggle}>
            <button
              className={styles.slimWaveformBtn}
              onClick={() => {
                const elem = document.getElementById(`waveform-${chunkId}`);
                if (elem) {
                  elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
                }
              }}
              aria-label="Toggle waveform"
              type="button"
            >
              📈
            </button>
          </div>
        )}
      </div>

      {/* Hidden Waveform */}
      {processedAudioUrl && originalAudioUrl && (
        <div
          id={`waveform-${chunkId}`}
          className={styles.slimWaveformContainer}
          style={{ display: 'none' }}
        >
          <SyncedWaveforms
            processedAudioUrl={processedAudioUrl}
            originalAudioUrl={originalAudioUrl}
            isPlaying={isPlaying && currentlyPlayingType !== null}
            disabled={false}
            showVolumeControls={true}
            showPlaybackControls={true}
            processedLabel="Processed"
            originalLabel="Original"
            onPlayingChange={playing => {
              if (playing) {
                onTogglePlayback('processed');
              } else {
                if (currentlyPlayingType) {
                  onTogglePlayback(currentlyPlayingType);
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
