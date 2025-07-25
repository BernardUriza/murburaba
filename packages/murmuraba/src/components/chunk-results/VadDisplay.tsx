import React from 'react';
import styles from './VadDisplay.module.css';

interface VadDisplayProps {
  averageVad?: number;
  vadData?: Array<{ time: number; vad: number }>;
  chunkIndex: number;
}

export function VadDisplay({ averageVad, vadData, chunkIndex }: VadDisplayProps) {
  if (averageVad === undefined) return null;

  const vadPercentage = averageVad * 100;
  const vadLevel = vadPercentage > 70 ? 'high' : vadPercentage > 30 ? 'medium' : 'low';
  
  const peakVad = vadData ? Math.max(...vadData.map(d => d.vad)) : averageVad;
  const voiceDetectedPercentage = vadData 
    ? (vadData.filter(d => d.vad > 0.5).length / vadData.length) * 100
    : vadPercentage;

  return (
    <div className={styles['vad-display']} data-vad-level={vadLevel}>
      <div className={styles.vadDisplayHeader}>
        <span className={styles.vadDisplayIcon} aria-hidden="true">🎤</span>
        <h4 className={styles.vadDisplayTitle}>Voice Activity Detection</h4>
      </div>
      
      <div className={styles.vadDisplayPrimary}>
        <div className={`${styles.vadDisplayMetric} ${styles.vadDisplayMetricFeatured}`}>
          <span className={styles.vadMetricLabel}>Average VAD</span>
          <span className={`${styles['vad-metric__value']} ${styles['vad-metric__value--large']}`}>
            {averageVad.toFixed(3)}
          </span>
          <div className={styles['vad-metric__bar']}>
            <div 
              className={`${styles['vad-metric__fill']} ${styles[`vad-metric__fill--${vadLevel}`]}`}
              style={{ width: `${vadPercentage}%` }}
              role="progressbar"
              aria-valuenow={vadPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Voice activity ${vadPercentage.toFixed(1)}%`}
            />
          </div>
        </div>
      </div>

      {vadData && vadData.length > 0 && (
        <div className={styles['vad-display__secondary']}>
          <div className={styles.vadDisplayMetric}>
            <span className={styles.vadMetricLabel}>Voice Detected</span>
            <span className={styles['vad-metric__value']}>{voiceDetectedPercentage.toFixed(1)}%</span>
          </div>
          <div className={styles.vadDisplayMetric}>
            <span className={styles.vadMetricLabel}>Peak VAD</span>
            <span className={styles['vad-metric__value']}>{peakVad.toFixed(3)}</span>
          </div>
        </div>
      )}

      <div className={styles['vad-display__status']}>
        <span className={`${styles['vad-status']} ${styles[`vad-status--${vadLevel}`]}`}>
          {vadLevel === 'high' ? '🟢 Strong Voice Activity' : 
           vadLevel === 'medium' ? '🟡 Moderate Voice Activity' : 
           '🔴 Low Voice Activity'}
        </span>
      </div>
    </div>
  );
}