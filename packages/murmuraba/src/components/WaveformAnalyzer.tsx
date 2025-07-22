import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface WaveformAnalyzerProps {
  stream?: MediaStream;
  audioUrl?: string;
  label?: string;
  color?: string;
  isActive?: boolean;
  isPaused?: boolean;
  hideControls?: boolean;
  isMuted?: boolean;
  volume?: number;
  className?: string;
  'aria-label'?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
}

export const WaveformAnalyzer: React.FC<WaveformAnalyzerProps> = ({ 
  stream,
  audioUrl, 
  label, 
  color = '#667eea',
  isActive = true,
  isPaused = false,
  hideControls = false,
  isMuted = false,
  volume = 1.0,
  className = '',
  'aria-label': ariaLabel,
  onPlayStateChange,
  width = 800,
  height = 200,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [source, setSource] = useState<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optimized canvas dimensions
  const canvasStyle = useMemo(() => ({
    width: '100%',
    height: stream ? '200px' : '150px',
    borderRadius: '10px',
    backgroundColor: '#141414',
    boxShadow: stream ? '0 4px 20px rgba(102, 126, 234, 0.3)' : 'none'
  }), [stream]);

  // Handle play state changes with callback
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    onPlayStateChange?.(playing);
  }, [onPlayStateChange]);

  useEffect(() => {
    if (stream && isActive && !isPaused && !disabled) {
      initializeLiveStream();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stream, isActive, isPaused, disabled]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Initialize audio URL when hideControls is true and handle external playback
  useEffect(() => {
    if (audioUrl && hideControls && audioRef.current && !disabled) {
      const timer = setTimeout(() => {
        initializeAudio();
        
        if (!isPaused && analyser) {
          draw();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [audioUrl, hideControls, volume, isMuted, disabled]);
  
  // Handle playback state changes
  useEffect(() => {
    if (hideControls && audioRef.current && !disabled) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
      
      if (!isPaused) {
        audioRef.current.play().catch((err) => {
          console.error('Audio play failed:', err);
          setError('Failed to play audio');
        });
        if (analyser) draw();
      } else {
        audioRef.current.pause();
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
    }
  }, [isPaused, analyser, hideControls, isMuted, volume, disabled]);

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(console.error);
    }
    if (audioRef.current) {
      delete audioRef.current.dataset.sourceCreated;
    }
  }, [audioContext]);

  const initializeLiveStream = useCallback(async () => {
    if (!stream || audioContext || disabled) return;

    try {
      const ctx = new AudioContext();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.8;
      analyserNode.minDecibels = -90;
      analyserNode.maxDecibels = -10;

      const sourceNode = ctx.createMediaStreamSource(stream);
      sourceNode.connect(analyserNode);
      
      setAudioContext(ctx);
      setAnalyser(analyserNode);
      setSource(sourceNode);
      setError(null);
      
      drawLiveWaveform(analyserNode);
    } catch (error) {
      console.error('Error initializing live stream:', error);
      setError('Failed to initialize live stream');
    }
  }, [stream, audioContext, disabled]);

  const initializeAudio = useCallback(async () => {
    if (!audioRef.current || disabled) return;
    
    if (audioContext && audioContext.state !== 'closed') {
      return;
    }

    try {
      const ctx = new AudioContext();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.85;

      if (!audioRef.current.dataset.sourceCreated) {
        const sourceNode = ctx.createMediaElementSource(audioRef.current);
        sourceNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);
        
        audioRef.current.dataset.sourceCreated = 'true';
        setSource(sourceNode);
      } else {
        analyserNode.connect(ctx.destination);
      }

      setAudioContext(ctx);
      setAnalyser(analyserNode);
      setError(null);
      
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(1, volume));
        audioRef.current.muted = isMuted;
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
      setError('Failed to initialize audio');
    }
  }, [volume, isMuted, audioContext, disabled]);

  const drawLiveWaveform = useCallback((analyserNode: AnalyserNode) => {
    if (!canvasRef.current || disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformData = new Uint8Array(bufferLength);

    const drawVisual = () => {
      animationRef.current = requestAnimationFrame(drawVisual);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 10, 20, 0.8)');
      gradient.addColorStop(1, 'rgba(20, 20, 40, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isActive && !isPaused) {
        analyserNode.getByteFrequencyData(dataArray);
        analyserNode.getByteTimeDomainData(waveformData);
      } else {
        dataArray.fill(0);
        waveformData.fill(128);
      }

      // Draw frequency bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.5;
        const hue = (i / bufferLength) * 120 + 200;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.3)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      // Draw main waveform
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = waveformData[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw amplitude meter
      let sum = 0;
      for (let i = 0; i < waveformData.length; i++) {
        sum += Math.abs(waveformData[i] - 128);
      }
      const average = sum / waveformData.length;
      const normalizedAmplitude = average / 128;
      
      const ampGradient = ctx.createLinearGradient(10, 0, 110, 0);
      ampGradient.addColorStop(0, '#4facfe');
      ampGradient.addColorStop(1, '#00f2fe');
      ctx.fillStyle = ampGradient;
      ctx.fillRect(10, 10, normalizedAmplitude * 100, 10);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeRect(10, 10, 100, 10);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`Volume: ${(normalizedAmplitude * 100).toFixed(1)}%`, 10, 35);
      
      // Status indicator
      if (stream) {
        if (isActive && !isPaused) {
          ctx.fillStyle = '#4caf50';
          ctx.beginPath();
          ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = '10px monospace';
          ctx.fillText('LIVE', canvas.width - 50, 25);
        } else if (isPaused) {
          ctx.fillStyle = '#ff9800';
          ctx.beginPath();
          ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = '10px monospace';
          ctx.fillText('PAUSED', canvas.width - 60, 25);
        }
      }
    };

    drawVisual();
  }, [isActive, isPaused, color, disabled]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !analyser || disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawVisual = () => {
      animationRef.current = requestAnimationFrame(drawVisual);
      
      if (hideControls && isPaused) {
        dataArray.fill(128);
      } else {
        analyser.getByteTimeDomainData(dataArray);
      }

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 10, 20, 0.8)');
      gradient.addColorStop(1, 'rgba(20, 20, 40, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Amplitude meter
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i] - 128);
      }
      const average = sum / dataArray.length;
      const normalizedAmplitude = average / 128;
      
      const ampGradient = ctx.createLinearGradient(10, 0, 110, 0);
      ampGradient.addColorStop(0, color);
      ampGradient.addColorStop(1, color + '88');
      ctx.fillStyle = ampGradient;
      ctx.fillRect(10, 10, normalizedAmplitude * 100, 10);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeRect(10, 10, 100, 10);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`Level: ${(normalizedAmplitude * 100).toFixed(1)}%`, 10, 35);
    };

    drawVisual();
  }, [analyser, hideControls, isPaused, color, disabled]);

  const handlePlay = useCallback(async () => {
    if (!audioRef.current || disabled) return;

    if (!audioContext) {
      await initializeAudio();
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        handlePlayStateChange(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      } else {
        await audioRef.current.play();
        handlePlayStateChange(true);
        draw();
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError('Playback failed');
    }
  }, [audioContext, isPlaying, initializeAudio, handlePlayStateChange, draw, disabled]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePlay();
    }
  }, [handlePlay, disabled]);

  // Error display
  if (error) {
    return (
      <div className={`waveform-analyzer error ${className}`} role="alert">
        <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

  // Live stream visualization
  if (stream) {
    return (
      <div 
        className={`waveform-analyzer ${className}`}
        role="img"
        aria-label={ariaLabel || `Live audio waveform visualization${label ? ` for ${label}` : ''}`}
      >
        {label && <h4 style={{ color, margin: '0 0 10px 0' }}>{label}</h4>}
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height} 
          style={canvasStyle}
          aria-hidden="true"
        />
        {disabled && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            Disabled
          </div>
        )}
      </div>
    );
  }

  // Audio file visualization
  if (audioUrl) {
    return (
      <div className={`waveform-analyzer ${className}`}>
        {label && <h4 style={{ color, margin: '0 0 10px 0' }}>{label}</h4>}
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={150} 
          style={canvasStyle}
          role="img"
          aria-label={ariaLabel || `Audio waveform for ${label || 'audio file'}`}
        />
        {!hideControls && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
            <button 
              onClick={handlePlay} 
              onKeyDown={handleKeyDown}
              disabled={disabled}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: disabled ? '#666' : '#667eea',
                color: 'white',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1
              }}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
        )}
        <audio 
          ref={audioRef} 
          src={audioUrl}
          onEnded={() => handlePlayStateChange(false)}
          style={{ display: 'none' }}
          preload="metadata"
        />
      </div>
    );
  }

  return null;
};