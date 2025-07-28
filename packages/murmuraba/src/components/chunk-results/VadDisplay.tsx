import React from 'react';
import styles from './VadDisplay.module.css';

interface VadDisplayProps {
  averageVad?: number;
  vadData?: Array<{ time: number; vad: number }>;
  chunkIndex: number;
  compact?: boolean;
}

export function VadDisplay({ averageVad, vadData, chunkIndex, compact = false }: VadDisplayProps) {
  if (averageVad === undefined) return null;

  const vadPercentage = averageVad * 100;
  const vadLevel = vadPercentage > 70 ? 'high' : vadPercentage > 30 ? 'medium' : 'low';

  const peakVad = vadData ? Math.max(...vadData.map(d => d.vad)) : averageVad;
  const voiceDetectedPercentage = vadData
    ? (vadData.filter(d => d.vad > 0.5).length / vadData.length) * 100
    : vadPercentage;

  // Compact version for header
  if (compact) {
    return (
      <div
        className={`${styles['vad-display']} ${styles.vadDisplayCompact}`}
        data-vad-level={vadLevel}
      >
        <div className={styles.vadCompactContent}>
          <span className={styles.vadCompactLabel}>🎤 VAD</span>
          <span className={`${styles.vadCompactValue} ${styles[`vadCompactValue--${vadLevel}`]}`}>
            {vadPercentage.toFixed(0)}%
          </span>
          <div className={styles.vadCompactBar}>
            <div
              className={`${styles.vadCompactFill} ${styles[`vadCompactFill--${vadLevel}`]}`}
              style={{ width: `${vadPercentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['vad-display']} data-vad-level={vadLevel}>
      <div className={styles.vadDisplayHeader}>
        <span className={styles.vadDisplayIcon} aria-hidden="true">
          🎤
        </span>
        <h4 className={styles.vadDisplayTitle}>Voice Activity Detection</h4>
      </div>

      <div className={styles.vadDisplayPrimary}>
        <div className={`${styles.vadDisplayMetric} ${styles.vadDisplayMetricFeatured}`}>
          <span className={styles.vadMetricLabel}>Average VAD</span>
          <div className={styles.vadBigDisplay}>
            <span
              className={`${styles['vad-metric__value']} ${styles['vad-metric__value--large']}`}
            >
              {vadPercentage.toFixed(1)}%
            </span>
            <span className={styles.vadRawValue}>({averageVad.toFixed(3)})</span>
          </div>
          <div className={styles['vad-metric__bar']}>
            <div
              className={`${styles['vad-metric__fill']} ${styles[`vad-metric__fill--${vadLevel}`]}`}
              style={{
                width: `${vadPercentage}%`,
                background:
                  vadLevel === 'high'
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : vadLevel === 'medium'
                      ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      : 'linear-gradient(90deg, #ef4444, #f87171)',
                boxShadow:
                  vadLevel === 'high'
                    ? '0 0 10px rgba(16, 185, 129, 0.5)'
                    : vadLevel === 'medium'
                      ? '0 0 10px rgba(245, 158, 11, 0.5)'
                      : '0 0 10px rgba(239, 68, 68, 0.5)',
              }}
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
            <span className={styles['vad-metric__value']}>
              {voiceDetectedPercentage.toFixed(1)}%
            </span>
          </div>
          <div className={styles.vadDisplayMetric}>
            <span className={styles.vadMetricLabel}>Peak VAD</span>
            <span className={styles['vad-metric__value']}>{peakVad.toFixed(3)}</span>
          </div>
        </div>
      )}

      <div className={styles['vad-display__status']}>
        <span className={`${styles['vad-status']} ${styles[`vad-status--${vadLevel}`]}`}>
          {vadLevel === 'high'
            ? '✅ Strong Voice Activity'
            : vadLevel === 'medium'
              ? '⚠️ Moderate Voice Activity'
              : '❌ Low Voice Activity'}
        </span>
        {vadData && vadData.length > 0 && (
          <div className={styles.vadSparkline}>
            {vadData.slice(-20).map((point, i) => (
              <div
                key={i}
                className={styles.vadSparklineBar}
                style={{
                  height: `${point.vad * 100}%`,
                  backgroundColor:
                    point.vad > 0.7 ? '#10b981' : point.vad > 0.3 ? '#f59e0b' : '#ef4444',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
