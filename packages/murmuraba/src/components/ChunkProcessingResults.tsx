import React, { useCallback } from 'react';
import { ProcessedChunk } from '../hooks/murmuraba-engine/types';
import { ChunkHeader } from './chunk-results/ChunkHeader';
import { ProcessingMetrics } from './chunk-results/ProcessingMetrics';
import { FileInfo } from './chunk-results/FileInfo';
import { VadTimeline } from './chunk-results/VadTimeline';
import { AudioControls } from './chunk-results/AudioControls';
import { formatTime, formatPercentage, formatFileSize, calculateChunkStats } from './chunk-results/formatters';
import styles from './ChunkProcessingResults.module.css';

export interface ChunkProcessingResultsProps {
  /** Array of processed audio chunks */
  chunks: ProcessedChunk[];
  /** Average noise reduction percentage across all chunks */
  averageNoiseReduction: number;
  /** ID of the currently selected chunk */
  selectedChunk: string | null;
  /** Callback to toggle audio playback for a chunk */
  onTogglePlayback: (chunkId: string, audioType: 'processed' | 'original') => Promise<void>;
  /** Callback to toggle chunk expansion/details view */
  onToggleExpansion: (chunkId: string) => void;
  /** Callback to clear all recordings */
  onClearAll: () => void;
  /** Callback to download chunk */
  onDownloadChunk: (chunkId: string, format: 'webm' | 'wav' | 'mp3', audioType: 'processed' | 'original') => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Professional chunk processing results component that displays processed audio chunks
 * with playback controls, export options, and detailed metrics.
 */
export function ChunkProcessingResults({
  chunks,
  averageNoiseReduction,
  selectedChunk,
  onTogglePlayback,
  onToggleExpansion,
  onClearAll,
  onDownloadChunk,
  className = '',
}: ChunkProcessingResultsProps) {
  
  const chunkStats = calculateChunkStats(chunks);

  // Handle clear all with confirmation
  const handleClearAll = useCallback(() => {
    if (chunks.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete all ${chunks.length} recorded chunks? This action cannot be undone.`
    );
    
    if (confirmed) {
      onClearAll();
    }
  }, [chunks.length, onClearAll]);


  // Handle download with error handling
  const handleDownload = useCallback(async (
    chunkId: string, 
    format: 'webm' | 'wav' | 'mp3',
    audioType: 'processed' | 'original'
  ) => {
    try {
      await onDownloadChunk(chunkId, format, audioType);
    } catch (error) {
      console.error(`Failed to download ${format.toUpperCase()}:`, error);
      // Could add toast notification here
    }
  }, [onDownloadChunk]);

  // Handle playback toggle with error handling
  const handlePlaybackToggle = useCallback(async (chunkId: string, audioType: 'processed' | 'original') => {
    try {
      await onTogglePlayback(chunkId, audioType);
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      // Could add toast notification here
    }
  }, [onTogglePlayback]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }, []);

  // Render empty state
  if (chunks.length === 0) {
    return (
      <section className={`${styles.chunkResults} ${styles.chunkResultsEmpty} ${className}`.trim()}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">🎵</div>
          <h2 className={styles.emptyTitle}>No recordings yet</h2>
          <p className={styles.emptySubtitle}>
            Start recording to see processed chunks here. Each chunk will show detailed metrics
            and allow you to play, compare, and export the audio.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.chunkResults} ${className}`.trim()} role="region" aria-label="Processing Results">
      {/* Header with stats */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h2 className={styles.headerTitle}>🎯 Processing Results</h2>
            <div className={styles.headerStats}>
              <span className={styles.statBadge}>
                <strong>{chunks.length}</strong> chunks
              </span>
              <span className={styles.statBadge}>
                <strong>{formatTime(chunkStats?.totalDuration || 0)}</strong> total
              </span>
              <span className={`${styles.statBadge} ${styles.statBadgeHighlight}`}>
                <strong>{formatPercentage(averageNoiseReduction)}</strong> avg noise reduction
              </span>
            </div>
          </div>
          
          {/* VAD Summary en paralelo */}
          <div className={styles.vadSummary}>
            <div className={styles.vadSummaryTitle}>🎤 Voice Activity</div>
            <div className={styles.vadSummaryValue}>
              <span className={styles.vadBigNumber}>
                {(chunks.reduce((sum, chunk) => sum + (chunk.averageVad || 0), 0) / chunks.length * 100).toFixed(1)}%
              </span>
              <div className={styles.vadBar}>
                <div 
                  className={styles.vadBarFill}
                  style={{ 
                    width: `${(chunks.reduce((sum, chunk) => sum + (chunk.averageVad || 0), 0) / chunks.length * 100)}%`,
                    backgroundColor: chunks.reduce((sum, chunk) => sum + (chunk.averageVad || 0), 0) / chunks.length > 0.7 ? '#10b981' : 
                                     chunks.reduce((sum, chunk) => sum + (chunk.averageVad || 0), 0) / chunks.length > 0.3 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {chunks.length > 0 && (
          <button
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnDestructive}`}
            onClick={handleClearAll}
            onKeyDown={(e) => handleKeyDown(e, handleClearAll)}
            aria-label={`Clear all ${chunks.length} chunks`}
            type="button"
          >
            <span className={styles.btnIcon} aria-hidden="true">🗑️</span>
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Chunks list */}
      <div className={styles.list} role="list">
        {chunks.map((chunk, index) => {
          const isSelected = selectedChunk === chunk.id;
          const hasProcessedAudio = Boolean(chunk.processedAudioUrl);
          const hasOriginalAudio = Boolean(chunk.originalAudioUrl);
          const isValid = chunk.isValid !== false;

          return (
            <div
              key={chunk.id}
              data-chunk-id={chunk.id}
              data-testid={`chunk-${chunk.id}`}
              className={`${styles.chunk} ${isSelected ? styles.chunkSelected : ''} ${!isValid ? styles.chunkInvalid : ''}`.trim()}
              role="listitem"
            >
              <ChunkHeader
                index={index}
                duration={chunk.duration}
                noiseReduction={chunk.metrics.noiseReductionLevel}
                processingLatency={chunk.metrics.processingLatency}
                averageVad={chunk.averageVad}
                vadData={chunk.vadData}
                isValid={isValid}
                isPlaying={chunk.isPlaying}
                isExpanded={chunk.isExpanded}
                hasProcessedAudio={hasProcessedAudio}
                onTogglePlayback={() => handlePlaybackToggle(chunk.id, 'processed')}
                onToggleExpansion={() => onToggleExpansion(chunk.id)}
                onKeyDown={handleKeyDown}
                formatTime={formatTime}
                formatPercentage={formatPercentage}
              />

              {/* Error message for invalid chunks */}
              {!isValid && chunk.errorMessage && (
                <div className={styles.chunkError} role="alert">
                  <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
                  <span className={styles.errorMessage}>{chunk.errorMessage}</span>
                </div>
              )}

              {/* Expanded content - keep mounted but toggle visibility */}
              <div 
                className={styles.chunkDetails} 
                aria-label="Chunk details"
                style={{ display: chunk.isExpanded ? 'block' : 'none' }}
              >
                <ProcessingMetrics
                  inputLevel={chunk.metrics.inputLevel}
                  outputLevel={chunk.metrics.outputLevel}
                  frameCount={chunk.metrics.frameCount}
                  droppedFrames={chunk.metrics.droppedFrames}
                />

                <FileInfo
                  originalSize={chunk.originalSize}
                  processedSize={chunk.processedSize}
                  noiseRemoved={chunk.noiseRemoved}
                />

                {chunk.vadData && chunk.vadData.length > 0 ? (
                  <VadTimeline 
                    key={`vad-${chunk.id}-${chunk.vadData.length}`}
                    vadData={chunk.vadData} 
                    chunkId={chunk.id} 
                  />
                ) : (
                  <div className={styles.detailsSection}>
                    <h4 className={styles.sectionTitle}>📈 Voice Activity Detection (VAD) Timeline</h4>
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#a0a0a0' }}>
                      <span style={{ fontSize: '2rem' }}>⚠️</span>
                      <p>No VAD data available for this chunk</p>
                      {!chunk.isValid && <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Chunk processing failed</p>}
                    </div>
                  </div>
                )}

                <AudioControls
                  chunkId={chunk.id}
                  index={index}
                  isPlaying={chunk.isPlaying}
                  hasProcessedAudio={hasProcessedAudio}
                  hasOriginalAudio={hasOriginalAudio}
                  isValid={isValid}
                  onTogglePlayback={(audioType) => handlePlaybackToggle(chunk.id, audioType)}
                  onDownload={(format, audioType) => handleDownload(chunk.id, format, audioType)}
                  processedAudioUrl={chunk.processedAudioUrl}
                  originalAudioUrl={chunk.originalAudioUrl}
                  currentlyPlayingType={chunk.currentlyPlayingType}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}