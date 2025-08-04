import React, { useState } from 'react';
import { RecordingState } from 'murmuraba';

interface AudioRecorderProps {
  recordingState: RecordingState;
  isInitialized: boolean;
  isLoading: boolean;
  inputGain: number;
  agcEnabled: boolean;
  onInitialize: () => Promise<void>;
  onReinitialize: () => Promise<void>;
  onStartRecording: (chunkDuration?: number) => Promise<void>;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onClearRecordings: () => void;
  onSetInputGain: (gain: number) => void;
  onSetAgcEnabled: (enabled: boolean) => Promise<void>;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  recordingState,
  isInitialized,
  isLoading,
  inputGain,
  agcEnabled,
  onInitialize,
  onReinitialize,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onClearRecordings,
  onSetInputGain,
  onSetAgcEnabled
}) => {
  const [showGainControl, setShowGainControl] = useState(false);
  const handleRecordClick = async () => {
    if (recordingState.isRecording) {
      onStopRecording();
    } else {
      await onStartRecording();
    }
  };

  const handlePauseClick = () => {
    if (recordingState.isPaused) {
      onResumeRecording();
    } else {
      onPauseRecording();
    }
  };

  return (
    <div className="audio-recorder-container">
      <div className="recorder-controls">
        {!isInitialized ? (
          <button
            onClick={onInitialize}
            disabled={isLoading}
            className="btn btn-primary btn-record"
          >
            {isLoading ? (
              <>
                <span className="btn-icon">⏳</span>
                <span>Initializing...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                <span>Initialize Engine</span>
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={handleRecordClick}
              disabled={!isInitialized || isLoading}
              className={`btn ${recordingState.isRecording ? 'btn-danger' : 'btn-primary'} btn-record`}
            >
              {recordingState.isRecording ? (
                <>
                  <span className="btn-icon">⏹</span>
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">🎙️</span>
                  <span>Start Recording</span>
                </>
              )}
            </button>
            
            {/* Reinitialize button for fresh start (only show when not recording) */}
            {!recordingState.isRecording && (
              <button
                onClick={async () => {
                  // Always keep chunks, just reinitialize engine
                  await onReinitialize();
                }}
                className="btn btn-ghost"
                title="Reinitialize engine for fresh start"
              >
                <span className="btn-icon">🔄</span>
                <span>Reinitialize</span>
              </button>
            )}
          </>
        )}

        {recordingState.isRecording && (
          <button
            onClick={handlePauseClick}
            className="btn btn-secondary"
          >
            {recordingState.isPaused ? (
              <>
                <span className="btn-icon">▶️</span>
                <span>Resume</span>
              </>
            ) : (
              <>
                <span className="btn-icon">⏸️</span>
                <span>Pause</span>
              </>
            )}
          </button>
        )}

        {recordingState.chunks.length > 0 && !recordingState.isRecording && (
          <button
            onClick={onClearRecordings}
            className="btn btn-ghost"
          >
            <span className="btn-icon">🗑️</span>
            <span>Clear Recordings</span>
          </button>
        )}
      </div>

      {recordingState.isRecording && (
        <div className="recording-status-card">
          <div className="recording-indicator">
            <span className="recording-pulse"></span>
            {recordingState.isPaused ? 'Paused' : 'Recording...'}
          </div>
          <div className="recording-timer">
            Duration: {Math.floor(recordingState.recordingTime)}s
          </div>
        </div>
      )}

      {/* Gain Control Section */}
      <div className="gain-control-section" style={{ marginTop: '20px' }}>
        <button
          onClick={() => setShowGainControl(!showGainControl)}
          className="btn btn-secondary"
          style={{ marginBottom: '10px' }}
          aria-expanded={showGainControl}
          aria-controls="gain-control-panel"
          aria-label={`${showGainControl ? 'Hide' : 'Show'} microphone gain controls`}
        >
          <span className="btn-icon" aria-hidden="true">🎚️</span>
          <span>Microphone Gain: {inputGain}x</span>
          <span className="sr-only">{showGainControl ? '(expanded)' : '(collapsed)'}</span>
        </button>

        {showGainControl && (
          <div 
            id="gain-control-panel"
            className="gain-control-panel" 
            role="region"
            aria-labelledby="gain-control-heading"
            style={{
              padding: '15px',
              backgroundColor: 'rgba(82, 163, 47, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(82, 163, 47, 0.3)'
            }}>
            <div style={{ marginBottom: '10px' }}>
              <h3 
                id="gain-control-heading"
                style={{ fontSize: '1rem', marginBottom: '10px', fontWeight: 'bold' }}
              >
                Select Gain Level
              </h3>
            </div>

            {/* AGC Toggle */}
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agcEnabled}
                  onChange={(e) => onSetAgcEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  aria-label="Automatic Gain Control (AGC)"
                />
                <span style={{ fontWeight: '600' }}>
                  Automatic Gain Control (AGC) {agcEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
              <p style={{ 
                marginTop: '8px', 
                marginBottom: 0, 
                fontSize: '12px', 
                color: '#666',
                paddingLeft: '28px'
              }}>
                {agcEnabled 
                  ? '⚠️ AGC normalizes audio levels automatically, which may reduce the effect of manual gain adjustments.'
                  : '✅ Manual gain control is fully active. Adjust the slider to control input volume precisely.'}
              </p>
            </div>

            {/* Gain Level Buttons */}
            <div 
              role="group" 
              aria-label="Gain level buttons"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '10px',
                marginBottom: '15px'
              }}>
              <button
                onClick={() => onSetInputGain(1.0)}
                className={`btn ${inputGain === 1.0 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ 
                  fontSize: '16px', 
                  padding: '12px',
                  fontWeight: inputGain === 1.0 ? 'bold' : 'normal'
                }}
                aria-label="Set gain to 1x (normal)"
                aria-pressed={inputGain === 1.0}
              >
                1x
              </button>
              <button
                onClick={() => onSetInputGain(3.0)}
                className={`btn ${inputGain === 3.0 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ 
                  fontSize: '16px', 
                  padding: '12px',
                  fontWeight: inputGain === 3.0 ? 'bold' : 'normal'
                }}
                aria-label="Set gain to 3x"
                aria-pressed={inputGain === 3.0}
              >
                3x
              </button>
              <button
                onClick={() => onSetInputGain(5.0)}
                className={`btn ${inputGain === 5.0 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ 
                  fontSize: '16px', 
                  padding: '12px',
                  fontWeight: inputGain === 5.0 ? 'bold' : 'normal'
                }}
                aria-label="Set gain to 5x"
                aria-pressed={inputGain === 5.0}
              >
                5x
              </button>
              <button
                onClick={() => onSetInputGain(10.0)}
                className={`btn ${inputGain === 10.0 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ 
                  fontSize: '16px', 
                  padding: '12px',
                  fontWeight: inputGain === 10.0 ? 'bold' : 'normal'
                }}
                aria-label="Set gain to 10x (maximum)"
                aria-pressed={inputGain === 10.0}
              >
                10x
              </button>
            </div>

            {/* Gain Level Indicator */}
            <div 
              role="status" 
              aria-live="polite" 
              aria-atomic="true"
              style={{ 
                marginTop: '10px', 
                fontSize: '14px', 
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: inputGain >= 10.0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: inputGain >= 10.0 ? '#ef4444' : '#666'
              }}
            >
              {inputGain === 1.0 && (
                <><span aria-hidden="true">✅</span> Normal input level (1x)</>  
              )}
              {inputGain === 3.0 && (
                <><span aria-hidden="true">📢</span> Moderate boost (3x)</>  
              )}
              {inputGain === 5.0 && (
                <><span aria-hidden="true">📈</span> High boost (5x)</>  
              )}
              {inputGain === 10.0 && (
                <><span aria-hidden="true">⚠️</span> <strong>Maximum boost (10x)</strong> - watch for audio clipping</>  
              )}
              {![1.0, 3.0, 5.0, 10.0].includes(inputGain) && (
                <><span aria-hidden="true">🎚️</span> Custom gain level: {inputGain}x</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};