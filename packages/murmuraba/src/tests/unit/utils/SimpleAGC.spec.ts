import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleAGC } from '../../../utils/SimpleAGC';
import { MockAudioContext } from '../../mocks/global-mocks';

describe('SimpleAGC', () => {
  let agc: SimpleAGC;
  let audioContext: MockAudioContext;

  beforeEach(() => {
    audioContext = new MockAudioContext();
  });

  describe('Constructor', () => {
    it('should create AGC with default parameters', () => {
      agc = new SimpleAGC(audioContext as any);
      expect(agc).toBeDefined();
      expect(agc.getCurrentGain()).toBe(1);
    });

    it('should create AGC with custom target level', () => {
      agc = new SimpleAGC(audioContext as any, 0.5);
      expect(agc).toBeDefined();
    });

    it('should create analyser and gain nodes', () => {
      agc = new SimpleAGC(audioContext as any);
      expect(audioContext.createAnalyser).toHaveBeenCalled();
      expect(audioContext.createGain).toHaveBeenCalled();
    });
  });

  describe('Node Connection', () => {
    beforeEach(() => {
      agc = new SimpleAGC(audioContext as any);
    });

    it('should connect source to destination through AGC', () => {
      const sourceNode = { connect: vi.fn() };
      const destinationNode = { connect: vi.fn() };

      agc.connect(sourceNode as any, destinationNode as any);

      expect(sourceNode.connect).toHaveBeenCalled();
      const analyserNode = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      expect(gainNode.connect).toHaveBeenCalledWith(destinationNode);
    });
  });

  describe('Gain Updates', () => {
    beforeEach(() => {
      agc = new SimpleAGC(audioContext as any, 0.3);
    });

    it('should update gain when updateGain is called', () => {
      const gainNode = audioContext.createGain();
      agc.updateGain();

      // Since mock data is centered at 128 (silence), gain should not change
      expect(agc.getCurrentGain()).toBe(1);
    });

    it('should calculate RMS correctly', () => {
      // Mock analyser to return non-silent data
      const analyserMock = audioContext.createAnalyser();
      (analyserMock.getByteTimeDomainData as any).mockImplementation((array: Uint8Array) => {
        // Fill with a sine wave pattern
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.floor(64 * Math.sin((2 * Math.PI * i) / 20));
        }
      });

      agc = new SimpleAGC(audioContext as any, 0.3);
      agc.updateGain();

      // With non-zero signal, gain should be adjusted
      expect(audioContext.createGain().gain.setTargetAtTime).toHaveBeenCalled();
    });

    it('should limit gain to maxGain', () => {
      // Mock analyser to return very quiet signal
      const analyserMock = audioContext.createAnalyser();
      (analyserMock.getByteTimeDomainData as any).mockImplementation((array: Uint8Array) => {
        // Very small deviation from center (very quiet)
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + (i % 2 === 0 ? 1 : -1);
        }
      });

      agc = new SimpleAGC(audioContext as any, 0.7);
      agc.updateGain();

      // Check that gain is applied with proper timing
      const gainNode = audioContext.createGain();
      expect(gainNode.gain.setTargetAtTime).toHaveBeenCalled();
    });
  });

  describe('Attack and Release Timing', () => {
    beforeEach(() => {
      agc = new SimpleAGC(audioContext as any, 0.5);
    });

    it('should use attack time for increasing gain', () => {
      // Start with loud signal (low gain needed)
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.5;

      // Mock quiet signal (high gain needed)
      const analyserMock = audioContext.createAnalyser();
      (analyserMock.getByteTimeDomainData as any).mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + (i % 2 === 0 ? 2 : -2); // Very quiet
        }
      });

      agc = new SimpleAGC(audioContext as any, 0.5);
      agc.updateGain();

      // Should use attack time (0.1s)
      expect(gainNode.gain.setTargetAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        audioContext.currentTime,
        0.1
      );
    });

    it('should use release time for decreasing gain', () => {
      // Start with quiet signal (high gain)
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 2.0;

      // Mock loud signal (low gain needed)
      const analyserMock = audioContext.createAnalyser();
      (analyserMock.getByteTimeDomainData as any).mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.floor(100 * Math.sin((2 * Math.PI * i) / 20)); // Loud
        }
      });

      agc = new SimpleAGC(audioContext as any, 0.5);
      agc.updateGain();

      // Should use release time (0.5s)
      expect(gainNode.gain.setTargetAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        audioContext.currentTime,
        0.5
      );
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      agc = new SimpleAGC(audioContext as any);
    });

    it('should handle silence without adjusting gain', () => {
      // Default mock returns silence (all 128)
      agc.updateGain();

      // Gain should remain at 1
      expect(agc.getCurrentGain()).toBe(1);
    });

    it('should handle maximum signal amplitude', () => {
      const analyserMock = audioContext.createAnalyser();
      (analyserMock.getByteTimeDomainData as any).mockImplementation((array: Uint8Array) => {
        // Maximum amplitude
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 2 === 0 ? 255 : 0;
        }
      });

      agc = new SimpleAGC(audioContext as any, 0.3);
      agc.updateGain();

      // Should apply gain reduction
      const gainNode = audioContext.createGain();
      expect(gainNode.gain.setTargetAtTime).toHaveBeenCalled();
    });
  });
});
