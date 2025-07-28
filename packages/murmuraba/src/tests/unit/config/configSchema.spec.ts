import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { 
  MurmubaraConfigSchema,
  ChunkConfigSchema,
  validateConfig,
  safeValidateConfig,
  ConfigBuilder,
  ConfigPresets
} from '../../../config/configSchema';

describe('Configuration Validation', () => {
  describe('MurmubaraConfigSchema', () => {
    it('should accept valid configuration', () => {
      const config = {
        logLevel: 'info' as const,
        noiseReductionLevel: 'high' as const,
        bufferSize: 1024 as const,
        algorithm: 'rnnoise' as const,
        autoCleanup: true,
        cleanupDelay: 5000,
        useWorker: true,
        workerPath: '/worker.js',
        allowDegraded: false,
        enableAGC: true,
        workerCount: 4
      };

      const result = MurmubaraConfigSchema.parse(config);
      expect(result).toMatchObject(config);
    });

    it('should apply defaults for missing fields', () => {
      const result = validateConfig({});
      
      expect(result.logLevel).toBe('info');
      expect(result.noiseReductionLevel).toBe('medium');
      expect(result.bufferSize).toBe(512);
      expect(result.algorithm).toBe('rnnoise');
      expect(result.autoCleanup).toBe(true);
      expect(result.cleanupDelay).toBe(5000);
      expect(result.useWorker).toBe(true);
      expect(result.allowDegraded).toBe(false);
      expect(result.enableAGC).toBe(false);
      expect(result.workerCount).toBe(2);
    });

    it('should reject invalid buffer size', () => {
      expect(() => {
        MurmubaraConfigSchema.parse({ bufferSize: 1000 });
      }).toThrow();
    });

    it('should reject invalid log level', () => {
      expect(() => {
        MurmubaraConfigSchema.parse({ logLevel: 'verbose' });
      }).toThrow();
    });

    it('should reject worker count out of range', () => {
      expect(() => {
        MurmubaraConfigSchema.parse({ workerCount: 10 });
      }).toThrow();
      
      expect(() => {
        MurmubaraConfigSchema.parse({ workerCount: 0 });
      }).toThrow();
    });

    it('should reject negative cleanup delay', () => {
      expect(() => {
        MurmubaraConfigSchema.parse({ cleanupDelay: -1000 });
      }).toThrow();
    });
  });

  describe('ChunkConfigSchema', () => {
    it('should accept valid chunk configuration', () => {
      const config = {
        chunkDuration: 8,
        overlap: 0.1
      };

      const result = ChunkConfigSchema.parse(config);
      expect(result).toMatchObject(config);
    });

    it('should apply defaults', () => {
      const config = new ConfigBuilder()
        .withChunks({})
        .build();
      
      expect(config.chunks?.chunkDuration).toBe(8);
      expect(config.chunks?.overlap).toBe(0.1);
    });

    it('should reject invalid chunk duration', () => {
      expect(() => {
        ChunkConfigSchema.parse({ chunkDuration: 0.05 });
      }).toThrow();
      
      expect(() => {
        ChunkConfigSchema.parse({ chunkDuration: 35 });
      }).toThrow();
    });

    it('should reject invalid overlap', () => {
      expect(() => {
        ChunkConfigSchema.parse({ overlap: -0.1 });
      }).toThrow();
      
      expect(() => {
        ChunkConfigSchema.parse({ overlap: 0.6 });
      }).toThrow();
    });
  });

  describe('Validation Functions', () => {
    it('validateConfig should throw on invalid config', () => {
      expect(() => {
        validateConfig({ bufferSize: 999 });
      }).toThrow();
    });

    it('validateConfig should return valid config', () => {
      const result = validateConfig({ logLevel: 'debug' });
      expect(result.logLevel).toBe('debug');
    });

    it('safeValidateConfig should return error result', () => {
      const result = safeValidateConfig({ bufferSize: 999 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('safeValidateConfig should return success result', () => {
      const result = safeValidateConfig({ logLevel: 'debug' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logLevel).toBe('debug');
      }
    });
  });

  describe('ConfigBuilder', () => {
    it('should build complete configuration', () => {
      const config = new ConfigBuilder()
        .withCore({ logLevel: 'debug', bufferSize: 2048 })
        .withChunks({ chunkDuration: 10 })
        .withAudio({ echoCancellation: false })
        .withWorker({ count: 4 })
        .withPerformance({ targetLatency: 50 })
        .build();

      expect(config.core?.logLevel).toBe('debug');
      expect(config.core?.bufferSize).toBe(2048);
      expect(config.chunks?.chunkDuration).toBe(10);
      expect(config.audio?.echoCancellation).toBe(false);
      expect(config.worker?.count).toBe(4);
      expect(config.performance?.targetLatency).toBe(50);
    });

    it('should handle buildSafe with valid config', () => {
      const result = new ConfigBuilder()
        .withCore({ logLevel: 'info' })
        .buildSafe();

      expect(result.success).toBe(true);
    });

    it('should handle buildSafe with invalid config', () => {
      const result = new ConfigBuilder()
        .withCore({ bufferSize: 999 as any })
        .buildSafe();

      expect(result.success).toBe(false);
    });
  });

  describe('ConfigPresets', () => {
    it('should have valid highQuality preset', () => {
      const preset = ConfigPresets.highQuality;
      expect(preset.core?.noiseReductionLevel).toBe('high');
      expect(preset.core?.bufferSize).toBe(2048);
      expect(preset.performance?.targetLatency).toBe(200);
    });

    it('should have valid lowLatency preset', () => {
      const preset = ConfigPresets.lowLatency;
      expect(preset.core?.noiseReductionLevel).toBe('low');
      expect(preset.core?.bufferSize).toBe(256);
      expect(preset.performance?.targetLatency).toBe(50);
    });

    it('should have valid balanced preset', () => {
      const preset = ConfigPresets.balanced;
      expect(preset.core?.noiseReductionLevel).toBe('medium');
      expect(preset.core?.bufferSize).toBe(512);
      expect(preset.performance?.targetLatency).toBe(100);
    });
  });
});
