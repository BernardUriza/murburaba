import React from 'react';
import { RecordingState } from 'murmuraba';

interface AudioRecorderProps {
  recordingState: RecordingState;
  isInitialized: boolean;
  isLoading: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onClearRecordings: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  recordingState,
  isInitialized,
  isLoading,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onClearRecordings
}) => {
  const handleRecordClick = async () => {
    if (recordingState.isRecording) {
      await onStopRecording();
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
            Duration: {Math.floor(recordingState.duration)}s
          </div>
        </div>
      )}
    </div>
  );
};