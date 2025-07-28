/**
 * Example: Configuration validation with Zod
 */

import {
  MurmubaraEngineFactory,
  ConfigBuilder,
  ConfigPresets,
  getConfigValidator,
  MurmubaraEngine,
} from '../src';

// Example 1: Using configuration presets
function usePresetExample() {
  console.log('\n=== Using Configuration Presets ===');
  
  // Create engine with high quality preset
  const highQualityEngine = MurmubaraEngineFactory.createWithPreset(
    'highQuality',
    { logLevel: 'debug' } // Optional overrides
  );
  
  console.log('Created engine with high quality preset');
  
  // Create engine with low latency preset
  const lowLatencyEngine = MurmubaraEngineFactory.createWithPreset('lowLatency');
  
  console.log('Created engine with low latency preset');
}

// Example 2: Building custom configuration
function customConfigExample() {
  console.log('\n=== Building Custom Configuration ===');
  
  const validator = getConfigValidator();
  const customConfig = validator.createConfig()
    .withCore({
      logLevel: 'info',
      noiseReductionLevel: 'high',
      bufferSize: 2048,
      enableAGC: true,
    })
    .withPerformance({
      targetLatency: 150,
      adaptiveProcessing: true,
    })
    .build();
  
  console.log('Custom configuration:', customConfig);
}

// Example 3: Validating user-provided configuration
function validateUserConfigExample() {
  console.log('\n=== Validating User Configuration ===');
  
  const validator = getConfigValidator();
  
  // Valid configuration
  const validConfig = {
    logLevel: 'debug' as const,
    bufferSize: 1024 as const,
    workerCount: 4,
  };
  
  const validResult = validator.validateAndMerge(validConfig);
  if (validResult.ok) {
    console.log('Valid configuration:', validResult.value);
  }
  
  // Invalid configuration
  const invalidConfig = {
    logLevel: 'verbose' as any, // Invalid log level
    bufferSize: 999, // Invalid buffer size
    workerCount: 10, // Too many workers
  };
  
  const invalidResult = validator.validateAndMerge(invalidConfig);
  if (!invalidResult.ok) {
    console.log('\nInvalid configuration detected:');
    const messages = validator.getErrorMessages(invalidResult.error);
    const suggestions = validator.suggestFixes(invalidResult.error);
    
    console.log('Errors:', messages);
    console.log('Suggestions:', suggestions);
  }
}

// Example 4: Safe configuration validation
function safeValidationExample() {
  console.log('\n=== Safe Configuration Validation ===');
  
  const userInput = {
    bufferSize: 512,
    algorithm: 'rnnoise' as const,
  };
  
  // Validate before creating engine
  if (MurmubaraEngineFactory.validateConfig(userInput)) {
    const engine = MurmubaraEngineFactory.create(userInput);
    console.log('Engine created with validated configuration');
  } else {
    console.log('Configuration validation failed');
  }
}

// Example 5: Runtime configuration validation
function runtimeValidationExample() {
  console.log('\n=== Runtime Configuration Validation ===');
  
  const validator = getConfigValidator();
  
  // Simulate configuration from external source
  const externalConfig: unknown = {
    logLevel: 'info',
    bufferSize: 512,
    enableAGC: true,
  };
  
  // Type guard validation
  if (validator.validateRuntime(externalConfig)) {
    // TypeScript now knows externalConfig is ValidatedMurmubaraConfig
    const engine = MurmubaraEngineFactory.create(externalConfig);
    console.log('Runtime configuration validated and applied');
  }
}

// Run all examples
function runExamples() {
  try {
    usePresetExample();
    customConfigExample();
    validateUserConfigExample();
    safeValidationExample();
    runtimeValidationExample();
  } catch (error) {
    console.error('Example error:', error);
  }
}

// Execute if running directly
if (require.main === module) {
  runExamples();
}

export { runExamples };
