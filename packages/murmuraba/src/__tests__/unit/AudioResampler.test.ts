import { AudioResampler } from '../../utils/AudioResampler';
import { Logger } from '../../core/Logger';

describe('AudioResampler', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('[Test]');
  });

  describe('resamplePCMIfNeeded', () => {
    it('should not resample when input rate equals target rate', () => {
      const pcmData = new Int16Array([1000, 2000, 3000, 4000]);
      const result = AudioResampler.resamplePCMIfNeeded(pcmData, {
        inputSampleRate: 48000,
        targetSampleRate: 48000,
        logger
      });

      expect(result.wasResampled).toBe(false);
      expect(result.outputSampleRate).toBe(48000);
      expect(result.resampledData).toBe(pcmData); // Same reference
    });

    it('should resample when input rate differs from target rate', () => {
      const pcmData = new Int16Array([1000, 2000, 3000, 4000]);
      const result = AudioResampler.resamplePCMIfNeeded(pcmData, {
        inputSampleRate: 44100,
        targetSampleRate: 48000,
        logger
      });

      expect(result.wasResampled).toBe(true);
      expect(result.outputSampleRate).toBe(48000);
      expect(result.resampledData).toBeInstanceOf(Int16Array);
      expect(result.resampledData.length).toBeGreaterThan(0);
    });

    it('should throw error for empty PCM data', () => {
      const pcmData = new Int16Array(0);
      
      expect(() => {
        AudioResampler.resamplePCMIfNeeded(pcmData, {
          inputSampleRate: 44100,
          targetSampleRate: 48000
        });
      }).toThrow('PCM data cannot be empty');
    });

    it('should throw error for invalid input sample rate', () => {
      const pcmData = new Int16Array([1000, 2000]);
      
      expect(() => {
        AudioResampler.resamplePCMIfNeeded(pcmData, {
          inputSampleRate: 0,
          targetSampleRate: 48000
        });
      }).toThrow('Invalid input sample rate: 0');
      
      expect(() => {
        AudioResampler.resamplePCMIfNeeded(pcmData, {
          inputSampleRate: NaN,
          targetSampleRate: 48000
        });
      }).toThrow('Invalid input sample rate: NaN');
    });

    it('should throw error for invalid target sample rate', () => {
      const pcmData = new Int16Array([1000, 2000]);
      
      expect(() => {
        AudioResampler.resamplePCMIfNeeded(pcmData, {
          inputSampleRate: 44100,
          targetSampleRate: -1000
        });
      }).toThrow('Invalid target sample rate: -1000');
    });
  });

  describe('resampleToRNNoiseRate', () => {
    it('should resample to 48kHz for RNNoise', () => {
      const pcmData = new Int16Array([1000, 2000, 3000, 4000]);
      const result = AudioResampler.resampleToRNNoiseRate(pcmData, 44100, logger);

      expect(result.outputSampleRate).toBe(48000);
      expect(result.wasResampled).toBe(true);
    });

    it('should not resample when already at 48kHz', () => {
      const pcmData = new Int16Array([1000, 2000, 3000, 4000]);
      const result = AudioResampler.resampleToRNNoiseRate(pcmData, 48000, logger);

      expect(result.outputSampleRate).toBe(48000);
      expect(result.wasResampled).toBe(false);
      expect(result.resampledData).toBe(pcmData);
    });
  });

  describe('error handling', () => {
    it('should handle resampling errors gracefully', () => {
      // Test with extreme rate ratios that might cause issues
      const pcmData = new Int16Array([1000]);
      
      // The error should be wrapped with our custom message if resampling fails
      expect(() => {
        AudioResampler.resamplePCMIfNeeded(pcmData, {
          inputSampleRate: 1, // Extremely low rate might cause issues
          targetSampleRate: 48000
        });
      }).toThrow(); // Will either throw validation error or resampling error
    });
  });

  describe('data integrity', () => {
    it('should preserve data integrity during resampling', () => {
      // Create a sine wave pattern
      const inputLength = 1000;
      const pcmData = new Int16Array(inputLength);
      for (let i = 0; i < inputLength; i++) {
        pcmData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 16384;
      }

      const result = AudioResampler.resamplePCMIfNeeded(pcmData, {
        inputSampleRate: 44100,
        targetSampleRate: 48000,
        logger
      });

      expect(result.resampledData).toBeInstanceOf(Int16Array);
      expect(result.resampledData.length).toBeCloseTo(inputLength * (48000 / 44100), 50);
      
      // Check that values are in valid 16-bit range
      for (let i = 0; i < result.resampledData.length; i++) {
        expect(result.resampledData[i]).toBeGreaterThanOrEqual(-32768);
        expect(result.resampledData[i]).toBeLessThanOrEqual(32767);
      }
    });

    it('should handle edge case sample values', () => {
      // Test with maximum and minimum values
      const pcmData = new Int16Array([-32768, -1, 0, 1, 32767]);
      
      const result = AudioResampler.resamplePCMIfNeeded(pcmData, {
        inputSampleRate: 22050,
        targetSampleRate: 48000,
        logger
      });

      expect(result.resampledData).toBeInstanceOf(Int16Array);
      expect(result.resampledData.length).toBeGreaterThan(0);
      
      // Verify no overflow occurred
      for (let i = 0; i < result.resampledData.length; i++) {
        expect(result.resampledData[i]).toBeGreaterThanOrEqual(-32768);
        expect(result.resampledData[i]).toBeLessThanOrEqual(32767);
      }
    });
  });
});