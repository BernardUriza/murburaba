import { ProcessingMetrics } from '../../types';

export interface IAudioEngine {
  initialize(): Promise<void>;
  process(input: Float32Array, output: Float32Array): void;
  destroy(): void;
  getMetrics(): ProcessingMetrics;
  isInitialized(): boolean;
  supportsFeature(feature: string): boolean;
}
