import { describe, it, expect, beforeEach } from 'vitest';
import { AudioConverter } from '../../../utils/audioConverter';

describe('AudioConverter', () => {
  let converter: AudioConverter;
  
  beforeEach(() => {
    converter = new AudioConverter();
  });
  
  describe('float32ToInt16', () => {
    it('should convert float32 audio to int16', () => {
      const input = new Float32Array([0, 0.5, 1, -0.5, -1]);
      const output = converter.float32ToInt16(input);
      
      expect(output).toBeInstanceOf(Int16Array);
      expect(output.length).toBe(input.length);
      expect(output[0]).toBe(0);
      expect(output[1]).toBeCloseTo(16383, -1);
      expect(output[2]).toBe(32767);
      expect(output[3]).toBeCloseTo(-16384, -1);
      expect(output[4]).toBe(-32768);
    });
    
    it('should handle empty input', () => {
      const input = new Float32Array(0);
      const output = converter.float32ToInt16(input);
      
      expect(output.length).toBe(0);
    });
    
    it('should clamp values outside -1 to 1 range', () => {
      const input = new Float32Array([1.5, -1.5, 2, -2]);
      const output = converter.float32ToInt16(input);
      
      expect(output[0]).toBe(32767); // Clamped to max
      expect(output[1]).toBe(-32768); // Clamped to min
      expect(output[2]).toBe(32767);
      expect(output[3]).toBe(-32768);
    });
    
    it('should handle very small values', () => {
      const input = new Float32Array([0.00001, -0.00001, 0.0001, -0.0001]);
      const output = converter.float32ToInt16(input);
      
      // Should not be zero due to proper conversion
      expect(Math.abs(output[0])).toBeGreaterThan(0);
      expect(Math.abs(output[1])).toBeGreaterThan(0);
    });
  });
  
  describe('int16ToFloat32', () => {
    it('should convert int16 audio to float32', () => {
      const input = new Int16Array([0, 16384, 32767, -16384, -32768]);
      const output = converter.int16ToFloat32(input);
      
      expect(output).toBeInstanceOf(Float32Array);
      expect(output.length).toBe(input.length);
      expect(output[0]).toBe(0);
      expect(output[1]).toBeCloseTo(0.5, 2);
      expect(output[2]).toBeCloseTo(1, 2);
      expect(output[3]).toBeCloseTo(-0.5, 2);
      expect(output[4]).toBe(-1);
    });
    
    it('should handle empty input', () => {
      const input = new Int16Array(0);
      const output = converter.int16ToFloat32(input);
      
      expect(output.length).toBe(0);
    });
    
    it('should handle full range of int16 values', () => {
      const values = [-32768, -16384, -1, 0, 1, 16384, 32767];
      const input = new Int16Array(values);
      const output = converter.int16ToFloat32(input);
      
      // All values should be in -1 to 1 range
      expect(output.every((v: number) => v >= -1 && v <= 1)).toBe(true);
    });
  });
  
  describe('Round-trip conversion', () => {
    it('should maintain signal integrity through round-trip conversion', () => {
      const original = new Float32Array(100);
      // Generate a sine wave
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.sin(2 * Math.PI * i / 20) * 0.8;
      }
      
      const int16 = converter.float32ToInt16(original);
      const restored = converter.int16ToFloat32(int16);
      
      // Check that values are close to original
      for (let i = 0; i < original.length; i++) {
        expect(restored[i]).toBeCloseTo(original[i], 2);
      }
    });
    
    it('should handle extreme values in round-trip', () => {
      const original = new Float32Array([1, -1, 0, 0.5, -0.5]);
      const int16 = converter.float32ToInt16(original);
      const restored = converter.int16ToFloat32(int16);
      
      expect(restored[0]).toBeCloseTo(1, 2);
      expect(restored[1]).toBe(-1);
      expect(restored[2]).toBe(0);
      expect(restored[3]).toBeCloseTo(0.5, 2);
      expect(restored[4]).toBeCloseTo(-0.5, 2);
    });
  });
  
  describe('interleaveChannels', () => {
    it('should interleave two mono channels into stereo', () => {
      const left = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const right = new Float32Array([0.5, 0.6, 0.7, 0.8]);
      
      const interleaved = converter.interleaveChannels(left, right);
      
      expect(interleaved.length).toBe(8);
      expect(interleaved[0]).toBe(0.1); // L
      expect(interleaved[1]).toBe(0.5); // R
      expect(interleaved[2]).toBe(0.2); // L
      expect(interleaved[3]).toBe(0.6); // R
      expect(interleaved[4]).toBe(0.3); // L
      expect(interleaved[5]).toBe(0.7); // R
      expect(interleaved[6]).toBe(0.4); // L
      expect(interleaved[7]).toBe(0.8); // R
    });
    
    it('should handle channels of different lengths', () => {
      const left = new Float32Array([0.1, 0.2, 0.3]);
      const right = new Float32Array([0.5, 0.6]);
      
      const interleaved = converter.interleaveChannels(left, right);
      
      // Should use the shorter length
      expect(interleaved.length).toBe(4);
      expect(interleaved[0]).toBe(0.1);
      expect(interleaved[1]).toBe(0.5);
      expect(interleaved[2]).toBe(0.2);
      expect(interleaved[3]).toBe(0.6);
    });
    
    it('should handle empty channels', () => {
      const left = new Float32Array(0);
      const right = new Float32Array(0);
      
      const interleaved = converter.interleaveChannels(left, right);
      
      expect(interleaved.length).toBe(0);
    });
    
    it('should handle single sample channels', () => {
      const left = new Float32Array([0.5]);
      const right = new Float32Array([0.7]);
      
      const interleaved = converter.interleaveChannels(left, right);
      
      expect(interleaved.length).toBe(2);
      expect(interleaved[0]).toBe(0.5);
      expect(interleaved[1]).toBe(0.7);
    });
  });
  
  describe('deinterleaveChannels', () => {
    it('should deinterleave stereo into two mono channels', () => {
      const interleaved = new Float32Array([
        0.1, 0.5, // Sample 1: L, R
        0.2, 0.6, // Sample 2: L, R
        0.3, 0.7, // Sample 3: L, R
        0.4, 0.8  // Sample 4: L, R
      ]);
      
      const { left, right } = converter.deinterleaveChannels(interleaved);
      
      expect(left.length).toBe(4);
      expect(right.length).toBe(4);
      
      expect(Array.from(left)).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(Array.from(right)).toEqual([0.5, 0.6, 0.7, 0.8]);
    });
    
    it('should handle odd number of samples', () => {
      const interleaved = new Float32Array([0.1, 0.5, 0.2, 0.6, 0.3]);
      
      const { left, right } = converter.deinterleaveChannels(interleaved);
      
      // Should ignore the last sample
      expect(left.length).toBe(2);
      expect(right.length).toBe(2);
      expect(Array.from(left)).toEqual([0.1, 0.2]);
      expect(Array.from(right)).toEqual([0.5, 0.6]);
    });
    
    it('should handle empty input', () => {
      const interleaved = new Float32Array(0);
      
      const { left, right } = converter.deinterleaveChannels(interleaved);
      
      expect(left.length).toBe(0);
      expect(right.length).toBe(0);
    });
    
    it('should handle two-sample input', () => {
      const interleaved = new Float32Array([0.3, 0.7]);
      
      const { left, right } = converter.deinterleaveChannels(interleaved);
      
      expect(left.length).toBe(1);
      expect(right.length).toBe(1);
      expect(left[0]).toBe(0.3);
      expect(right[0]).toBe(0.7);
    });
  });
  
  describe('mixToMono', () => {
    it('should mix stereo to mono by averaging', () => {
      const stereo = new Float32Array([
        0.2, 0.8,  // Average: 0.5
        0.4, 0.6,  // Average: 0.5
        1.0, 0.0,  // Average: 0.5
        -0.5, 0.5  // Average: 0.0
      ]);
      
      const mono = converter.mixToMono(stereo);
      
      expect(mono.length).toBe(4);
      expect(mono[0]).toBeCloseTo(0.5, 5);
      expect(mono[1]).toBeCloseTo(0.5, 5);
      expect(mono[2]).toBeCloseTo(0.5, 5);
      expect(mono[3]).toBeCloseTo(0.0, 5);
    });
    
    it('should handle already mono input', () => {
      const mono = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      const result = converter.mixToMono(mono, 1);
      
      expect(result.length).toBe(5);
      expect(Array.from(result)).toEqual(Array.from(mono));
      expect(result).not.toBe(mono); // Should be a copy
    });
    
    it('should handle multi-channel input', () => {
      const fourChannel = new Float32Array([
        0.1, 0.2, 0.3, 0.4,  // Average: 0.25
        0.4, 0.4, 0.4, 0.4,  // Average: 0.4
        0.8, 0.0, 0.0, 0.0   // Average: 0.2
      ]);
      
      const mono = converter.mixToMono(fourChannel, 4);
      
      expect(mono.length).toBe(3);
      expect(mono[0]).toBeCloseTo(0.25, 5);
      expect(mono[1]).toBeCloseTo(0.4, 5);
      expect(mono[2]).toBeCloseTo(0.2, 5);
    });
    
    it('should handle empty input', () => {
      const empty = new Float32Array(0);
      const mono = converter.mixToMono(empty);
      
      expect(mono.length).toBe(0);
    });
    
    it('should clamp output values', () => {
      const stereo = new Float32Array([
        1.0, 1.0,    // Would average to 1.0 (no clipping needed)
        0.8, 0.8,    // Would average to 0.8
        -0.9, -0.9   // Would average to -0.9
      ]);
      
      const mono = converter.mixToMono(stereo);
      
      expect(mono.every((v: number) => v >= -1 && v <= 1)).toBe(true);
    });
  });
  
  describe('Edge cases and performance', () => {
    it('should handle very large buffers efficiently', () => {
      const largeInput = new Float32Array(100000);
      for (let i = 0; i < largeInput.length; i++) {
        largeInput[i] = Math.sin(2 * Math.PI * i / 100) * 0.5;
      }
      
      const startTime = performance.now();
      const output = converter.float32ToInt16(largeInput);
      const endTime = performance.now();
      
      expect(output.length).toBe(100000);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
    
    it('should handle special float values', () => {
      const input = new Float32Array([NaN, Infinity, -Infinity, 0.5]);
      const output = converter.float32ToInt16(input);
      
      // NaN and Infinity should be clamped
      expect(output[0]).toBe(0); // NaN -> 0
      expect(output[1]).toBe(32767); // Infinity -> max
      expect(output[2]).toBe(-32768); // -Infinity -> min
      expect(output[3]).toBeCloseTo(16383, -1);
    });
  });
});