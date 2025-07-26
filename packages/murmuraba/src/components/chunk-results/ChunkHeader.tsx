import React from 'react';
import { VadDisplay } from './VadDisplay';
import { AudioPlayButton } from './AudioPlayButton';
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
  hasOriginalAudio: boolean;
  hasProcessedAudio: boolean;
  onToggleOriginalPlayback: () => void;
  onToggleProcessedPlayback: () => void;
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
  hasOriginalAudio,
  hasProcessedAudio,
  onToggleOriginalPlayback,
  onToggleProcessedPlayback,
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
        <AudioPlayButton
          label="Original"
          isPlaying={isPlayingOriginal}
          isEnabled={hasOriginalAudio && isValid}
          onTogglePlayback={onToggleOriginalPlayback}
        />
        
        <AudioPlayButton
          label="Processed"
          isPlaying={isPlayingProcessed}
          isEnabled={hasProcessedAudio && isValid}
          isPrimary={true}
          onTogglePlayback={onToggleProcessedPlayback}
        />
      </div>
    </div>
  );
}