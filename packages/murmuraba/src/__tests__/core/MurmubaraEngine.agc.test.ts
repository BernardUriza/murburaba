import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MurmubaraEngine } from '../../core/MurmubaraEngine';

describe('MurmubaraEngine AGC Integration - TDD', () => {
  let engine: MurmubaraEngine;

  beforeEach(() => {
    // Minimal mocks
    global.window = {
      AudioContext: vi.fn(),
      webkitAudioContext: vi.fn(),
      WebAssembly: { instantiate: vi.fn() }
    } as any;

    engine = new MurmubaraEngine();
  });

  describe('Volume Fix - AGC Integration', () => {
    it('should have AGC enabled by default to fix 4% volume issue', () => {
      // The engine should have AGC enabled
      expect(engine.isAGCEnabled()).toBe(true);
    });

    it('should allow disabling AGC if user prefers manual control', () => {
      engine.setAGCEnabled(false);
      expect(engine.isAGCEnabled()).toBe(false);
    });

    it('should configure AGC with medical-grade settings', () => {
      const agcConfig = engine.getAGCConfig();
      
      expect(agcConfig).toEqual({
        targetLevel: 0.3,    // 30% target for clear speech
        maxGain: 6.0,        // Safe limit for medical recordings
        enabled: true
      });
    });
  });

  describe('Reduction Factor Adjustment', () => {
    it('should use new reduction factors that preserve volume', () => {
      // Test new reduction factors
      expect(engine.getReductionFactor('low')).toBe(1.0);    // Was 0.9
      expect(engine.getReductionFactor('medium')).toBe(0.9); // Was 0.7
      expect(engine.getReductionFactor('high')).toBe(0.8);   // Was 0.5
    });
  });
});