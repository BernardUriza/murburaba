/**
 * Centralized Audio Calculations
 * Single source of truth for all audio math
 */

export class AudioCalculations {
  /**
   * Calculate Root Mean Square (RMS) - measure of audio power
   * @param samples Float32Array of audio samples (-1 to 1)
   * @returns RMS value between 0 and 1
   */
  static calculateRMS(samples: Float32Array): number {
    if (!samples || samples.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Calculate peak amplitude
   * @param samples Float32Array of audio samples
   * @returns Peak value between 0 and 1
   */
  static calculatePeak(samples: Float32Array): number {
    if (!samples || samples.length === 0) return 0;
    
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    
    return peak;
  }

  /**
   * Convert linear amplitude to decibels
   * @param amplitude Linear amplitude (0 to 1)
   * @returns Decibels (typically -Infinity to 0)
   */
  static amplitudeToDb(amplitude: number): number {
    if (amplitude <= 0) return -Infinity;
    return 20 * Math.log10(amplitude);
  }

  /**
   * Convert decibels to linear amplitude
   * @param db Decibels
   * @returns Linear amplitude (0 to 1)
   */
  static dbToAmplitude(db: number): number {
    return Math.pow(10, db / 20);
  }

  /**
   * Calculate average power over time
   * @param samples Audio samples
   * @returns Average power (0 to 1)
   */
  static calculateAveragePower(samples: Float32Array): number {
    if (!samples || samples.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    
    return sum / samples.length;
  }

  /**
   * Detect if audio is clipping
   * @param samples Audio samples
   * @param threshold Clipping threshold (default 0.99)
   * @returns true if clipping detected
   */
  static isClipping(samples: Float32Array, threshold = 0.99): boolean {
    const peak = this.calculatePeak(samples);
    return peak >= threshold;
  }

  /**
   * Calculate crest factor (peak/rms ratio)
   * Useful for detecting transients
   * @param samples Audio samples
   * @returns Crest factor (typically 1-10)
   */
  static calculateCrestFactor(samples: Float32Array): number {
    const rms = this.calculateRMS(samples);
    if (rms === 0) return 0;
    
    const peak = this.calculatePeak(samples);
    return peak / rms;
  }

  /**
   * Apply exponential smoothing for meter displays
   * @param current Current value
   * @param target Target value
   * @param smoothing Smoothing factor (0-1, higher = smoother)
   * @returns Smoothed value
   */
  static smoothValue(current: number, target: number, smoothing: number): number {
    return current * smoothing + target * (1 - smoothing);
  }

  /**
   * Calculate zero crossing rate (useful for pitch detection)
   * @param samples Audio samples
   * @returns Zero crossings per sample
   */
  static calculateZeroCrossingRate(samples: Float32Array): number {
    if (!samples || samples.length < 2) return 0;
    
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    return crossings / samples.length;
  }

  /**
   * Normalize audio to target level
   * @param samples Audio samples (modified in-place)
   * @param targetLevel Target RMS level (default 0.3)
   */
  static normalize(samples: Float32Array, targetLevel = 0.3): void {
    const currentRMS = this.calculateRMS(samples);
    if (currentRMS === 0) return;
    
    const gain = targetLevel / currentRMS;
    const maxGain = 1 / this.calculatePeak(samples); // Prevent clipping
    const safeGain = Math.min(gain, maxGain);
    
    for (let i = 0; i < samples.length; i++) {
      samples[i] *= safeGain;
    }
  }
}

// Export common audio constants
export const AUDIO_CONSTANTS = {
  MIN_DB: -60,
  MAX_DB: 0,
  SILENCE_THRESHOLD: 0.001,
  CLIP_THRESHOLD: 0.99,
  DEFAULT_SMOOTHING: 0.85,
  DEFAULT_FFT_SIZE: 2048,
  DEFAULT_SAMPLE_RATE: 48000
} as const;