import { useEffect, useState } from 'react';
import { useRNNoiseSimple } from '../lib/audio/useRNNoiseSimple';
import { useRNNoiseAggressive } from '../lib/audio/useRNNoiseAggressive';
import { useRNNoiseInt16 } from '../lib/audio/useRNNoiseInt16';

interface RNNoiseToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  onProcessedStream?: (stream: MediaStream | null) => void;
  sourceStream: MediaStream | null;
  isRecording?: boolean;
  useAggressive?: boolean;
  onAggressiveToggle?: (aggressive: boolean) => void;
}

export default function RNNoiseToggle({ 
  enabled, 
  onToggle, 
  disabled = false,
  onProcessedStream,
  sourceStream,
  isRecording = false,
  useAggressive = false,
  onAggressiveToggle
}: RNNoiseToggleProps) {
  const simpleRNNoise = useRNNoiseSimple();
  const aggressiveRNNoise = useRNNoiseAggressive();
  const int16RNNoise = useRNNoiseInt16();
  
  // Use the appropriate hook based on mode
  const rnNoise = useAggressive ? aggressiveRNNoise : simpleRNNoise;
  const { isInitialized, isLoading, processStream, cleanup } = rnNoise;
  
  const [error, setError] = useState<string | null>(null);
  const [localProcessedStream, setLocalProcessedStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const setupNoiseReduction = async () => {
      // Clean up previous stream if exists
      if (localProcessedStream && !enabled) {
        localProcessedStream.getTracks().forEach(track => track.stop());
        setLocalProcessedStream(null);
        onProcessedStream?.(null);
        return;
      }
      
      if (enabled && sourceStream && isInitialized) {
        try {
          console.log('Setting up noise reduction...');
          const processedStream = await processStream(sourceStream);
          console.log('Noise reduction stream created:', processedStream);
          setLocalProcessedStream(processedStream);
          onProcessedStream?.(processedStream);
          setError(null);
        } catch (err) {
          console.error('Failed to process stream:', err);
          setError('Failed to enable noise reduction');
          onToggle(false);
          onProcessedStream?.(null);
        }
      }
    };

    setupNoiseReduction();
  }, [enabled, sourceStream, isInitialized, useAggressive]);
  
  // Cleanup when recording stops
  useEffect(() => {
    if (!isRecording && localProcessedStream) {
      localProcessedStream.getTracks().forEach(track => track.stop());
      setLocalProcessedStream(null);
      cleanup();
    }
  }, [isRecording, cleanup]);

  const handleToggle = () => {
    if (!disabled && !isLoading) {
      onToggle(!enabled);
    }
  };

  return (
    <div className="noise-reduction-control">
      <div className="noise-toggle-main">
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={disabled || isLoading}
          />
          <span className="slider"></span>
        </label>
        <span className="control-label">
          Reducción de ruido
          {isLoading && ' (cargando...)'}
          {enabled && isInitialized && ' ✓'}
        </span>
      </div>
      
      {enabled && onAggressiveToggle && (
        <div className="noise-mode-toggle">
          <label className="mode-switch">
            <input
              type="checkbox"
              checked={useAggressive}
              onChange={(e) => onAggressiveToggle(e.target.checked)}
              disabled={disabled || isLoading || isRecording}
            />
            <span className="mode-label">
              Modo agresivo {useAggressive ? '🔥' : '🌊'}
            </span>
          </label>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}