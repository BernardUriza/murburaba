import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigValidationService, getConfigValidator } from '@features/configuration/services/ConfigValidationService';
import type { ILogger } from '@core/interfaces';
import { ConfigPresets } from '@features/configuration/schemas/configSchema';

describe('ConfigValidationService', () => {
  let service: ConfigValidationService;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
      setLevel: vi.fn(),
      setLogHandler: vi.fn(),
      getLevel: vi.fn().mockReturnValue('info'),
    };
    service = new ConfigValidationService(mockLogger);
  });

  describe('validateAndMerge', () => {
    it('should validate and merge valid configuration', () => {
      const userConfig = {
        logLevel: 'debug' as const,
        bufferSize: 1024 as const,
      };

      const result = service.validateAndMerge(userConfig);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.logLevel).toBe('debug');
        expect(result.value.bufferSize).toBe(1024);
        expect(result.value.noiseReductionLevel).toBe('medium'); // default
      }
    });

    it('should apply defaults for empty configuration', () => {
      const result = service.validateAndMerge();
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.logLevel).toBe('info');
        expect(result.value.bufferSize).toBe(512);
        expect(result.value.algorithm).toBe('rnnoise');
      }
    });

    it('should return validation errors for invalid config', () => {
      const invalidConfig = {
        bufferSize: 999 as any,
        logLevel: 'verbose' as any,
      };

      const result = service.validateAndMerge(invalidConfig);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.length).toBeGreaterThan(0);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('validateChunkConfig', () => {
    it('should validate valid chunk configuration', () => {
      const config = {
        chunkDuration: 5,
        overlap: 0.2,
      };

      const result = service.validateChunkConfig(config);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.chunkDuration).toBe(5);
        expect(result.value.overlap).toBe(0.2);
      }
    });

    it('should reject invalid chunk configuration', () => {
      const config = {
        chunkDuration: 50, // too long
        overlap: -0.5, // negative
      };

      const result = service.validateChunkConfig(config);
      
      expect(result.ok).toBe(false);
    });
  });

  describe('getPreset', () => {
    it('should return highQuality preset', () => {
      const preset = service.getPreset('highQuality');
      expect(preset).toBe(ConfigPresets.highQuality);
    });

    it('should return lowLatency preset', () => {
      const preset = service.getPreset('lowLatency');
      expect(preset).toBe(ConfigPresets.lowLatency);
    });
  });

  describe('createConfig', () => {
    it('should return ConfigBuilder instance', () => {
      const builder = service.createConfig();
      expect(builder).toBeDefined();
      expect(builder.build).toBeDefined();
    });
  });

  describe('validateRuntime', () => {
    it('should return true for valid config', () => {
      const config = {
        logLevel: 'info',
        bufferSize: 512,
      };

      const isValid = service.validateRuntime(config);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid config', () => {
      const config = {
        bufferSize: 'invalid',
      };

      const isValid = service.validateRuntime(config);
      expect(isValid).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('getErrorMessages', () => {
    it('should format error messages correctly', () => {
      const errors = [
        { path: ['bufferSize'], message: 'Invalid value', code: 'invalid_type' },
        { path: ['worker', 'count'], message: 'Too high', code: 'too_big' },
      ];

      const messages = service.getErrorMessages(errors);
      
      expect(messages).toEqual([
        'bufferSize: Invalid value',
        'worker.count: Too high',
      ]);
    });

    it('should handle root level errors', () => {
      const errors = [
        { path: [], message: 'Invalid configuration', code: 'custom' },
      ];

      const messages = service.getErrorMessages(errors);
      expect(messages).toEqual(['Invalid configuration']);
    });
  });

  describe('suggestFixes', () => {
    it('should suggest fixes for buffer size', () => {
      const errors = [
        { path: ['bufferSize'], message: 'Invalid', code: 'invalid_union' },
      ];

      const suggestions = service.suggestFixes(errors);
      expect(suggestions).toContain('Buffer size must be one of: 256, 512, 1024, 2048, 4096');
    });

    it('should suggest fixes for noise reduction level', () => {
      const errors = [
        { path: ['noiseReductionLevel'], message: 'Invalid', code: 'invalid_enum_value' },
      ];

      const suggestions = service.suggestFixes(errors);
      expect(suggestions).toContain('Noise reduction level must be: low, medium, high, or auto');
    });

    it('should suggest fixes for worker count', () => {
      const errors = [
        { path: ['workerCount'], message: 'Too high', code: 'too_big' },
      ];

      const suggestions = service.suggestFixes(errors);
      expect(suggestions).toContain('Worker count must be between 1 and 8');
    });

    it('should handle generic type errors', () => {
      const errors = [
        { path: ['unknownField'], message: 'Wrong type', code: 'invalid_type' },
      ];

      const suggestions = service.suggestFixes(errors);
      expect(suggestions).toContain("Field 'unknownField' has incorrect type");
    });
  });

  describe('getConfigValidator singleton', () => {
    it('should return same instance', () => {
      const validator1 = getConfigValidator();
      const validator2 = getConfigValidator();
      
      expect(validator1).toBe(validator2);
    });
  });
});
