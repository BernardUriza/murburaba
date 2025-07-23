import { AudioEngine } from './types';

/**
 * Fallback noise reduction engine when WASM is not available
 * Uses simple audio processing techniques
 */
export class FallbackNoiseEngine implements AudioEngine {
  name = 'Fallback Noise Reduction';
  description = 'Simple noise reduction without WASM (degraded performance)';
  isInitialized = false;
  
  private noiseFloor = 0.01;
  private smoothingFactor = 0.95;
  private previousMagnitude = 0;

  async initialize(): Promise<void> {
    console.warn('[FallbackNoiseEngine] Using fallback noise reduction - WASM not available');
    this.isInitialized = true;
  }

  process(inputBuffer: Float32Array): Float32Array {
    if (!this.isInitialized) {
      throw new Error('FallbackNoiseEngine not initialized');
    }

    const output = new Float32Array(inputBuffer.length);
    
    // Simple noise gate with smoothing
    for (let i = 0; i < inputBuffer.length; i++) {
      const sample = inputBuffer[i];
      const magnitude = Math.abs(sample);
      
      // Smooth the magnitude to avoid harsh transitions
      const smoothedMagnitude = this.smoothingFactor * this.previousMagnitude + 
                                (1 - this.smoothingFactor) * magnitude;
      this.previousMagnitude = smoothedMagnitude;
      
      // Apply noise gate
      if (smoothedMagnitude < this.noiseFloor) {
        // Fade out noise
        output[i] = sample * (smoothedMagnitude / this.noiseFloor);
      } else {
        // Pass through signal
        output[i] = sample;
      }
    }
    
    return output;
  }

  cleanup(): void {
    this.previousMagnitude = 0;
    this.isInitialized = false;
  }
}