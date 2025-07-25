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
  isPlaying: boolean;
  isExpanded: boolean;
  hasProcessedAudio: boolean;
  onTogglePlayback: () => void;
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
  isPlaying,
  isExpanded,
  hasProcessedAudio,
  onTogglePlayback,
  onToggleExpansion,
  onKeyDown,
  formatTime,
  formatPercentage
}: ChunkHeaderProps) {
  return (
    <div className={styles.chunkHeader}>
      <div className={styles.chunkInfo}>
        <h3 className={styles.chunkTitle}>
          Chunk {index + 1}
          {!isValid && (
            <span className={styles.chunkErrorBadge} aria-label="Error">❌</span>
          )}
        </h3>
        
        {averageVad !== undefined && (
          <VadDisplay 
            averageVad={averageVad}
            vadData={vadData}
            chunkIndex={index}
          />
        )}
        
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
            <span className={styles.metaValue}>{processingLatency.toFixed(1)}ms</span>
          </span>
        </div>
      </div>

      <div className={styles.chunkControls}>
        <button
          className={`${styles.btn} ${styles.btnPrimary} ${isPlaying ? styles.btnPlaying : ''}`}
          onClick={onTogglePlayback}
          onKeyDown={(e) => onKeyDown(e, onTogglePlayback)}
          disabled={!hasProcessedAudio || !isValid}
          aria-label={`${isPlaying ? 'Pause' : 'Play'} processed chunk ${index + 1}`}
          type="button"
        >
          <span className={styles.btnIcon} aria-hidden="true">
            {isPlaying ? '⏸️' : '▶️'}
          </span>
          <span className={styles.btnText}>
            {isPlaying ? 'Pause' : 'Play'}
          </span>
        </button>

        <button
          className={`${styles.btn} ${styles.btnGhost} ${isExpanded ? styles.btnActive : ''}`}
          onClick={(e) => {
            console.log('🔧 Details button clicked');
            console.log('🔧 onToggleExpansion exists:', !!onToggleExpansion);
            e.stopPropagation();
            onToggleExpansion();
          }}
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