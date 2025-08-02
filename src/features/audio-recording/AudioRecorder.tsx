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
    <div className="recording-controls">
      <div className="control-group">
        <button
          onClick={handleRecordClick}
          disabled={!isInitialized || isLoading}
          className={`record-button ${recordingState.isRecording ? 'recording' : ''}`}
        >
          {recordingState.isRecording ? (
            <>
              <span className="record-icon">⏹</span>
              Stop Recording
            </>
          ) : (
            <>
              <span className="record-icon">🎙️</span>
              Start Recording
            </>
          )}
        </button>

        {recordingState.isRecording && (
          <button
            onClick={handlePauseClick}
            className="pause-button"
          >
            {recordingState.isPaused ? (
              <>
                <span className="pause-icon">▶️</span>
                Resume
              </>
            ) : (
              <>
                <span className="pause-icon">⏸️</span>
                Pause
              </>
            )}
          </button>
        )}

        {recordingState.chunks.length > 0 && !recordingState.isRecording && (
          <button
            onClick={onClearRecordings}
            className="clear-button"
          >
            <span className="clear-icon">🗑️</span>
            Clear Recordings
          </button>
        )}
      </div>

      {recordingState.isRecording && (
        <div className="recording-status">
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            {recordingState.isPaused ? 'Paused' : 'Recording...'}
          </div>
          <div className="recording-time">
            Duration: {Math.floor(recordingState.duration)}s
          </div>
        </div>
      )}
    </div>
  );
};