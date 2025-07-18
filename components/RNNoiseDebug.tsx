import React from 'react';

interface RNNoiseDebugProps {
  isInitialized: boolean;
  isLoading: boolean;
  isRecording: boolean;
  noiseSuppressionEnabled: boolean;
  error?: string | null;
}

export const RNNoiseDebug: React.FC<RNNoiseDebugProps> = ({
  isInitialized,
  isLoading,
  isRecording,
  noiseSuppressionEnabled,
  error
}) => {
  return (
    <div className="rnnoise-debug">
      <h3>RNNoise Debug Info</h3>
      <div className="debug-info">
        <div className="debug-item">
          <span className="debug-label">RNNoise Initialized:</span>
          <span className={`debug-value ${isInitialized ? 'success' : 'error'}`}>
            {isInitialized ? '✓ Yes' : '✗ No'}
          </span>
        </div>
        <div className="debug-item">
          <span className="debug-label">Loading:</span>
          <span className={`debug-value ${isLoading ? 'warning' : ''}`}>
            {isLoading ? '⏳ Loading...' : 'Ready'}
          </span>
        </div>
        <div className="debug-item">
          <span className="debug-label">Recording:</span>
          <span className={`debug-value ${isRecording ? 'success' : ''}`}>
            {isRecording ? '● Recording' : '○ Stopped'}
          </span>
        </div>
        <div className="debug-item">
          <span className="debug-label">Noise Suppression:</span>
          <span className={`debug-value ${noiseSuppressionEnabled ? 'success' : 'warning'}`}>
            {noiseSuppressionEnabled ? '✓ Enabled' : '✗ Disabled'}
          </span>
        </div>
      </div>
      {error && (
        <div className="debug-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      <div className="debug-note">
        <p>💡 Tip: Make noise while recording to see the difference!</p>
        <p>Check console for RNNoise VAD probability values.</p>
      </div>
    </div>
  );
};