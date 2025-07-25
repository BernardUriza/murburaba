import { describe, it, expect, beforeEach } from 'vitest';
import { AudioResampler } from '../../../utils/AudioResampler';

describe('AudioResampler', () => {
  let resampler: AudioResampler;
  
  describe('Constructor', () => {
    it('should create resampler with valid parameters', () => {
      resampler = new AudioResampler(44100, 48000);
      expect(resampler).toBeDefined();
    });
    
    it('should throw error for invalid source rate', () => {
      expect(() => new AudioResampler(0, 48000)).toThrow('Invalid sample rates');
      expect(() => new AudioResampler(-1, 48000)).toThrow('Invalid sample rates');
    });
    
    it('should throw error for invalid target rate', () => {
      expect(() => new AudioResampler(44100, 0)).toThrow('Invalid sample rates');
      expect(() => new AudioResampler(44100, -1)).toThrow('Invalid sample rates');
    });
  });
  
  describe('Upsampling', () => {
    beforeEach(() => {
      resampler = new AudioResampler(44100, 48000);
    });
    
    it('should upsample audio data correctly', () => {
      const input = new Float32Array([0, 0.5, 1, 0.5, 0]);
      const output = resampler.resample(input);
      
      // Output should be longer for upsampling
      expect(output.length).toBeGreaterThan(input.length);
      expect(output.length).toBe(Math.floor(input.length * 48000 / 44100));
    });
    
    it('should preserve signal characteristics when upsampling', () => {
      const input = new Float32Array(100);
      // Create a simple sine wave
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 20);
      }
      
      const output = resampler.resample(input);
      
      // Check that output is not all zeros
      const hasNonZero = output.some(v => v !== 0);
      expect(hasNonZero).toBe(true);
      
      // Check that values are within expected range
      const min = Math.min(...output);
      const max = Math.max(...output);
      expect(min).toBeGreaterThanOrEqual(-1.1);
      expect(max).toBeLessThanOrEqual(1.1);
    });
  });
  
  describe('Downsampling', () => {
    beforeEach(() => {
      resampler = new AudioResampler(48000, 44100);
    });
    
    it('should downsample audio data correctly', () => {
      const input = new Float32Array([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]);
      const output = resampler.resample(input);
      
      // Output should be shorter for downsampling
      expect(output.length).toBeLessThan(input.length);
      expect(output.length).toBe(Math.floor(input.length * 44100 / 48000));
    });
    
    it('should apply anti-aliasing filter when downsampling', () => {
      const input = new Float32Array(1000);
      // Create high frequency signal
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 4); // High frequency
      }
      
      const output = resampler.resample(input);
      
      // Check that high frequencies are attenuated
      const outputEnergy = output.reduce((sum, val) => sum + val * val, 0);
      const inputEnergy = input.reduce((sum, val) => sum + val * val, 0);
      
      // Energy should be reduced due to filtering
      expect(outputEnergy).toBeLessThan(inputEnergy);
    });
  });
  
  describe('No resampling (same rate)', () => {
    beforeEach(() => {
      resampler = new AudioResampler(48000, 48000);
    });
    
    it('should return copy of input when rates are equal', () => {
      const input = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const output = resampler.resample(input);
      
      expect(output.length).toBe(input.length);
      expect(output).not.toBe(input); // Should be a copy
      expect(Array.from(output)).toEqual(Array.from(input));
    });
  });
  
  describe('Edge cases', () => {
    beforeEach(() => {
      resampler = new AudioResampler(44100, 48000);
    });
    
    it('should handle empty input', () => {
      const input = new Float32Array(0);
      const output = resampler.resample(input);
      
      expect(output.length).toBe(0);
    });
    
    it('should handle single sample input', () => {
      const input = new Float32Array([0.5]);
      const output = resampler.resample(input);
      
      expect(output.length).toBe(1);
      expect(output[0]).toBeCloseTo(0.5, 2);
    });
    
    it('should handle very small input arrays', () => {
      const input = new Float32Array([0.1, 0.2, 0.3]);
      const output = resampler.resample(input);
      
      expect(output.length).toBe(Math.floor(3 * 48000 / 44100));
      expect(output.every(v => !isNaN(v))).toBe(true);
    });
    
    it('should handle large input arrays', () => {
      const input = new Float32Array(10000);
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.random() * 2 - 1;
      }
      
      const output = resampler.resample(input);
      
      expect(output.length).toBe(Math.floor(10000 * 48000 / 44100));
      expect(output.every(v => !isNaN(v))).toBe(true);
      expect(output.every(v => v >= -1.1 && v <= 1.1)).toBe(true);
    });
  });
  
  describe('Common sample rate conversions', () => {
    it('should handle 8kHz to 48kHz conversion', () => {
      resampler = new AudioResampler(8000, 48000);
      const input = new Float32Array(80); // 10ms at 8kHz
      const output = resampler.resample(input);
      
      expect(output.length).toBe(480); // 10ms at 48kHz
    });
    
    it('should handle 16kHz to 48kHz conversion', () => {
      resampler = new AudioResampler(16000, 48000);
      const input = new Float32Array(160); // 10ms at 16kHz
      const output = resampler.resample(input);
      
      expect(output.length).toBe(480); // 10ms at 48kHz
    });
    
    it('should handle 48kHz to 16kHz conversion', () => {
      resampler = new AudioResampler(48000, 16000);
      const input = new Float32Array(480); // 10ms at 48kHz
      const output = resampler.resample(input);
      
      expect(output.length).toBe(160); // 10ms at 16kHz
    });
  });
  
  describe('Internal state management', () => {
    beforeEach(() => {
      resampler = new AudioResampler(44100, 48000);
    });
    
    it('should maintain state between resampling calls', () => {
      const chunk1 = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const chunk2 = new Float32Array([0.6, 0.7, 0.8, 0.9, 1.0]);
      
      const output1 = resampler.resample(chunk1);
      const output2 = resampler.resample(chunk2);
      
      // Both outputs should be valid
      expect(output1.length).toBeGreaterThan(0);
      expect(output2.length).toBeGreaterThan(0);
      
      // Values should be in expected range
      expect(output1.every(v => !isNaN(v))).toBe(true);
      expect(output2.every(v => !isNaN(v))).toBe(true);
    });
    
    it('should handle alternating chunk sizes', () => {
      const sizes = [100, 50, 200, 25, 150];
      
      for (const size of sizes) {
        const input = new Float32Array(size);
        for (let i = 0; i < size; i++) {
          input[i] = Math.sin(2 * Math.PI * i / 50);
        }
        
        const output = resampler.resample(input);
        expect(output.length).toBe(Math.floor(size * 48000 / 44100));
        expect(output.every(v => !isNaN(v))).toBe(true);
      }
    });
  });
});