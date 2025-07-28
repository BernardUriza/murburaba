import { ProcessingMetrics } from '../types';

export function createDefaultMetrics(overrides: Partial<ProcessingMetrics> = {}): ProcessingMetrics {
  return {
    noiseReductionLevel: 0,
    processingLatency: 0,
    inputLevel: 0,
    outputLevel: 0,
    vadProbability: 0,
    framesProcessed: 0,
    chunksProcessed: 0,
    totalDuration: 0,
    droppedFrames: 0,
    audioQuality: 1,
    timestamp: Date.now(),
    frameCount: 0,
    ...overrides,
  };
}
