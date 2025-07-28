/**
 * Audio calculation utilities
 * Pure functions for audio metrics calculations
 */

/**
 * Calculate Root Mean Square (RMS) of audio samples
 */
export function calculateRMS(samples: Float32Array): number {
  if (!samples || samples.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * Calculate peak level of audio samples
 */
export function calculatePeak(samples: Float32Array): number {
  if (!samples || samples.length === 0) return 0;
  
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  return peak;
}

/**
 * Calculate average from numeric array
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate voice activity percentage from VAD history
 */
export function calculateVoiceActivityPercentage(vadHistory: number[], threshold = 0.5): number {
  if (vadHistory.length === 0) return 0;
  const voiceFrames = vadHistory.filter(v => v > threshold).length;
  return (voiceFrames / vadHistory.length) * 100;
}