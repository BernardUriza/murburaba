import { AudioEngine, AudioEngineConfig } from './types';
import { RNNoiseEngine } from './RNNoiseEngine';
import { AudioWorkletEngine } from './AudioWorkletEngine';

export function createAudioEngine(config: AudioEngineConfig): AudioEngine {
  switch (config.engineType) {
    case 'rnnoise':
      return new RNNoiseEngine();
    case 'audioworklet':
      return new AudioWorkletEngine();
    case 'speex':
      throw new Error('Speex engine not implemented yet');
    case 'custom':
      throw new Error('Custom engine not implemented yet');
    default:
      throw new Error(`Unknown engine type: ${config.engineType}`);
  }
}

export type { AudioEngine, AudioEngineConfig } from './types';
export { AudioWorkletEngine } from './AudioWorkletEngine';
