import React from 'react';
import { ChunkData } from 'murmuraba';

interface AudioProcessorProps {
  chunks: ChunkData[];
  isPlaying: { [key: string]: boolean };
  expandedChunk: string | null;
  onTogglePlayback: (chunkId: string, audioType?: 'processed' | 'original') => Promise<void>;
  onToggleExpansion: (chunkId: string) => void;
  onExportWav: (chunkId: string) => Promise<void>;
  onExportMp3: (chunkId: string) => Promise<void>;
  onDownloadAll: () => Promise<void>;
  ChunkProcessingResults: React.ComponentType<any>;
}

export const AudioProcessor: React.FC<AudioProcessorProps> = ({
  chunks,
  isPlaying,
  expandedChunk,
  onTogglePlayback,
  onToggleExpansion,
  onExportWav,
  onExportMp3,
  onDownloadAll,
  ChunkProcessingResults
}) => {
  if (chunks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎵</div>
        <p>No recordings yet. Start recording to see processed chunks here.</p>
      </div>
    );
  }

  return (
    <div className="audio-processor">
      <div className="processor-header">
        <h3>Processed Audio Chunks ({chunks.length})</h3>
        {chunks.length > 1 && (
          <button
            onClick={onDownloadAll}
            className="download-all-button"
          >
            <span className="download-icon">📦</span>
            Download All as ZIP
          </button>
        )}
      </div>

      <div className="chunks-container">
        {chunks.map((chunk) => (
          <div key={chunk.id} className="chunk-wrapper">
            <div className="chunk-header">
              <div className="chunk-info">
                <span className="chunk-number">Chunk #{chunk.index + 1}</span>
                <span className="chunk-duration">
                  {(chunk.duration / 1000).toFixed(1)}s
                </span>
              </div>

              <div className="chunk-actions">
                <button
                  onClick={() => onTogglePlayback(chunk.id, 'processed')}
                  className="play-button"
                  title={isPlaying[chunk.id] ? 'Pause' : 'Play'}
                >
                  {isPlaying[chunk.id] ? '⏸️' : '▶️'}
                </button>

                <button
                  onClick={() => onToggleExpansion(chunk.id)}
                  className="expand-button"
                  title={expandedChunk === chunk.id ? 'Collapse' : 'Expand'}
                >
                  {expandedChunk === chunk.id ? '🔽' : '▶️'}
                </button>

                <div className="export-buttons">
                  <button
                    onClick={() => onExportWav(chunk.id)}
                    className="export-button"
                    title="Export as WAV"
                  >
                    WAV
                  </button>
                  <button
                    onClick={() => onExportMp3(chunk.id)}
                    className="export-button"
                    title="Export as MP3"
                  >
                    MP3
                  </button>
                </div>
              </div>
            </div>

            {expandedChunk === chunk.id && (
              <div className="chunk-details">
                <ChunkProcessingResults
                  chunk={chunk}
                  isPlaying={isPlaying[chunk.id]}
                  onPlaybackToggle={() => onTogglePlayback(chunk.id, 'processed')}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};