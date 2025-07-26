import React from 'react';
import { formatPercentage } from './formatters';
import styles from './ProcessingMetrics.module.css';

interface ProcessingMetricsProps {
  inputLevel: number;
  outputLevel: number;
  frameCount: number;
  droppedFrames: number;
}

export function ProcessingMetrics({ 
  inputLevel, 
  outputLevel, 
  frameCount, 
  droppedFrames 
}: ProcessingMetricsProps) {
  return (
    <div className={styles.detailsSection}>
      <h4 className={styles.sectionTitle}>📊 Processing Metrics</h4>
      <div className={styles.metricsGrid}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Input Level</span>
          <span className={styles.metricValue}>
            {formatPercentage(inputLevel * 100)}
          </span>
          <div className={styles.metricBar}>
            <div 
              className={`${styles.metricFill} ${styles.metricFillInput}`}
              style={{ width: `${inputLevel * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Output Level</span>
          <span className={styles.metricValue}>
            {formatPercentage(outputLevel * 100)}
          </span>
          <div className={styles.metricBar}>
            <div 
              className={`${styles.metricFill} ${styles.metricFillOutput}`}
              style={{ width: `${outputLevel * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Frames Processed</span>
          <span className={styles.metricValue}>
            {frameCount?.toLocaleString() || '0'}
          </span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Dropped Frames</span>
          <span className={`${styles.metricValue} ${styles.metricValueWarning}`}>
            {droppedFrames}
          </span>
        </div>
      </div>
    </div>
  );
}