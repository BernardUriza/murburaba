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
    clearRecordings,
    inputGain,
    setInputGain
  } = useMurmubaraEngine();

  return (
    <AudioRecorder
      recordingState={recordingState}
      isInitialized={isInitialized}
      isLoading={isLoading}
      inputGain={inputGain}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onPauseRecording={pauseRecording}
      onResumeRecording={resumeRecording}
      onClearRecordings={clearRecordings}
      onSetInputGain={setInputGain}
    />
  );
};

export default RecordRoute;