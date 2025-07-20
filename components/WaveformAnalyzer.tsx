import React, { useEffect, useRef, useState } from 'react';

interface WaveformAnalyzerProps {
  stream?: MediaStream;
  audioUrl?: string;
  label?: string;
  color?: string;
  isActive?: boolean;
  isPaused?: boolean;
  hideControls?: boolean;
}

export const WaveformAnalyzer: React.FC<WaveformAnalyzerProps> = ({ 
  stream,
  audioUrl, 
  label, 
  color = '#667eea',
  isActive = true,
  isPaused = false,
  hideControls = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [source, setSource] = useState<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (stream && isActive && !isPaused) {
      initializeLiveStream();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stream, isActive, isPaused]);

  useEffect(() => {
    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  // Initialize audio URL when hideControls is true and handle external playback
  useEffect(() => {
    if (audioUrl && hideControls && audioRef.current) {
      initializeAudio();
      
      // Handle external playback control
      if (!isPaused && analyser) {
        draw();
      }
    }
  }, [audioUrl, hideControls, isPaused]);

  const initializeLiveStream = async () => {
    if (!stream || audioContext) return;

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
      
      // Start drawing immediately for live stream
      drawLiveWaveform(analyserNode);
    } catch (error) {
      console.error('Error initializing live stream:', error);
    }
  };

  const initializeAudio = async () => {
    if (!audioRef.current || audioContext) return;

    const ctx = new AudioContext();
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.85;

    const sourceNode = ctx.createMediaElementSource(audioRef.current);
    sourceNode.connect(analyserNode);
    analyserNode.connect(ctx.destination);

    setAudioContext(ctx);
    setAnalyser(analyserNode);
    setSource(sourceNode);
  };

  const drawLiveWaveform = (analyserNode: AnalyserNode) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformData = new Uint8Array(bufferLength);

    const drawVisual = () => {
      if (!isActive || isPaused) {
        animationRef.current = requestAnimationFrame(() => drawVisual());
        return;
      }

      animationRef.current = requestAnimationFrame(drawVisual);

      // Get frequency data for visualization effects
      analyserNode.getByteFrequencyData(dataArray);
      analyserNode.getByteTimeDomainData(waveformData);

      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 10, 20, 0.8)');
      gradient.addColorStop(1, 'rgba(20, 20, 40, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars in background
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.5;
        
        const hue = (i / bufferLength) * 120 + 200; // Purple to blue gradient
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
      
      // Amplitude bar with gradient
      const ampGradient = ctx.createLinearGradient(10, 0, 110, 0);
      ampGradient.addColorStop(0, '#4facfe');
      ampGradient.addColorStop(1, '#00f2fe');
      ctx.fillStyle = ampGradient;
      ctx.fillRect(10, 10, normalizedAmplitude * 100, 10);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeRect(10, 10, 100, 10);
      
      // Volume level indicator
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`Volume: ${(normalizedAmplitude * 100).toFixed(1)}%`, 10, 35);
      
      // Add real-time indicator
      if (stream) {
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(canvas.width - 20, 20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText('LIVE', canvas.width - 50, 25);
      }
    };

    drawVisual();
  };

  const draw = () => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawVisual = () => {
      animationRef.current = requestAnimationFrame(drawVisual);

      if (hideControls && isPaused) {
        // Stop animation when paused in external control mode
        return;
      }
      
      analyser.getByteTimeDomainData(dataArray);

      // Clear canvas with gradient background
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

      // Draw amplitude meter
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i] - 128);
      }
      const average = sum / dataArray.length;
      const normalizedAmplitude = average / 128;
      
      // Amplitude bar with gradient
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
  };

  const handlePlay = async () => {
    if (!audioRef.current) return;

    if (!audioContext) {
      await initializeAudio();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      draw();
    }
  };

  // For live stream visualization
  if (stream) {
    return (
      <div className="waveform-analyzer">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={200} 
          style={{ 
            width: '100%', 
            height: '200px', 
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
          }}
        />
      </div>
    );
  }

  // For audio file visualization
  if (audioUrl) {
    return (
      <div className="waveform-analyzer">
        {label && <h4 style={{ color: color }}>{label}</h4>}
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={150} 
          style={{ width: '100%', height: '150px', backgroundColor: '#141414' }}
        />
        {!hideControls && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
            <button onClick={handlePlay} className="btn btn-primary">
              {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
            </button>
            <audio 
              ref={audioRef} 
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />
          </div>
        )}
        {hideControls && (
          <audio 
            ref={audioRef} 
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
      </div>
    );
  }

  return null;
};