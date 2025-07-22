import React, { useState } from 'react';
import { WaveformAnalyzer } from './WaveformAnalyzer';

interface SyncedWaveformsProps {
  originalAudioUrl?: string;
  processedAudioUrl?: string;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}

export const SyncedWaveforms: React.FC<SyncedWaveformsProps> = ({
  originalAudioUrl,
  processedAudioUrl,
  isPlaying,
  onPlayingChange
}) => {
  const [originalVolume, setOriginalVolume] = useState(0.5);
  const [processedVolume, setProcessedVolume] = useState(0.8);

  // Note: WaveformAnalyzer creates its own audio elements internally,
  // so we need to pass volume as a prop

  return (
    <div className="synced-waveforms space-y-4">

      {/* Original waveform */}
      <div className="waveform-section">
        <WaveformAnalyzer
          audioUrl={originalAudioUrl}
          label="Original Audio"
          color="#ef4444"
          isActive={true}
          isPaused={!isPlaying}
          hideControls={true}
          isMuted={false}
          volume={originalVolume}
        />
      </div>

      {/* Processed waveform */}
      <div className="waveform-section">
        <WaveformAnalyzer
          audioUrl={processedAudioUrl}
          label="Processed Audio (Noise Reduced)"
          color="#10b981"
          isActive={true}
          isPaused={!isPlaying}
          hideControls={true}
          volume={processedVolume}
        />
      </div>

      {/* Volume controls */}
      <div className="volume-controls" style={{ 
        display: 'flex', 
        gap: '2rem', 
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#ef4444' }}>🔴 Original:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={originalVolume}
            onChange={(e) => setOriginalVolume(parseFloat(e.target.value))}
            style={{ width: '100px' }}
          />
          <span style={{ minWidth: '40px', textAlign: 'right' }}>{Math.round(originalVolume * 100)}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#10b981' }}>🟢 Enhanced:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={processedVolume}
            onChange={(e) => setProcessedVolume(parseFloat(e.target.value))}
            style={{ width: '100px' }}
          />
          <span style={{ minWidth: '40px', textAlign: 'right' }}>{Math.round(processedVolume * 100)}%</span>
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex justify-center space-x-4 mt-4">
        <button
          onClick={() => onPlayingChange(!isPlaying)}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play Both'}
        </button>
      </div>

      {/* Visual comparison info */}
      <div className="text-xs text-gray-500 text-center mt-2">
        <p>🔴 Original audio | 🟢 Noise-reduced audio</p>
        <p>Watch how the waveforms change to see the noise reduction in action</p>
      </div>
    </div>
  );
};