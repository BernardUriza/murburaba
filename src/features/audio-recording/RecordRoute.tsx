import React from 'react';
import { useMurmubaraEngine } from 'murmuraba';
import { AudioRecorder } from './AudioRecorder';

const RecordRoute: React.FC = () => {
  const {
    isInitialized,
    isLoading,
    recordingState,
    initialize,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecordings,
    inputGain,
    setInputGain,
    agcEnabled,
    setAgcEnabled
  } = useMurmubaraEngine();

  return (
    <AudioRecorder
      recordingState={recordingState}
      isInitialized={isInitialized}
      isLoading={isLoading}
      inputGain={inputGain}
      agcEnabled={agcEnabled}
      onInitialize={initialize}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onPauseRecording={pauseRecording}
      onResumeRecording={resumeRecording}
      onClearRecordings={clearRecordings}
      onSetInputGain={setInputGain}
      onSetAgcEnabled={setAgcEnabled}
    />
  );
};

export default RecordRoute;