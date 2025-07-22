import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  const [currentTime, setCurrentTime] = useState(0);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const processedAudioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>();

  // Create audio elements for synced playback
  useEffect(() => {
    if (originalAudioUrl && processedAudioUrl) {
      // Clean up previous audio elements
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
        originalAudioRef.current.src = '';
        originalAudioRef.current = null;
      }
      if (processedAudioRef.current) {
        processedAudioRef.current.pause();
        processedAudioRef.current.src = '';
        processedAudioRef.current = null;
      }
      
      // Create new audio elements
      originalAudioRef.current = new Audio(originalAudioUrl);
      processedAudioRef.current = new Audio(processedAudioUrl);
      
      // Set up time update handler
      const updateTime = () => {
        // Use processed audio as the time source
        if (processedAudioRef.current) {
          setCurrentTime(processedAudioRef.current.currentTime);
        }
        
        if (isPlaying) {
          animationRef.current = requestAnimationFrame(updateTime);
        }
      };
      
      // Handle ended event on processed audio
      processedAudioRef.current.onended = () => {
        onPlayingChange(false);
      };
    }
    
    return () => {
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
        originalAudioRef.current.src = '';
        originalAudioRef.current = null;
      }
      if (processedAudioRef.current) {
        processedAudioRef.current.pause();
        processedAudioRef.current.src = '';
        processedAudioRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [originalAudioUrl, processedAudioUrl]);
  
  // Handle play/pause separately
  useEffect(() => {
    if (!originalAudioRef.current || !processedAudioRef.current) return;
    
    const updateTime = () => {
      // Use processed audio as the time source
      if (processedAudioRef.current) {
        setCurrentTime(processedAudioRef.current.currentTime);
      }
      
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(updateTime);
      }
    };
    
    if (isPlaying) {
      // ONLY play the processed (enhanced) audio
      // originalAudioRef.current.play().catch(console.error); // DON'T PLAY THIS
      processedAudioRef.current.play().catch(console.error);
      updateTime();
    } else {
      // originalAudioRef.current.pause(); // Not playing, so no need to pause
      processedAudioRef.current.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="synced-waveforms space-y-4">
      {/* Time display */}
      <div className="text-center">
        <span className="text-2xl font-mono text-indigo-400">
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Original waveform */}
      <div className="waveform-section">
        <WaveformAnalyzer
          audioUrl={originalAudioUrl}
          label="Original Audio"
          color="#ef4444"
          isActive={true}
          isPaused={!isPlaying}
          hideControls={true}
          isMuted={true}
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
        />
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