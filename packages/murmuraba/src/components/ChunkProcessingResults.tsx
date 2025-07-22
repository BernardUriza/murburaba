import React, { useMemo, useCallback } from 'react';
import { ProcessedChunk } from '../hooks/murmuraba-engine/types';

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
  /** Callback to export chunk as WAV */
  onExportWav: (chunkId: string, audioType: 'processed' | 'original') => Promise<Blob>;
  /** Callback to export chunk as MP3 */
  onExportMp3: (chunkId: string, audioType: 'processed' | 'original') => Promise<Blob>;
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
  onExportWav,
  onExportMp3,
  onDownloadChunk,
  className = '',
}: ChunkProcessingResultsProps) {
  
  // Memoize chunk statistics for performance
  const chunkStats = useMemo(() => {
    if (chunks.length === 0) return null;
    
    const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.duration, 0);
    const validChunks = chunks.filter(chunk => chunk.isValid !== false);
    const averageLatency = validChunks.length > 0 
      ? validChunks.reduce((sum, chunk) => sum + chunk.metrics.processingLatency, 0) / validChunks.length 
      : 0;
    
    return {
      totalChunks: chunks.length,
      validChunks: validChunks.length,
      totalDuration,
      averageLatency,
    };
  }, [chunks]);

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Format percentage helper
  const formatPercentage = useCallback((value: number): string => {
    if (!isFinite(value)) return '0.0%';
    return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
  }, []);

  // Format file size helper
  const formatFileSize = useCallback((bytes: number): string => {
    if (!isFinite(bytes) || bytes <= 0) return '0 KB';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }, []);

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

  // Handle export actions with error handling
  const handleExport = useCallback(async (
    chunkId: string, 
    format: 'wav' | 'mp3', 
    audioType: 'processed' | 'original'
  ) => {
    try {
      if (format === 'wav') {
        await onExportWav(chunkId, audioType);
      } else {
        await onExportMp3(chunkId, audioType);
      }
    } catch (error) {
      console.error(`Failed to export ${format.toUpperCase()}:`, error);
      // Could add toast notification here
    }
  }, [onExportWav, onExportMp3]);

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
      <section className={`chunk-results chunk-results--empty ${className}`.trim()}>
        <div className="chunk-results__empty-state">
          <div className="empty-state__icon" aria-hidden="true">🎵</div>
          <h2 className="empty-state__title">No recordings yet</h2>
          <p className="empty-state__subtitle">
            Start recording to see processed chunks here. Each chunk will show detailed metrics
            and allow you to play, compare, and export the audio.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`chunk-results ${className}`.trim()} role="region" aria-label="Processing Results">
      {/* Header with stats */}
      <div className="chunk-results__header">
        <div className="header__info">
          <h2 className="header__title">🎯 Processing Results</h2>
          <div className="header__stats">
            <span className="stat-badge">
              <strong>{chunks.length}</strong> chunks
            </span>
            <span className="stat-badge">
              <strong>{formatTime(chunkStats?.totalDuration || 0)}</strong> total
            </span>
            <span className="stat-badge stat-badge--highlight">
              <strong>{formatPercentage(averageNoiseReduction)}</strong> avg noise reduction
            </span>
          </div>
        </div>
        
        {chunks.length > 0 && (
          <button
            className="btn btn-ghost btn--destructive"
            onClick={handleClearAll}
            onKeyDown={(e) => handleKeyDown(e, handleClearAll)}
            aria-label={`Clear all ${chunks.length} chunks`}
            type="button"
          >
            <span className="btn__icon" aria-hidden="true">🗑️</span>
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Chunks list */}
      <div className="chunk-results__list" role="list">
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
              className={`chunk ${isSelected ? 'chunk--selected' : ''} ${!isValid ? 'chunk--invalid' : ''}`.trim()}
              role="listitem"
            >
              {/* Chunk header */}
              <div className="chunk__header">
                <div className="chunk__info">
                  <h3 className="chunk__title">
                    Chunk {index + 1}
                    {!isValid && (
                      <span className="chunk__error-badge" aria-label="Error">❌</span>
                    )}
                  </h3>
                  <div className="chunk__meta">
                    <span className="meta-item">
                      <span className="meta-label">Duration:</span>
                      <span className="meta-value">{formatTime(chunk.duration)}</span>
                    </span>
                    <span className="meta-item">
                      <span className="meta-label">Noise Reduced:</span>
                      <span className="meta-value meta-value--highlight">
                        {formatPercentage(chunk.metrics.noiseReductionLevel)}
                      </span>
                    </span>
                    <span className="meta-item">
                      <span className="meta-label">Latency:</span>
                      <span className="meta-value">{chunk.metrics.processingLatency.toFixed(1)}ms</span>
                    </span>
                  </div>
                </div>

                <div className="chunk__controls">
                  {/* Play/Pause button */}
                  <button
                    className={`btn btn-primary ${chunk.isPlaying ? 'btn--playing' : ''}`}
                    onClick={() => handlePlaybackToggle(chunk.id, 'processed')}
                    onKeyDown={(e) => handleKeyDown(e, () => handlePlaybackToggle(chunk.id, 'processed'))}
                    disabled={!hasProcessedAudio || !isValid}
                    aria-label={`${chunk.isPlaying ? 'Pause' : 'Play'} processed chunk ${index + 1}`}
                    type="button"
                  >
                    <span className="btn__icon" aria-hidden="true">
                      {chunk.isPlaying ? '⏸️' : '▶️'}
                    </span>
                    <span className="btn__text">
                      {chunk.isPlaying ? 'Pause' : 'Play'}
                    </span>
                  </button>

                  {/* Expand/Collapse button */}
                  <button
                    className={`btn btn-ghost ${chunk.isExpanded ? 'btn--active' : ''}`}
                    onClick={() => onToggleExpansion(chunk.id)}
                    onKeyDown={(e) => handleKeyDown(e, () => onToggleExpansion(chunk.id))}
                    aria-label={`${chunk.isExpanded ? 'Collapse' : 'Expand'} details for chunk ${index + 1}`}
                    aria-expanded={chunk.isExpanded}
                    type="button"
                  >
                    <span className="btn__icon" aria-hidden="true">
                      {chunk.isExpanded ? '▲' : '▼'}
                    </span>
                    <span className="btn__text">Details</span>
                  </button>
                </div>
              </div>

              {/* Error message for invalid chunks */}
              {!isValid && chunk.errorMessage && (
                <div className="chunk__error" role="alert">
                  <span className="error__icon" aria-hidden="true">⚠️</span>
                  <span className="error__message">{chunk.errorMessage}</span>
                </div>
              )}

              {/* Expanded content */}
              {chunk.isExpanded && (
                <div className="chunk__details" aria-label="Chunk details">
                  {/* Processing metrics */}
                  <div className="details__section">
                    <h4 className="section__title">📊 Processing Metrics</h4>
                    <div className="metrics-grid">
                      <div className="metric-item">
                        <span className="metric__label">Input Level</span>
                        <span className="metric__value">
                          {formatPercentage(chunk.metrics.inputLevel * 100)}
                        </span>
                        <div className="metric__bar">
                          <div 
                            className="metric__fill metric__fill--input"
                            style={{ width: `${chunk.metrics.inputLevel * 100}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <div className="metric-item">
                        <span className="metric__label">Output Level</span>
                        <span className="metric__value">
                          {formatPercentage(chunk.metrics.outputLevel * 100)}
                        </span>
                        <div className="metric__bar">
                          <div 
                            className="metric__fill metric__fill--output"
                            style={{ width: `${chunk.metrics.outputLevel * 100}%` }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <div className="metric-item">
                        <span className="metric__label">Frames Processed</span>
                        <span className="metric__value">
                          {chunk.metrics.frameCount.toLocaleString()}
                        </span>
                      </div>

                      <div className="metric-item">
                        <span className="metric__label">Dropped Frames</span>
                        <span className="metric__value metric__value--warning">
                          {chunk.metrics.droppedFrames}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* File information */}
                  <div className="details__section">
                    <h4 className="section__title">📁 File Information</h4>
                    <div className="file-info-grid">
                      <div className="file-info-item">
                        <span className="info__label">Original Size</span>
                        <span className="info__value">{formatFileSize(chunk.originalSize)}</span>
                      </div>
                      <div className="file-info-item">
                        <span className="info__label">Processed Size</span>
                        <span className="info__value">{formatFileSize(chunk.processedSize)}</span>
                      </div>
                      <div className="file-info-item">
                        <span className="info__label">Size Reduction</span>
                        <span className="info__value info__value--success">
                          {formatFileSize(chunk.noiseRemoved)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Audio controls */}
                  <div className="details__section">
                    <h4 className="section__title">🎵 Audio Controls</h4>
                    <div className="audio-controls">
                      {/* Processed audio controls */}
                      <div className="audio-group">
                        <h5 className="audio-group__title">Processed Audio</h5>
                        <div className="audio-controls__row">
                          <button
                            className={`btn btn-secondary ${chunk.isPlaying ? 'btn--playing' : ''}`}
                            onClick={() => handlePlaybackToggle(chunk.id, 'processed')}
                            disabled={!hasProcessedAudio || !isValid}
                            aria-label={`${chunk.isPlaying ? 'Pause' : 'Play'} processed audio`}
                            type="button"
                          >
                            <span className="btn__icon" aria-hidden="true">
                              {chunk.isPlaying ? '⏸️' : '▶️'}
                            </span>
                            <span>{chunk.isPlaying ? 'Pause' : 'Play'} Processed</span>
                          </button>

                          <button
                            className="btn btn-ghost btn--small"
                            onClick={() => handleExport(chunk.id, 'wav', 'processed')}
                            disabled={!hasProcessedAudio || !isValid}
                            aria-label="Export processed audio as WAV"
                            type="button"
                          >
                            📄 WAV
                          </button>

                          <button
                            className="btn btn-ghost btn--small"
                            onClick={() => handleExport(chunk.id, 'mp3', 'processed')}
                            disabled={!hasProcessedAudio || !isValid}
                            aria-label="Export processed audio as MP3"
                            type="button"
                          >
                            🎵 MP3
                          </button>

                          <button
                            className="btn btn-ghost btn--small"
                            onClick={() => handleDownload(chunk.id, 'webm', 'processed')}
                            disabled={!hasProcessedAudio || !isValid}
                            aria-label="Download processed audio"
                            type="button"
                          >
                            💾 Download
                          </button>
                        </div>
                      </div>

                      {/* Original audio controls */}
                      {hasOriginalAudio && (
                        <div className="audio-group">
                          <h5 className="audio-group__title">Original Audio</h5>
                          <div className="audio-controls__row">
                            <button
                              className="btn btn-secondary"
                              onClick={() => handlePlaybackToggle(chunk.id, 'original')}
                              disabled={!hasOriginalAudio || !isValid}
                              aria-label="Play original audio"
                              type="button"
                            >
                              <span className="btn__icon" aria-hidden="true">▶️</span>
                              <span>Play Original</span>
                            </button>

                            <button
                              className="btn btn-ghost btn--small"
                              onClick={() => handleExport(chunk.id, 'wav', 'original')}
                              disabled={!hasOriginalAudio || !isValid}
                              aria-label="Export original audio as WAV"
                              type="button"
                            >
                              📄 Original WAV
                            </button>

                            <button
                              className="btn btn-ghost btn--small"
                              onClick={() => handleExport(chunk.id, 'mp3', 'original')}
                              disabled={!hasOriginalAudio || !isValid}
                              aria-label="Export original audio as MP3"
                              type="button"
                            >
                              🎵 Original MP3
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}