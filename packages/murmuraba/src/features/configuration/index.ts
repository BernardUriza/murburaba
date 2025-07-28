/**
 * Configuration Feature
 * 
 * Provides configuration validation, presets, and builder patterns
 * for the Murmuraba audio processing library.
 * 
 * @module features/configuration
 */

// Re-export schemas
export {
  // Schemas
  MurmubaraConfigSchema,
  ChunkConfigSchema,
  AudioConstraintsSchema,
  WorkerConfigSchema,
  PerformanceConfigSchema,
  CompleteConfigSchema,
  
  // Schema validators
  LogLevelSchema,
  NoiseReductionLevelSchema,
  AlgorithmSchema,
  BufferSizeSchema,
  
  // Validation functions
  validateConfig,
  safeValidateConfig,
  validateChunkConfig,
  safeValidateChunkConfig,
  
  // Builder
  ConfigBuilder,
  
  // Presets
  ConfigPresets,
} from './schemas/configSchema';

// Re-export services
export {
  ConfigValidationService,
  getConfigValidator,
  type ValidationError,
} from './services/ConfigValidationService';

// Re-export types
export type {
  ValidatedMurmubaraConfig,
  ValidatedChunkConfig,
  ValidatedAudioConstraints,
  ValidatedWorkerConfig,
  ValidatedPerformanceConfig,
  ValidatedCompleteConfig,
} from './schemas/configSchema';

// Import types for ConfigurationFeature
import type { ConfigValidationService as ConfigValidationServiceType } from './services/ConfigValidationService';
import type { ConfigPresets as ConfigPresetsType } from './schemas/configSchema';
import type { ConfigBuilder as ConfigBuilderType } from './schemas/configSchema';

// Feature-specific types
export type ConfigurationFeature = {
  validator: ConfigValidationServiceType;
  presets: typeof ConfigPresetsType;
  builder: typeof ConfigBuilderType;
};

/**
 * Get the complete configuration feature API
 * 
 * @example
 * ```typescript
 * import { getConfigurationFeature } from '@murmuraba/features/configuration';
 * 
 * const config = getConfigurationFeature();
 * const validated = config.validator.validateAndMerge(userConfig);
 * ```
 */
export function getConfigurationFeature(): ConfigurationFeature {
  const { getConfigValidator } = require('./services/ConfigValidationService');
  const { ConfigPresets, ConfigBuilder } = require('./schemas/configSchema');
  
  return {
    validator: getConfigValidator(),
    presets: ConfigPresets,
    builder: ConfigBuilder,
  };
}
