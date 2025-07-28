/**
 * Configuration validation service with runtime type checking
 */

import { z } from 'zod';
import type { ILogger } from '../core/interfaces';
import { 
  MurmubaraConfigSchema, 
  ChunkConfigSchema,
  safeValidateConfig,
  validateConfig,
  validateChunkConfig,
  ValidatedMurmubaraConfig,
  ConfigBuilder,
  ConfigPresets
} from '../config/configSchema';
import type { MurmubaraConfig, ChunkConfig } from '../types';
import { Result, Ok, Err } from '../types/result';

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

export class ConfigValidationService {
  constructor(private logger?: ILogger) {}

  /**
   * Validate and merge configuration with defaults
   */
  validateAndMerge(
    userConfig?: Partial<MurmubaraConfig>
  ): Result<ValidatedMurmubaraConfig, ValidationError[]> {
    try {
      // Use the validateConfig function that applies defaults
      const validated = validateConfig(userConfig || {});
      
      this.logger?.debug('Configuration validated successfully', validated);
      return Ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = this.formatZodErrors(error);
        this.logger?.error('Configuration validation failed', validationErrors);
        return Err(validationErrors);
      }
      
      // Unknown error
      return Err([{
        path: [],
        message: error instanceof Error ? error.message : 'Unknown validation error',
        code: 'UNKNOWN_ERROR'
      }]);
    }
  }

  /**
   * Validate chunk configuration
   */
  validateChunkConfig(
    config?: Partial<ChunkConfig>
  ): Result<z.infer<typeof ChunkConfigSchema>, ValidationError[]> {
    try {
      const validated = validateChunkConfig(config || {});
      return Ok(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Err(this.formatZodErrors(error));
      }
      return Err([{
        path: [],
        message: 'Unknown validation error',
        code: 'UNKNOWN_ERROR'
      }]);
    }
  }

  /**
   * Get configuration preset
   */
  getPreset(preset: keyof typeof ConfigPresets) {
    return ConfigPresets[preset];
  }

  /**
   * Create custom configuration with builder
   */
  createConfig() {
    return new ConfigBuilder();
  }

  /**
   * Validate configuration at runtime
   */
  validateRuntime(config: unknown): config is ValidatedMurmubaraConfig {
    const result = safeValidateConfig(config);
    if (!result.success) {
      this.logger?.warn('Runtime configuration validation failed', 
        this.formatZodErrors(result.error)
      );
      return false;
    }
    return true;
  }

  /**
   * Format Zod errors into readable format
   */
  private formatZodErrors(error: z.ZodError): ValidationError[] {
    // Zod v4.0.10 compatibility - access issues array
    const issues = (error as any).issues || (error as any).errors || [];
    
    if (!Array.isArray(issues) || issues.length === 0) {
      return [{
        path: [],
        message: error?.message || 'Validation error',
        code: 'VALIDATION_ERROR'
      }];
    }
    
    return issues.map((err: any) => ({
      path: err.path?.map((p: any) => String(p)) || [],
      message: err.message || 'Validation error',
      code: err.code || 'custom'
    }));
  }

  /**
   * Get human-readable error messages
   */
  getErrorMessages(errors: ValidationError[]): string[] {
    return errors.map(err => {
      const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
      return `${path}${err.message}`;
    });
  }

  /**
   * Suggest fixes for common errors
   */
  suggestFixes(errors: ValidationError[]): string[] {
    const suggestions: string[] = [];
    
    for (const error of errors) {
      const field = error.path.join('.');
      
      switch (field) {
        case 'bufferSize':
          suggestions.push('Buffer size must be one of: 256, 512, 1024, 2048, 4096');
          break;
        case 'noiseReductionLevel':
          suggestions.push('Noise reduction level must be: low, medium, high, or auto');
          break;
        case 'workerCount':
          suggestions.push('Worker count must be between 1 and 8');
          break;
        case 'cleanupDelay':
          suggestions.push('Cleanup delay must be between 0 and 60000 milliseconds');
          break;
        default:
          if (error.code === 'invalid_type') {
            suggestions.push(`Field '${field}' has incorrect type`);
          }
      }
    }
    
    return suggestions;
  }
}

// Singleton instance
let validationService: ConfigValidationService | null = null;

export function getConfigValidator(logger?: ILogger): ConfigValidationService {
  if (!validationService) {
    validationService = new ConfigValidationService(logger);
  }
  return validationService;
}
