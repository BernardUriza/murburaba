export { useAudioEngine } from './hooks/useAudioEngine';
export { createAudioEngine } from './engines';
export { RNNoiseEngine } from './engines/RNNoiseEngine';
export type { AudioEngine, AudioEngineConfig, ProcessingMetrics } from './engines/types';
export { MurmurabaProcessor } from './utils/MurmurabaProcessor';
export { AudioStreamManager } from './utils/AudioStreamManager';
export declare const MURMURABA_VERSION = "0.1.0";
export declare const SUPPORTED_ENGINES: readonly ["rnnoise", "speex", "custom"];
export type SupportedEngine = typeof SUPPORTED_ENGINES[number];
//# sourceMappingURL=index.d.ts.map