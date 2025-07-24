import React, { useCallback } from 'react';
import { ProcessedChunk } from '../hooks/murmuraba-engine/types';
import { ChunkHeader } from './chunk-results/ChunkHeader';
import { ProcessingMetrics } from './chunk-results/ProcessingMetrics';
import { FileInfo } from './chunk-results/FileInfo';
import { VadTimeline } from './chunk-results/VadTimeline';
import { AudioControls } from './chunk-results/AudioControls';
import { formatTime, formatPercentage, formatFileSize, calculateChunkStats } from './chunk-results/formatters';

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
                onToggleExpansion={() => {
                  console.log('🔧 ChunkProcessingResults: onToggleExpansion called for', chunk.id);
                  console.log('🔧 onToggleExpansion prop exists:', !!onToggleExpansion);
                  onToggleExpansion(chunk.id);
                }}
                onKeyDown={handleKeyDown}
                formatTime={formatTime}
                formatPercentage={formatPercentage}
              />

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

                  {(() => {
                    console.log(`🎯 Chunk ${chunk.id} has vadData:`, !!chunk.vadData, chunk.vadData?.length || 0);
                    return chunk.vadData && <VadTimeline vadData={chunk.vadData} chunkId={chunk.id} />;
                  })()}

                  <AudioControls
                    chunkId={chunk.id}
                    index={index}
                    isPlaying={chunk.isPlaying}
                    hasProcessedAudio={hasProcessedAudio}
                    hasOriginalAudio={hasOriginalAudio}
                    isValid={isValid}
                    onTogglePlayback={(audioType) => handlePlaybackToggle(chunk.id, audioType)}
                    onExport={(format, audioType) => handleExport(chunk.id, format, audioType)}
                    onDownload={(format, audioType) => handleDownload(chunk.id, format, audioType)}
                    processedAudioUrl={chunk.processedAudioUrl}
                    originalAudioUrl={chunk.originalAudioUrl}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}