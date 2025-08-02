import { use, Suspense } from 'react';

interface IAudioConfig {
  bufferSize: number;
  sampleRate: number;
  channels: number;
  noiseReductionLevel: number;
}

// Promise that fetches audio configuration
const audioConfigPromise = fetchAudioConfig();

async function fetchAudioConfig(): Promise<IAudioConfig> {
  // Simulate async config fetching
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    bufferSize: 16384,
    sampleRate: 48000,
    channels: 2,
    noiseReductionLevel: 75
  };
}

// Component using the use() hook with a promise
export function AudioConfigDisplay() {
  // React 19's use() hook can consume promises directly
  const config = use(audioConfigPromise);
  
  return (
    <div className="audio-config">
      <h3>Audio Configuration</h3>
      <dl>
        <dt>Buffer Size:</dt>
        <dd>{config.bufferSize} samples</dd>
        
        <dt>Sample Rate:</dt>
        <dd>{config.sampleRate} Hz</dd>
        
        <dt>Channels:</dt>
        <dd>{config.channels}</dd>
        
        <dt>Noise Reduction:</dt>
        <dd>{config.noiseReductionLevel}%</dd>
      </dl>
    </div>
  );
}

// Parent component that provides Suspense boundary
export default function AudioConfigLoader() {
  return (
    <Suspense fallback={<div className="loading">Loading audio configuration...</div>}>
      <AudioConfigDisplay />
    </Suspense>
  );
}