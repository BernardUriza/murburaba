import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// Interfaces para métricas del engine
interface EngineMetrics {
  currentInputLevel: number;
  isProcessing: boolean;
  isRecording: boolean;
}

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
  disablePlayback?: boolean;
  // Nuevas props para métricas del engine
  currentInputLevel?: number;
  isProcessing?: boolean;
  isRecording?: boolean;
  currentVadLevel?: number;
}

export const WaveformAnalyzer: React.FC<WaveformAnalyzerProps> = ({
  stream,
  audioUrl,
  label,
  color = 'var(--grass-glow, #52A32F)',
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
  disabled = false,
  disablePlayback = false,
  // Métricas del engine pasadas como props
  currentInputLevel = 0,
  isProcessing = false,
  isRecording = false,
  currentVadLevel = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [source, setSource] = useState<
    MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Optimized canvas dimensions
  const canvasStyle = useMemo(
    () => ({
      width: '100%',
      height: stream ? '200px' : '150px',
      borderRadius: '10px',
      backgroundColor: 'var(--dark-bg-primary, #0A0B0E)',
      boxShadow: stream ? '0 4px 20px rgba(102, 126, 234, 0.3)' : 'none',
    }),
    [stream]
  );

  // Handle play state changes with callback
  const handlePlayStateChange = useCallback(
    (playing: boolean) => {
      setIsPlaying(playing);
      onPlayStateChange?.(playing);
    },
    [onPlayStateChange]
  );

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    // Disconnect audio source node to release MediaStream reference
    if (source) {
      try {
        source.disconnect();
      } catch (err) {
      }
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }

    // Reset state
    setSource(null);
    setAnalyser(null);
    setAudioContext(null);
  }, [audioContext, source]);

  // Helper function to draw static waveform when no analyser available
  const drawStaticWaveform = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0A0B0E');
      gradient.addColorStop(1, '#13141A');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw a simple static waveform line
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw status text
      ctx.fillStyle = '#CACBDA';
      ctx.font = '12px monospace';
      ctx.fillText('Audio Visualization', 10, 25);
    },
    [color]
  );

  // Usar métricas del engine pasadas como props
  const engineMetrics = {
    currentInputLevel,
    isProcessing,
    isRecording,
    currentVadLevel,
  };

  // Drawing functions
  const drawLiveWaveform = useCallback(() => {
    if (!canvasRef.current || disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simular datos basados en métricas reales del engine
    const bufferLength = 256;
    const inputLevel = engineMetrics.currentInputLevel;

    const drawVisual = () => {
      animationRef.current = requestAnimationFrame(drawVisual);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0A0B0E');
      gradient.addColorStop(1, '#13141A');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Generar datos sintéticos basados en métricas reales
      const dataArray = new Uint8Array(bufferLength);
      const waveformData = new Uint8Array(bufferLength);

      if (isActive && !isPaused && inputLevel > 0) {
        // Simular frequency data basado en inputLevel
        for (let i = 0; i < bufferLength; i++) {
          const frequency = inputLevel * 255 * (Math.random() * 0.3 + 0.7);
          dataArray[i] = Math.min(255, frequency * (1 - i / bufferLength));
        }

        // Simular waveform data
        for (let i = 0; i < bufferLength; i++) {
          const phase = (i / bufferLength) * Math.PI * 4;
          const amplitude = inputLevel * 127 * (Math.sin(phase) + Math.sin(phase * 3) * 0.3);
          waveformData[i] = 128 + amplitude + (Math.random() - 0.5) * 10;
        }
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
        const y = (v * canvas.height) / 2;

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

      // Draw VAD overlay line - más gruesa y resaltada
      if (engineMetrics.currentVadLevel > 0.1) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ff6b35'; // Color naranja brillante para VAD
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff6b35';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();

        const vadSliceWidth = canvas.width / bufferLength;
        let vadX = 0;

        for (let i = 0; i < bufferLength; i++) {
          // Crear forma semi-cuadrada basada en VAD
          const baseY = canvas.height / 2;
          const vadAmplitude = engineMetrics.currentVadLevel * canvas.height * 0.4;

          // Patrón semi-cuadrado: alterna entre valores altos y medios
          const isHigh = i % 8 < 4; // Patrón de 8 muestras
          const vadMultiplier = isHigh ? 1.0 : 0.6;
          const vadY = baseY + Math.sin(i * 0.2) * vadAmplitude * vadMultiplier;

          if (i === 0) {
            ctx.moveTo(vadX, vadY);
          } else {
            ctx.lineTo(vadX, vadY);
          }
          vadX += vadSliceWidth;
        }

        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      // Draw amplitude meter usando métricas reales
      const normalizedAmplitude = inputLevel;

      const ampGradient = ctx.createLinearGradient(10, 0, 110, 0);
      ampGradient.addColorStop(0, '#4A90E2');
      ampGradient.addColorStop(1, '#5B9BD5');
      ctx.fillStyle = ampGradient;
      ctx.fillRect(10, 10, normalizedAmplitude * 100, 10);

      ctx.strokeStyle = '#2E3039';
      ctx.strokeRect(10, 10, 100, 10);

      ctx.fillStyle = '#CACBDA';
      ctx.font = '12px monospace';
      ctx.fillText(`Input Level: ${(inputLevel * 100).toFixed(1)}%`, 10, 35);

      // VAD Level display
      ctx.fillText(`VAD: ${(engineMetrics.currentVadLevel * 100).toFixed(1)}%`, 10, 50);

      // VAD bar
      const vadGradient = ctx.createLinearGradient(120, 0, 220, 0);
      vadGradient.addColorStop(0, '#ff6b35');
      vadGradient.addColorStop(1, '#ff8c42');
      ctx.fillStyle = vadGradient;
      ctx.fillRect(120, 40, engineMetrics.currentVadLevel * 100, 10);

      ctx.strokeStyle = '#2E3039';
      ctx.strokeRect(120, 40, 100, 10);

      // Status indicator usando estado real del engine
      if (stream) {
        if (engineMetrics.isRecording && isActive && !isPaused) {
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#CACBDA';
          ctx.font = '10px monospace';
          ctx.fillText('RECORDING', canvas.width - 70, 25);
        } else if (engineMetrics.isProcessing) {
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#CACBDA';
          ctx.font = '10px monospace';
          ctx.fillText('PROCESSING', canvas.width - 80, 25);
        } else if (isPaused) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#CACBDA';
          ctx.font = '10px monospace';
          ctx.fillText('PAUSED', canvas.width - 60, 25);
        } else {
          ctx.fillStyle = '#6b7280';
          ctx.beginPath();
          ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#CACBDA';
          ctx.font = '10px monospace';
          ctx.fillText('READY', canvas.width - 50, 25);
        }
      }
    };

    drawVisual();
  }, [isActive, isPaused, color, disabled, engineMetrics]);

  const draw = useCallback(() => {
    if (!canvasRef.current || disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If no analyser, draw a static waveform
    if (!analyser) {
      drawStaticWaveform(ctx, canvas);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    const drawVisual = () => {
      if (!analyser || disabled) return;

      animationRef.current = requestAnimationFrame(drawVisual);

      // Get audio data
      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(frequencyData);

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0A0B0E');
      gradient.addColorStop(1, '#13141A');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars (background)
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (frequencyData[i] / 255) * canvas.height * 0.3;
        const hue = (i / bufferLength) * 120 + 200;
        ctx.fillStyle = `hsla(${hue}, 50%, 40%, 0.2)`;
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
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

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

      ctx.strokeStyle = '#2E3039';
      ctx.strokeRect(10, 10, 100, 10);

      ctx.fillStyle = '#CACBDA';
      ctx.font = '12px monospace';
      ctx.fillText(`Level: ${(normalizedAmplitude * 100).toFixed(1)}%`, 10, 35);

      // Status indicator
      if (audioRef.current) {
        const status = audioRef.current.paused ? 'PAUSED' : 'PLAYING';
        const statusColor = audioRef.current.paused ? '#f59e0b' : '#22c55e';

        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#CACBDA';
        ctx.font = '10px monospace';
        ctx.fillText(status, canvas.width - 60, 25);
      }
    };

    drawVisual();
  }, [analyser, hideControls, isPaused, color, disabled]);

  // Initialization functions
  const initializeAudio = useCallback(async () => {
    if (!audioRef.current || disabled) return;

    // If we already have a working context with analyser, reuse it
    if (audioContext && audioContext.state !== 'closed' && analyser && source) {
      return;
    }

    try {
      // Always close existing context before creating new one
      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close();
      }

      const ctx = new AudioContext();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.85;

      let sourceNode: MediaElementAudioSourceNode | null = null;

      try {
        // Try to create a new source. This will throw if element already has one
        sourceNode = ctx.createMediaElementSource(audioRef.current);
        sourceNode.connect(analyserNode);
        analyserNode.connect(ctx.destination);
        setSource(sourceNode);
      } catch (err) {
        // If element already has a source from another context, close context and continue
        if (err instanceof Error && err.message.includes('already connected')) {
          await ctx.close();
          setError(null);
          return;
        } else {
          throw err;
        }
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
      setError(
        `Failed to initialize audio: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [volume, isMuted, audioContext, disabled, analyser, source]);

  // Simplificado: solo verificar stream sin crear AudioContext
  const initializeLiveStream = useCallback(async () => {
    if (!stream || disabled) return;

    // Check if canvas is visible and has valid dimensions
    if (canvasRef.current) {
      const { width, height } = canvasRef.current.getBoundingClientRect();
      if (width === 0 || height === 0) {
        console.warn('WaveformAnalyzer: Canvas has zero dimensions, cannot draw');
        setError('Canvas not visible - cannot render waveform');
        return;
      }
    }

    try {

      // Verificar que el stream tenga audio tracks activos
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        setError('No audio tracks found in stream');
        return;
      }

      const activeTrack = audioTracks.find(t => t.enabled && t.readyState === 'live');
      if (!activeTrack) {
        console.error('WaveformAnalyzer: No active audio tracks found!');
        setError('No active audio tracks found');
        return;
      }


      setError(null);

      // Start drawing using engine metrics
      drawLiveWaveform();
    } catch (error) {
      setError(
        `Failed to verify live stream: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [stream, disabled, drawLiveWaveform]);

  // Effects
  useEffect(() => {
    if (stream && isActive && !isPaused && !disabled) {
      initializeLiveStream();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stream, isActive, isPaused, disabled, initializeLiveStream]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Initialize audio URL when hideControls is true and handle external playback
  useEffect(() => {
    if (audioUrl && hideControls && audioRef.current && !disabled && !audioContext) {
      const timer = setTimeout(() => {
        initializeAudio();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [audioUrl, hideControls, disabled, audioContext, initializeAudio]);

  // Handle playback state changes
  useEffect(() => {
    if (hideControls && audioRef.current && !disabled && !disablePlayback) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = Math.max(0, Math.min(1, volume));

      if (!isPaused) {
        audioRef.current.play().catch(err => {
          console.error('Audio play failed:', err);
          if (err.name === 'NotAllowedError') {
            setError('Audio playback blocked - user interaction required');
          } else {
            setError(`Failed to play audio: ${err.message}`);
          }
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPaused, hideControls, isMuted, volume, disabled, disablePlayback]);

  // Event handlers
  const handlePlay = useCallback(async () => {
    if (!audioRef.current || disabled || disablePlayback) return;

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
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Audio playback blocked - click play to enable');
        } else {
          setError(`Playback failed: ${err.message}`);
        }
      } else {
        setError('Playback failed');
      }
    }
  }, [
    audioContext,
    isPlaying,
    initializeAudio,
    handlePlayStateChange,
    draw,
    disabled,
    disablePlayback,
  ]);

  // Handle drawing when component is ready
  useEffect(() => {
    if (!stream && !disabled && audioUrl && canvasRef.current) {
      // For audio URLs, always try to draw (static or animated)
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [analyser, stream, disabled, audioUrl, draw]);

  // Cleanup effect - called when component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handlePlay();
      }
    },
    [handlePlay, disabled]
  );

  // Error display
  if (error) {
    return (
      <div className={`waveform-analyzer error ${className}`} role="alert">
        <div style={{ color: 'var(--error-main, #ef4444)', textAlign: 'center', padding: '20px' }}>
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
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(10, 11, 14, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
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
                backgroundColor: disabled
                  ? 'var(--dark-surface, #1F2028)'
                  : 'var(--grass-glow, #52A32F)',
                color: 'var(--dark-text-primary, #CACBDA)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
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
          crossOrigin="anonymous"
        />
      </div>
    );
  }

  return null;
};
