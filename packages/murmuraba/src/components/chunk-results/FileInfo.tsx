import React from 'react';
import { formatFileSize } from './formatters';
import styles from './FileInfo.module.css';

interface FileInfoProps {
  originalSize: number;
  processedSize: number;
  noiseRemoved: number;
}

export function FileInfo({ originalSize, processedSize, noiseRemoved }: FileInfoProps) {
  return (
    <div className={styles.detailsSection}>
      <h4 className={styles.sectionTitle}>📁 File Information</h4>
      <div className={styles.fileInfoGrid}>
        <div className={styles.fileInfoItem}>
          <span className={styles.infoLabel}>Original Size</span>
          <span className={styles.infoValue}>{formatFileSize(originalSize)}</span>
        </div>
        <div className={styles.fileInfoItem}>
          <span className={styles.infoLabel}>Processed Size</span>
          <span className={styles.infoValue}>{formatFileSize(processedSize)}</span>
        </div>
        <div className={styles.fileInfoItem}>
          <span className={styles.infoLabel}>Size Reduction</span>
          <span className={`${styles.infoValue} ${styles.infoValueSuccess}`}>
            {formatFileSize(noiseRemoved)}
          </span>
        </div>
      </div>
    </div>
  );
}
