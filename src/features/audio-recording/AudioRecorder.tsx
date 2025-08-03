import React, { useState } from 'react';
import { RecordingState } from 'murmuraba';

interface AudioRecorderProps {
  recordingState: RecordingState;
  isInitialized: boolean;
  isLoading: boolean;
  inputGain: number;
  onStartRecording: (chunkDuration?: number) => Promise<void>;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onClearRecordings: () => void;
  onSetInputGain: (gain: number) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  recordingState,
  isInitialized,
  isLoading,
  inputGain,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onClearRecordings,
  onSetInputGain
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
          <span>Microphone Gain</span>
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
                Audio Input Gain Control
              </h3>
              <label 
                htmlFor="gain-slider"
                style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}
              >
                Input Gain: <span aria-live="polite" aria-atomic="true">{inputGain.toFixed(1)}x</span>
              </label>
              <input
                id="gain-slider"
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={inputGain}
                onChange={(e) => onSetInputGain(parseFloat(e.target.value))}
                onKeyDown={(e) => {
                  // Add keyboard navigation
                  const step = 0.1;
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    onSetInputGain(Math.max(0.5, inputGain - step));
                  } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    onSetInputGain(Math.min(3.0, inputGain + step));
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    onSetInputGain(0.5);
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    onSetInputGain(3.0);
                  }
                }}
                style={{
                  width: '100%',
                  marginBottom: '10px'
                }}
                aria-label="Audio input gain slider. Use arrow keys to adjust."
                aria-valuemin={0.5}
                aria-valuemax={3.0}
                aria-valuenow={inputGain}
                aria-valuetext={`${inputGain.toFixed(1)} times normal volume`}
              />
            </div>

            {/* Gain Presets */}
            <div 
              role="group" 
              aria-label="Gain preset buttons"
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onSetInputGain(0.7)}
                className={`btn btn-ghost ${inputGain === 0.7 ? 'active' : ''}`}
                style={{ fontSize: '14px', minWidth: '80px' }}
                aria-label="Set gain to low (0.7x)"
                aria-pressed={inputGain === 0.7}
              >
                <span aria-hidden="true">🔇</span> Low
              </button>
              <button
                onClick={() => onSetInputGain(1.0)}
                className={`btn btn-ghost ${inputGain === 1.0 ? 'active' : ''}`}
                style={{ fontSize: '14px', minWidth: '80px' }}
                aria-label="Set gain to normal (1.0x)"
                aria-pressed={inputGain === 1.0}
              >
                <span aria-hidden="true">🔊</span> Normal
              </button>
              <button
                onClick={() => onSetInputGain(1.5)}
                className={`btn btn-ghost ${inputGain === 1.5 ? 'active' : ''}`}
                style={{ fontSize: '14px', minWidth: '80px' }}
                aria-label="Set gain to high (1.5x)"
                aria-pressed={inputGain === 1.5}
              >
                <span aria-hidden="true">📢</span> High
              </button>
              <button
                onClick={() => onSetInputGain(2.0)}
                className={`btn btn-ghost ${inputGain === 2.0 ? 'active' : ''}`}
                style={{ fontSize: '14px', minWidth: '80px' }}
                aria-label="Set gain to boost (2.0x)"
                aria-pressed={inputGain === 2.0}
              >
                <span aria-hidden="true">🚀</span> Boost
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
                backgroundColor: inputGain > 2.0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: inputGain > 2.0 ? '#ef4444' : '#666'
              }}
            >
              {inputGain < 1.0 && (
                <><span aria-hidden="true">⬇️</span> Reduced input level</>  
              )}
              {inputGain === 1.0 && (
                <><span aria-hidden="true">✅</span> Normal input level</>  
              )}
              {inputGain > 1.0 && inputGain <= 1.5 && (
                <><span aria-hidden="true">⬆️</span> Increased input level</>  
              )}
              {inputGain > 1.5 && inputGain <= 2.0 && (
                <><span aria-hidden="true">📈</span> High input level</>  
              )}
              {inputGain > 2.0 && (
                <><span aria-hidden="true">⚠️</span> <strong>Warning:</strong> Maximum boost - watch for audio clipping</>  
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};