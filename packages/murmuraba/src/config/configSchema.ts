/**
 * Configuration validation schemas using Zod
 */

import { z } from 'zod';
import type { LogLevel, NoiseReductionLevel, Algorithm, BufferSize } from '../types';

// Enum schemas
export const LogLevelSchema = z.enum(['none', 'error', 'warn', 'info', 'debug']);
export const NoiseReductionLevelSchema = z.enum(['low', 'medium', 'high', 'auto']);
export const AlgorithmSchema = z.enum(['rnnoise', 'spectral', 'adaptive']);
export const BufferSizeSchema = z.union([
  z.literal(256),
  z.literal(512),
  z.literal(1024),
  z.literal(2048),
  z.literal(4096),
]);

// Main configuration schema
export const MurmubaraConfigSchema = z.object({
  logLevel: LogLevelSchema.optional(),
  onLog: z.any().optional(), // Function validation not available in v4.0.10
  noiseReductionLevel: NoiseReductionLevelSchema.optional(),
  bufferSize: BufferSizeSchema.optional(),
  algorithm: AlgorithmSchema.optional(),
  autoCleanup: z.boolean().optional(),
  cleanupDelay: z.number().min(0).max(60000).optional(),
  useWorker: z.boolean().optional(),
  workerPath: z.string().optional(),
  allowDegraded: z.boolean().optional(),
  enableAGC: z.boolean().optional(),
  workerCount: z.number().min(1).max(8).optional(),
});

// Chunk configuration schema
export const ChunkConfigSchema = z.object({
  chunkDuration: z.number().min(0.1).max(30).optional(),
  onChunkProcessed: z.any().optional(), // Function validation not available in v4.0.10
  overlap: z.number().min(0).max(0.5).optional(),
});

// Audio constraints schema
export const AudioConstraintsSchema = z.object({
  echoCancellation: z.boolean().optional(),
  noiseSuppression: z.boolean().optional(),
  autoGainControl: z.boolean().optional(),
  sampleRate: z.number().min(8000).max(96000).optional(),
  channelCount: z.number().min(1).max(2).optional(),
});

// Worker configuration schema
export const WorkerConfigSchema = z.object({
  enabled: z.boolean().optional(),
  path: z.string().optional(),
  count: z.number().min(1).max(8).optional(),
  timeout: z.number().min(1000).max(30000).optional(),
  retryAttempts: z.number().min(0).max(5).optional(),
});

// Performance configuration schema
export const PerformanceConfigSchema = z.object({
  targetLatency: z.number().min(10).max(500).optional(),
  adaptiveProcessing: z.boolean().optional(),
  cpuThrottling: z.boolean().optional(),
  memoryLimit: z.number().min(10).max(1000).optional(), // MB
});

// Complete configuration schema with all sections
export const CompleteConfigSchema = z.object({
  core: MurmubaraConfigSchema.optional(),
  chunks: ChunkConfigSchema.optional(),
  audio: AudioConstraintsSchema.optional(),
  worker: WorkerConfigSchema.optional(),
  performance: PerformanceConfigSchema.optional(),
});

// Type exports
export type ValidatedMurmubaraConfig = z.infer<typeof MurmubaraConfigSchema>;
export type ValidatedChunkConfig = z.infer<typeof ChunkConfigSchema>;
export type ValidatedAudioConstraints = z.infer<typeof AudioConstraintsSchema>;
export type ValidatedWorkerConfig = z.infer<typeof WorkerConfigSchema>;
export type ValidatedPerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type ValidatedCompleteConfig = z.infer<typeof CompleteConfigSchema>;

// Default values
const DEFAULT_CONFIG = {
  logLevel: 'info' as const,
  noiseReductionLevel: 'medium' as const,
  bufferSize: 512 as const,
  algorithm: 'rnnoise' as const,
  autoCleanup: true,
  cleanupDelay: 5000,
  useWorker: true,
  allowDegraded: false,
  enableAGC: false,
  workerCount: 2,
};

const DEFAULT_CHUNK_CONFIG = {
  chunkDuration: 8,
  overlap: 0.1,
};

const DEFAULT_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false,
  channelCount: 1,
};

const DEFAULT_WORKER_CONFIG = {
  enabled: true,
  count: 2,
  timeout: 10000,
  retryAttempts: 3,
};

const DEFAULT_PERFORMANCE_CONFIG = {
  targetLatency: 100,
  adaptiveProcessing: true,
  cpuThrottling: false,
};

// Validation functions
export function validateConfig(config: unknown): ValidatedMurmubaraConfig {
  const parsed = MurmubaraConfigSchema.parse(config);
  return { ...DEFAULT_CONFIG, ...parsed };
}

export function safeValidateConfig(config: unknown): 
  { success: true; data: ValidatedMurmubaraConfig } | 
  { success: false; error: z.ZodError } {
  try {
    const parsed = MurmubaraConfigSchema.parse(config);
    return { success: true, data: { ...DEFAULT_CONFIG, ...parsed } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    // Return a generic error for non-Zod errors
    return { success: false, error: error as z.ZodError };
  }
}

// Chunk configuration validation
export function validateChunkConfig(config: unknown): ValidatedChunkConfig {
  const parsed = ChunkConfigSchema.parse(config);
  return { ...DEFAULT_CHUNK_CONFIG, ...parsed };
}

export function safeValidateChunkConfig(config: unknown): 
  { success: true; data: ValidatedChunkConfig } | 
  { success: false; error: z.ZodError } {
  try {
    const parsed = ChunkConfigSchema.parse(config);
    return { success: true, data: { ...DEFAULT_CHUNK_CONFIG, ...parsed } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    // Return a generic error for non-Zod errors
    return { success: false, error: error as z.ZodError };
  }
}

// Config builder with fluent API
export class ConfigBuilder {
  private config: Partial<ValidatedCompleteConfig> = {};

  withCore(config: Partial<ValidatedMurmubaraConfig>): this {
    if (!this.config.core) {
      this.config.core = {};
    }
    this.config.core = { ...this.config.core, ...config };
    return this;
  }

  withChunks(config: Partial<ValidatedChunkConfig>): this {
    this.config.chunks = { ...this.config.chunks, ...config };
    return this;
  }

  withAudio(config: Partial<ValidatedAudioConstraints>): this {
    this.config.audio = { ...this.config.audio, ...config };
    return this;
  }

  withWorker(config: Partial<ValidatedWorkerConfig>): this {
    this.config.worker = { ...this.config.worker, ...config };
    return this;
  }

  withPerformance(config: Partial<ValidatedPerformanceConfig>): this {
    this.config.performance = { ...this.config.performance, ...config };
    return this;
  }

  build(): ValidatedCompleteConfig {
    const parsed = CompleteConfigSchema.parse(this.config);
    return {
      core: { ...DEFAULT_CONFIG, ...parsed.core },
      chunks: parsed.chunks ? { ...DEFAULT_CHUNK_CONFIG, ...parsed.chunks } : undefined,
      audio: parsed.audio ? { ...DEFAULT_AUDIO_CONSTRAINTS, ...parsed.audio } : undefined,
      worker: parsed.worker ? { ...DEFAULT_WORKER_CONFIG, ...parsed.worker } : undefined,
      performance: parsed.performance ? { ...DEFAULT_PERFORMANCE_CONFIG, ...parsed.performance } : undefined,
    };
  }

  buildSafe(): 
    { success: true; data: ValidatedCompleteConfig } | 
    { success: false; error: z.ZodError } {
    const result = CompleteConfigSchema.safeParse(this.config);
    if (result.success) {
      const data = {
        core: { ...DEFAULT_CONFIG, ...result.data.core },
        chunks: result.data.chunks ? { ...DEFAULT_CHUNK_CONFIG, ...result.data.chunks } : undefined,
        audio: result.data.audio ? { ...DEFAULT_AUDIO_CONSTRAINTS, ...result.data.audio } : undefined,
        worker: result.data.worker ? { ...DEFAULT_WORKER_CONFIG, ...result.data.worker } : undefined,
        performance: result.data.performance ? { ...DEFAULT_PERFORMANCE_CONFIG, ...result.data.performance } : undefined,
      };
      return { success: true, data };
    }
    return { success: false, error: result.error };
  }
}

// Preset configurations
export const ConfigPresets = {
  highQuality: new ConfigBuilder()
    .withCore({
      noiseReductionLevel: 'high',
      bufferSize: 2048,
      algorithm: 'adaptive',
    })
    .withPerformance({
      targetLatency: 200,
      adaptiveProcessing: true,
    })
    .build(),

  lowLatency: new ConfigBuilder()
    .withCore({
      noiseReductionLevel: 'low',
      bufferSize: 256,
      algorithm: 'rnnoise',
    })
    .withPerformance({
      targetLatency: 50,
      adaptiveProcessing: false,
    })
    .build(),

  balanced: new ConfigBuilder()
    .withCore({
      noiseReductionLevel: 'medium',
      bufferSize: 512,
      algorithm: 'rnnoise',
    })
    .withPerformance({
      targetLatency: 100,
      adaptiveProcessing: true,
    })
    .build(),
} as const;
