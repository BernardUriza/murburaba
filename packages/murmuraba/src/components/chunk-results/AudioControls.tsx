import React from 'react';
import { SyncedWaveforms } from '../SyncedWaveforms';

interface AudioControlsProps {
  chunkId: string;
  index: number;
  isPlaying: boolean;
  hasProcessedAudio: boolean;
  hasOriginalAudio: boolean;
  isValid: boolean;
  onTogglePlayback: (audioType: 'processed' | 'original') => void;
  onExport: (format: 'wav' | 'mp3', audioType: 'processed' | 'original') => void;
  onDownload: (format: 'webm' | 'wav' | 'mp3', audioType: 'processed' | 'original') => void;
  processedAudioUrl?: string;
  originalAudioUrl?: string;
}

export function AudioControls({
  chunkId,
  index,
  isPlaying,
  hasProcessedAudio,
  hasOriginalAudio,
  isValid,
  onTogglePlayback,
  onExport,
  onDownload,
  processedAudioUrl,
  originalAudioUrl
}: AudioControlsProps) {
  return (
    <div className="details__section">
      <h4 className="section__title">🎵 Audio Controls</h4>
      
      <div className="audio-controls-container">
        {processedAudioUrl && originalAudioUrl && (
          <div className="synced-waveforms-container">
            <SyncedWaveforms
              processedAudioUrl={processedAudioUrl}
              originalAudioUrl={originalAudioUrl}
              isPlaying={isPlaying}
              onPlayingChange={(playing) => onTogglePlayback(playing ? 'processed' : 'original')}
              disabled={!isValid}
              showVolumeControls={true}
              showPlaybackControls={false}
              processedLabel="Processed Audio"
              originalLabel="Original Audio"
            />
          </div>
        )}
        
        <div className="audio-controls-grid">
        <div className="audio-group">
          <h5 className="audio-group__title">Processed Audio</h5>
          <div className="audio-controls__row">
            <button
              className={`btn btn-secondary ${isPlaying ? 'btn--playing' : ''}`}
              onClick={() => onTogglePlayback('processed')}
              disabled={!hasProcessedAudio || !isValid}
              aria-label={`${isPlaying ? 'Pause' : 'Play'} processed audio`}
              type="button"
            >
              <span className="btn__icon" aria-hidden="true">
                {isPlaying ? '⏸️' : '▶️'}
              </span>
              <span>{isPlaying ? 'Pause' : 'Play'} Processed</span>
            </button>

            <button
              className="btn btn-ghost btn--small"
              onClick={() => onExport('wav', 'processed')}
              disabled={!hasProcessedAudio || !isValid}
              aria-label="Export processed audio as WAV"
              type="button"
            >
              📄 WAV
            </button>

            <button
              className="btn btn-ghost btn--small"
              onClick={() => onExport('mp3', 'processed')}
              disabled={!hasProcessedAudio || !isValid}
              aria-label="Export processed audio as MP3"
              type="button"
            >
              🎵 MP3
            </button>

            <button
              className="btn btn-ghost btn--small"
              onClick={() => onDownload('webm', 'processed')}
              disabled={!hasProcessedAudio || !isValid}
              aria-label="Download processed audio"
              type="button"
            >
              💾 Download
            </button>
          </div>
        </div>

          {hasOriginalAudio && (
            <div className="audio-group">
              <h5 className="audio-group__title">Original Audio</h5>
              <div className="audio-controls__row">
                <button
                  className="btn btn-secondary"
                  onClick={() => onTogglePlayback('original')}
                  disabled={!hasOriginalAudio || !isValid}
                  aria-label="Play original audio"
                  type="button"
                >
                  <span className="btn__icon" aria-hidden="true">▶️</span>
                  <span>Play Original</span>
                </button>

                <button
                  className="btn btn-ghost btn--small"
                  onClick={() => onExport('wav', 'original')}
                  disabled={!hasOriginalAudio || !isValid}
                  aria-label="Export original audio as WAV"
                  type="button"
                >
                  📄 Original WAV
                </button>

                <button
                  className="btn btn-ghost btn--small"
                  onClick={() => onExport('mp3', 'original')}
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
  );
}