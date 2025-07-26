import React from 'react';
import { VadDisplay } from './VadDisplay';
import styles from './ChunkHeader.module.css';

interface ChunkHeaderProps {
  index: number;
  duration: number;
  noiseReduction: number;
  processingLatency: number;
  averageVad?: number;
  vadData?: Array<{ time: number; vad: number }>;
  isValid: boolean;
  isPlayingOriginal: boolean;
  isPlayingProcessed: boolean;
  isExpanded: boolean;
  hasOriginalAudio: boolean;
  hasProcessedAudio: boolean;
  onToggleOriginalPlayback: () => void;
  onToggleProcessedPlayback: () => void;
  onToggleExpansion: () => void;
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
  formatTime: (seconds: number) => string;
  formatPercentage: (value: number) => string;
}

export function ChunkHeader({
  index,
  duration,
  noiseReduction,
  processingLatency,
  averageVad,
  vadData,
  isValid,
  isPlayingOriginal,
  isPlayingProcessed,
  isExpanded,
  hasOriginalAudio,
  hasProcessedAudio,
  onToggleOriginalPlayback,
  onToggleProcessedPlayback,
  onToggleExpansion,
  onKeyDown,
  formatTime,
  formatPercentage
}: ChunkHeaderProps) {
  return (
    <div className={styles.chunkHeader}>
      <div className={styles.chunkInfo}>
        <div className={styles.chunkBasicInfo}>
          <h3 className={styles.chunkTitle}>
            Chunk {index + 1}
            {!isValid && (
              <span className={styles.chunkErrorBadge} aria-label="Error">❌</span>
            )}
          </h3>
          
          <div className={styles.chunkMeta}>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>Duration:</span>
              <span className={styles.metaValue}>{formatTime(duration)}</span>
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>Noise Reduced:</span>
              <span className={`${styles.metaValue} ${styles.metaValueHighlight}`}>
                {formatPercentage(noiseReduction)}
              </span>
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>Latency:</span>
              <span className={styles.metaValue}>{processingLatency?.toFixed(1) || '0.0'}ms</span>
            </span>
          </div>
        </div>
        
        {averageVad !== undefined && (
          <div className={styles.chunkVadContainer}>
            <VadDisplay 
              averageVad={averageVad}
              vadData={vadData}
              chunkIndex={index}
              compact={true}
            />
          </div>
        )}
      </div>

      <div className={styles.chunkControls}>
        <button
          className={`${styles.btn} ${styles.btnSecondary} ${isPlayingOriginal ? styles.btnPlaying : ''}`}
          onClick={onToggleOriginalPlayback}
          onKeyDown={(e) => onKeyDown(e, onToggleOriginalPlayback)}
          disabled={!hasOriginalAudio || !isValid}
          aria-label={`${isPlayingOriginal ? 'Pause' : 'Play'} original chunk ${index + 1}`}
          type="button"
        >
          <span className={styles.btnIcon} aria-hidden="true">
            {isPlayingOriginal ? '⏸️' : '▶️'}
          </span>
          <span className={styles.btnText}>
            Original
          </span>
        </button>

        <button
          className={`${styles.btn} ${styles.btnPrimary} ${isPlayingProcessed ? styles.btnPlaying : ''}`}
          onClick={onToggleProcessedPlayback}
          onKeyDown={(e) => onKeyDown(e, onToggleProcessedPlayback)}
          disabled={!hasProcessedAudio || !isValid}
          aria-label={`${isPlayingProcessed ? 'Pause' : 'Play'} processed chunk ${index + 1}`}
          type="button"
        >
          <span className={styles.btnIcon} aria-hidden="true">
            {isPlayingProcessed ? '⏸️' : '▶️'}
          </span>
          <span className={styles.btnText}>
            Processed
          </span>
        </button>

        <button
          className={`${styles.btn} ${styles.btnGhost} ${isExpanded ? styles.btnActive : ''}`}
          onClick={onToggleExpansion}
          onKeyDown={(e) => onKeyDown(e, onToggleExpansion)}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for chunk ${index + 1}`}
          aria-expanded={isExpanded}
          type="button"
        >
          <span className={styles.btnIcon} aria-hidden="true">
            {isExpanded ? '▲' : '▼'}
          </span>
          <span className={styles.btnText}>Details</span>
        </button>
      </div>
    </div>
  );
}