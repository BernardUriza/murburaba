import React, { useEffect, useRef, useState } from 'react';

interface WaveformAnalyzerProps {
  audioUrl: string;
  label: string;
  color?: string;
}

export const WaveformAnalyzer: React.FC<WaveformAnalyzerProps> = ({ 
  audioUrl, 
  label, 
  color = '#00ff00' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [source, setSource] = useState<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioContext]);

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

  const draw = () => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const drawVisual = () => {
      animationRef.current = requestAnimationFrame(drawVisual);

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgb(20, 20, 20)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
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

      // Draw amplitude meter
      const amplitude = Math.max(...dataArray) - 128;
      const normalizedAmplitude = amplitude / 128;
      
      ctx.fillStyle = color;
      ctx.fillRect(10, 10, normalizedAmplitude * 100, 10);
      
      ctx.strokeStyle = 'white';
      ctx.strokeRect(10, 10, 100, 10);
      
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(`Amplitude: ${(normalizedAmplitude * 100).toFixed(1)}%`, 10, 35);
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

  return (
    <div className="waveform-analyzer">
      <h4>{label}</h4>
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={150} 
        style={{ width: '100%', height: '150px', backgroundColor: '#141414' }}
      />
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
    </div>
  );
};