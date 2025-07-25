import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleAGC } from '../../../utils/SimpleAGC';

describe('SimpleAGC', () => {
  let agc: SimpleAGC;
  
  describe('Constructor', () => {
    it('should create AGC with default parameters', () => {
      agc = new SimpleAGC();
      expect(agc).toBeDefined();
      expect(agc.getCurrentGain()).toBe(1);
    });
    
    it('should create AGC with custom parameters', () => {
      agc = new SimpleAGC({
        targetLevel: 0.5,
        maxGain: 4.0,
        attackTime: 0.05,
        releaseTime: 0.2,
      });
      expect(agc).toBeDefined();
    });
    
    it('should validate target level', () => {
      expect(() => new SimpleAGC({ targetLevel: -0.1 })).toThrow('Invalid target level');
      expect(() => new SimpleAGC({ targetLevel: 1.1 })).toThrow('Invalid target level');
    });
    
    it('should validate max gain', () => {
      expect(() => new SimpleAGC({ maxGain: 0.5 })).toThrow('Invalid max gain');
      expect(() => new SimpleAGC({ maxGain: 11 })).toThrow('Invalid max gain');
    });
    
    it('should validate attack time', () => {
      expect(() => new SimpleAGC({ attackTime: -0.001 })).toThrow('Invalid attack time');
      expect(() => new SimpleAGC({ attackTime: 2 })).toThrow('Invalid attack time');
    });
    
    it('should validate release time', () => {
      expect(() => new SimpleAGC({ releaseTime: -0.001 })).toThrow('Invalid release time');
      expect(() => new SimpleAGC({ releaseTime: 6 })).toThrow('Invalid release time');
    });
  });
  
  describe('Processing', () => {
    beforeEach(() => {
      agc = new SimpleAGC({
        targetLevel: 0.7,
        maxGain: 3.0,
        attackTime: 0.01,
        releaseTime: 0.1,
      });
    });
    
    it('should amplify quiet signals', () => {
      const input = new Float32Array(100);
      // Create a quiet signal
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 20) * 0.1;
      }
      
      const output = new Float32Array(100);
      agc.process(input, output);
      
      // Output should be louder than input
      const inputRMS = Math.sqrt(input.reduce((sum, val) => sum + val * val, 0) / input.length);
      const outputRMS = Math.sqrt(output.reduce((sum, val) => sum + val * val, 0) / output.length);
      
      expect(outputRMS).toBeGreaterThan(inputRMS);
    });
    
    it('should reduce loud signals', () => {
      const input = new Float32Array(100);
      // Create a loud signal
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 20) * 0.95;
      }
      
      const output = new Float32Array(100);
      agc.process(input, output);
      
      // Output should be quieter than input
      const inputRMS = Math.sqrt(input.reduce((sum, val) => sum + val * val, 0) / input.length);
      const outputRMS = Math.sqrt(output.reduce((sum, val) => sum + val * val, 0) / output.length);
      
      expect(outputRMS).toBeLessThan(inputRMS);
    });
    
    it('should maintain signals at target level', () => {
      const input = new Float32Array(1000);
      // Create signal at target level
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 20) * 0.7;
      }
      
      const output = new Float32Array(1000);
      agc.process(input, output);
      
      // Output should be close to input
      const inputRMS = Math.sqrt(input.reduce((sum, val) => sum + val * val, 0) / input.length);
      const outputRMS = Math.sqrt(output.reduce((sum, val) => sum + val * val, 0) / output.length);
      
      expect(outputRMS).toBeCloseTo(inputRMS, 1);
    });
    
    it('should respect max gain limit', () => {
      const input = new Float32Array(100);
      // Create very quiet signal
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 20) * 0.01;
      }
      
      const output = new Float32Array(100);
      agc.process(input, output);
      
      // Check that gain doesn't exceed max
      const gain = agc.getCurrentGain();
      expect(gain).toBeLessThanOrEqual(3.0);
    });
    
    it('should handle silence without producing noise', () => {
      const input = new Float32Array(100); // All zeros
      const output = new Float32Array(100);
      
      agc.process(input, output);
      
      // Output should still be silence
      expect(output.every(v => v === 0)).toBe(true);
    });
  });
  
  describe('Attack and Release', () => {
    it('should respond quickly to sudden loud signals (attack)', () => {
      agc = new SimpleAGC({
        targetLevel: 0.5,
        attackTime: 0.01,
        releaseTime: 0.1,
      });
      
      // Start with quiet signal
      const quietInput = new Float32Array(100);
      for (let i = 0; i < quietInput.length; i++) {
        quietInput[i] = Math.sin(2 * Math.PI * i / 20) * 0.1;
      }
      
      const output1 = new Float32Array(100);
      agc.process(quietInput, output1);
      const gainBefore = agc.getCurrentGain();
      
      // Sudden loud signal
      const loudInput = new Float32Array(100);
      for (let i = 0; i < loudInput.length; i++) {
        loudInput[i] = Math.sin(2 * Math.PI * i / 20) * 0.9;
      }
      
      const output2 = new Float32Array(100);
      agc.process(loudInput, output2);
      const gainAfter = agc.getCurrentGain();
      
      // Gain should decrease quickly
      expect(gainAfter).toBeLessThan(gainBefore);
    });
    
    it('should respond slowly to sudden quiet signals (release)', () => {
      agc = new SimpleAGC({
        targetLevel: 0.5,
        attackTime: 0.01,
        releaseTime: 0.5,
      });
      
      // Start with loud signal
      const loudInput = new Float32Array(100);
      for (let i = 0; i < loudInput.length; i++) {
        loudInput[i] = Math.sin(2 * Math.PI * i / 20) * 0.9;
      }
      
      const output1 = new Float32Array(100);
      agc.process(loudInput, output1);
      const gainBefore = agc.getCurrentGain();
      
      // Sudden quiet signal
      const quietInput = new Float32Array(100);
      for (let i = 0; i < quietInput.length; i++) {
        quietInput[i] = Math.sin(2 * Math.PI * i / 20) * 0.1;
      }
      
      const output2 = new Float32Array(100);
      agc.process(quietInput, output2);
      const gainAfter = agc.getCurrentGain();
      
      // Gain should increase but not too much (slow release)
      expect(gainAfter).toBeGreaterThan(gainBefore);
      expect(gainAfter).toBeLessThan(3.0);
    });
  });
  
  describe('Edge Cases', () => {
    beforeEach(() => {
      agc = new SimpleAGC();
    });
    
    it('should handle empty input', () => {
      const input = new Float32Array(0);
      const output = new Float32Array(0);
      
      expect(() => agc.process(input, output)).not.toThrow();
    });
    
    it('should handle single sample', () => {
      const input = new Float32Array([0.5]);
      const output = new Float32Array([0]);
      
      agc.process(input, output);
      
      expect(output[0]).toBeCloseTo(0.5, 2);
    });
    
    it('should handle very long buffers', () => {
      const input = new Float32Array(10000);
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.random() * 0.5 - 0.25;
      }
      
      const output = new Float32Array(10000);
      
      expect(() => agc.process(input, output)).not.toThrow();
      expect(output.some(v => v !== 0)).toBe(true);
    });
    
    it('should handle alternating loud and quiet segments', () => {
      const input = new Float32Array(1000);
      
      // Alternate between loud and quiet every 100 samples
      for (let i = 0; i < input.length; i++) {
        const amplitude = Math.floor(i / 100) % 2 === 0 ? 0.9 : 0.1;
        input[i] = Math.sin(2 * Math.PI * i / 20) * amplitude;
      }
      
      const output = new Float32Array(1000);
      agc.process(input, output);
      
      // AGC should adapt to changes
      expect(output.every(v => Math.abs(v) <= 1)).toBe(true);
    });
  });
  
  describe('State Management', () => {
    beforeEach(() => {
      agc = new SimpleAGC();
    });
    
    it('should maintain state across multiple process calls', () => {
      const chunk1 = new Float32Array(100);
      const chunk2 = new Float32Array(100);
      
      // First chunk quiet
      for (let i = 0; i < 100; i++) {
        chunk1[i] = Math.sin(2 * Math.PI * i / 20) * 0.1;
      }
      
      // Second chunk same as first
      chunk1.forEach((v, i) => chunk2[i] = v);
      
      const output1 = new Float32Array(100);
      const output2 = new Float32Array(100);
      
      agc.process(chunk1, output1);
      const gain1 = agc.getCurrentGain();
      
      agc.process(chunk2, output2);
      const gain2 = agc.getCurrentGain();
      
      // Gain should stabilize
      expect(Math.abs(gain2 - gain1)).toBeLessThan(0.1);
    });
    
    it('should reset state when reset is called', () => {
      // Process some audio to change gain
      const input = new Float32Array(100);
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.sin(2 * Math.PI * i / 20) * 0.1;
      }
      
      const output = new Float32Array(100);
      agc.process(input, output);
      
      expect(agc.getCurrentGain()).not.toBe(1);
      
      agc.reset();
      
      expect(agc.getCurrentGain()).toBe(1);
    });
  });
});