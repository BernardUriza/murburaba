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
      <div className="empty-state-card">
        <div className="empty-icon-large">🎵</div>
        <p className="text-secondary">No recordings yet. Start recording to see processed chunks here.</p>
      </div>
    );
  }

  return (
    <div className="audio-processor-container">
      <div className="processor-header">
        <h3 className="processor-title">📊 Processed Audio Chunks ({chunks.length})</h3>
        {chunks.length > 1 && (
          <button
            onClick={onDownloadAll}
            className="btn btn-primary"
          >
            <span className="btn-icon">📦</span>
            <span>Download All as ZIP</span>
          </button>
        )}
      </div>

      <div className="chunks-grid">
        {chunks.map((chunk) => (
          <div key={chunk.id} className="chunk-card">
            <div className="chunk-header">
              <div className="chunk-info">
                <span className="chunk-badge">Chunk #{chunk.index + 1}</span>
                <span className="chunk-time badge badge-primary">
                  {(chunk.duration / 1000).toFixed(1)}s
                </span>
              </div>

              <div className="chunk-controls">
                <button
                  onClick={() => onTogglePlayback(chunk.id, 'processed')}
                  className="btn btn-icon-only btn-primary"
                  title={isPlaying[chunk.id] ? 'Pause' : 'Play'}
                >
                  {isPlaying[chunk.id] ? '⏸️' : '▶️'}
                </button>

                <button
                  onClick={() => onToggleExpansion(chunk.id)}
                  className="btn btn-icon-only btn-ghost"
                  title={expandedChunk === chunk.id ? 'Collapse' : 'Expand'}
                >
                  {expandedChunk === chunk.id ? '🔽' : '▶️'}
                </button>

                <div className="export-group">
                  <button
                    onClick={() => onExportWav(chunk.id)}
                    className="btn btn-small btn-secondary"
                    title="Export as WAV"
                  >
                    WAV
                  </button>
                  <button
                    onClick={() => onExportMp3(chunk.id)}
                    className="btn btn-small btn-secondary"
                    title="Export as MP3"
                  >
                    MP3
                  </button>
                </div>
              </div>
            </div>

            {expandedChunk === chunk.id && (
              <div className="chunk-expanded-content">
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