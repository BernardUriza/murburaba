// Main exports
export { useAudioEngine } from './hooks/useAudioEngine';

// Engine exports
export { createAudioEngine } from './engines';
export { RNNoiseEngine } from './engines/RNNoiseEngine';

// Type exports
export type { 
  AudioEngine, 
  AudioEngineConfig, 
  ProcessingMetrics 
} from './engines/types';

// Utils exports
export { MurmurabaProcessor } from './utils/MurmurabaProcessor';
export { AudioStreamManager } from './utils/AudioStreamManager';

// Constants
export const MURMURABA_VERSION = '0.1.0';
export const SUPPORTED_ENGINES = ['rnnoise', 'speex', 'custom'] as const;
export type SupportedEngine = typeof SUPPORTED_ENGINES[number];