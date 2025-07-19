import { useEffect, useState } from 'react';
import { useAudioEngine } from '../useAudioEngine';

interface AudioEngineToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  onProcessedStream?: (stream: MediaStream | null) => void;
  sourceStream: MediaStream | null;
  isRecording?: boolean;
}

export default function AudioEngineToggle({ 
  enabled, 
  onToggle, 
  disabled = false,
  onProcessedStream,
  sourceStream,
  isRecording = false
}: AudioEngineToggleProps) {
  const { isInitialized, isLoading, processStream, cleanup } = useAudioEngine();
  
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
  }, [enabled, sourceStream, isInitialized]);
  
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
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}