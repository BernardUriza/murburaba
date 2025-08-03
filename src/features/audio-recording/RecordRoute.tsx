import React from 'react';
import { useMurmubaraEngine } from 'murmuraba';
import { AudioRecorder } from './AudioRecorder';

const RecordRoute: React.FC = () => {
  const {
    isInitialized,
    isLoading,
    recordingState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecordings
  } = useMurmubaraEngine();

  return (
    <AudioRecorder
      recordingState={recordingState}
      isInitialized={isInitialized}
      isLoading={isLoading}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onPauseRecording={pauseRecording}
      onResumeRecording={resumeRecording}
      onClearRecordings={clearRecordings}
    />
  );
};

export default RecordRoute;