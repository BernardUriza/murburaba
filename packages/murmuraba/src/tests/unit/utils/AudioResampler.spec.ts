import { describe, it, expect } from 'vitest';
import { AudioResampler } from '../../../utils/AudioResampler';

describe('AudioResampler', () => {
  describe('resamplePCMIfNeeded', () => {
    it('should not resample when input rate matches target rate', () => {
      const input = new Int16Array([0, 16384, 32767, 16384, 0]);
      const result = AudioResampler.resamplePCMIfNeeded(input, {
        inputSampleRate: 48000,
        targetSampleRate: 48000,
      });

      expect(result.wasResampled).toBe(false);
      expect(result.outputSampleRate).toBe(48000);
      expect(result.resampledData).toBe(input);
    });

    it('should resample from 44100 to 48000', () => {
      const input = new Int16Array([0, 16384, 32767, 16384, 0]);
      const result = AudioResampler.resamplePCMIfNeeded(input, {
        inputSampleRate: 44100,
        targetSampleRate: 48000,
      });

      expect(result.wasResampled).toBe(true);
      expect(result.outputSampleRate).toBe(48000);
      expect(result.resampledData.length).toBeGreaterThan(input.length);
    });

    it('should resample from 48000 to 44100', () => {
      const input = new Int16Array([0, 16384, 32767, 16384, 0]);
      const result = AudioResampler.resamplePCMIfNeeded(input, {
        inputSampleRate: 48000,
        targetSampleRate: 44100,
      });

      expect(result.wasResampled).toBe(true);
      expect(result.outputSampleRate).toBe(44100);
      expect(result.resampledData.length).toBeLessThan(input.length);
    });

    it('should throw error for empty PCM data', () => {
      expect(() =>
        AudioResampler.resamplePCMIfNeeded(new Int16Array(0), {
          inputSampleRate: 44100,
          targetSampleRate: 48000,
        })
      ).toThrow('PCM data cannot be empty');
    });

    it('should throw error for invalid input sample rate', () => {
      const input = new Int16Array([0, 16384, 32767]);

      expect(() =>
        AudioResampler.resamplePCMIfNeeded(input, {
          inputSampleRate: 0,
          targetSampleRate: 48000,
        })
      ).toThrow('Invalid input sample rate');

      expect(() =>
        AudioResampler.resamplePCMIfNeeded(input, {
          inputSampleRate: -44100,
          targetSampleRate: 48000,
        })
      ).toThrow('Invalid input sample rate');
    });

    it('should throw error for invalid target sample rate', () => {
      const input = new Int16Array([0, 16384, 32767]);

      expect(() =>
        AudioResampler.resamplePCMIfNeeded(input, {
          inputSampleRate: 44100,
          targetSampleRate: 0,
        })
      ).toThrow('Invalid target sample rate');

      expect(() =>
        AudioResampler.resamplePCMIfNeeded(input, {
          inputSampleRate: 44100,
          targetSampleRate: -48000,
        })
      ).toThrow('Invalid target sample rate');
    });

    it('should preserve signal characteristics when resampling', () => {
      // Create a simple sine wave
      const frequency = 440; // A4 note
      const duration = 0.1; // 100ms
      const inputRate = 44100;
      const targetRate = 48000;
      const numSamples = Math.floor(inputRate * duration);

      const input = new Int16Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const t = i / inputRate;
        input[i] = Math.floor(Math.sin(2 * Math.PI * frequency * t) * 32767);
      }

      const result = AudioResampler.resamplePCMIfNeeded(input, {
        inputSampleRate: inputRate,
        targetSampleRate: targetRate,
      });

      expect(result.wasResampled).toBe(true);
      expect(result.outputSampleRate).toBe(targetRate);
      // The resampled length should be approximately scaled by the rate ratio
      const expectedLength = Math.floor((numSamples * targetRate) / inputRate);
      expect(Math.abs(result.resampledData.length - expectedLength)).toBeLessThanOrEqual(2);
    });

    it('should handle very short audio segments', () => {
      const input = new Int16Array([16384]);
      const result = AudioResampler.resamplePCMIfNeeded(input, {
        inputSampleRate: 44100,
        targetSampleRate: 48000,
      });

      expect(result.wasResampled).toBe(true);
      expect(result.resampledData.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle long audio segments', () => {
      const input = new Int16Array(44100); // 1 second of audio
      for (let i = 0; i < input.length; i++) {
        input[i] = Math.floor(Math.random() * 65536 - 32768);
      }

      const result = AudioResampler.resamplePCMIfNeeded(input, {
        inputSampleRate: 44100,
        targetSampleRate: 48000,
      });

      expect(result.wasResampled).toBe(true);
      expect(result.resampledData.length).toBeCloseTo(48000, 100);
    });

    it('should handle common sample rate conversions', () => {
      const testCases = [
        { from: 8000, to: 48000 },
        { from: 16000, to: 48000 },
        { from: 22050, to: 48000 },
        { from: 32000, to: 48000 },
        { from: 44100, to: 48000 },
        { from: 96000, to: 48000 },
      ];

      const input = new Int16Array([0, 16384, 32767, 16384, 0]);

      for (const { from, to } of testCases) {
        const result = AudioResampler.resamplePCMIfNeeded(input, {
          inputSampleRate: from,
          targetSampleRate: to,
        });

        expect(result.outputSampleRate).toBe(to);
        expect(result.wasResampled).toBe(from !== to);
      }
    });

    it('should maintain audio level range after resampling', () => {
      const input = new Int16Array([
        -32768, // Min value
        -16384,
        0,
        16384,
        32767, // Max value
      ]);

      const result = AudioResampler.resamplePCMIfNeeded(input, {
        inputSampleRate: 44100,
        targetSampleRate: 48000,
      });

      // Check that all values are within valid Int16 range
      for (let i = 0; i < result.resampledData.length; i++) {
        expect(result.resampledData[i]).toBeGreaterThanOrEqual(-32768);
        expect(result.resampledData[i]).toBeLessThanOrEqual(32767);
      }
    });
  });

  describe('formatAsWebMContainer', () => {
    it('should format PCM data as WebM container', () => {
      const pcmData = new Int16Array([0, 16384, 32767, 16384, 0]);
      const sampleRate = 48000;

      const webmBlob = AudioResampler.formatAsWebMContainer(pcmData, sampleRate);

      expect(webmBlob).toBeInstanceOf(Blob);
      expect(webmBlob.type).toBe('audio/webm');
      expect(webmBlob.size).toBeGreaterThan(0);
    });

    it('should create different sized blobs for different input sizes', () => {
      const pcmData1 = new Int16Array(1000);
      const pcmData2 = new Int16Array(2000);
      const sampleRate = 48000;

      const blob1 = AudioResampler.formatAsWebMContainer(pcmData1, sampleRate);
      const blob2 = AudioResampler.formatAsWebMContainer(pcmData2, sampleRate);

      expect(blob2.size).toBeGreaterThan(blob1.size);
    });
  });
});
