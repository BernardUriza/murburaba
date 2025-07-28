# Configuration Validation System

## Overview

Murmuraba uses Zod for runtime type validation of configuration objects. This ensures that:
- Invalid configurations are caught early with helpful error messages
- TypeScript types are automatically inferred from schemas
- Default values are applied consistently
- Configuration presets provide optimized settings for common use cases

## Basic Usage

### Using Configuration Presets

```typescript
import { MurmubaraEngineFactory } from 'murmuraba';

// High quality preset for best noise reduction
const engine = MurmubaraEngineFactory.createWithPreset('highQuality');

// Low latency preset for real-time applications
const engine = MurmubaraEngineFactory.createWithPreset('lowLatency');

// Balanced preset (default)
const engine = MurmubaraEngineFactory.createWithPreset('balanced');

// With overrides
const engine = MurmubaraEngineFactory.createWithPreset('highQuality', {
  logLevel: 'debug',
  enableAGC: true
});
```

### Manual Configuration

```typescript
import { MurmubaraEngineFactory } from 'murmuraba';

const config = {
  logLevel: 'info',
  noiseReductionLevel: 'high',
  bufferSize: 1024,
  algorithm: 'rnnoise',
  enableAGC: true,
  workerCount: 4
};

const engine = MurmubaraEngineFactory.create(config);
```

## Configuration Schema

### Core Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `logLevel` | `'none' \| 'error' \| 'warn' \| 'info' \| 'debug'` | `'info'` | Logging verbosity |
| `noiseReductionLevel` | `'low' \| 'medium' \| 'high' \| 'auto'` | `'medium'` | Noise reduction intensity |
| `bufferSize` | `256 \| 512 \| 1024 \| 2048 \| 4096` | `512` | Audio buffer size in samples |
| `algorithm` | `'rnnoise' \| 'spectral' \| 'adaptive'` | `'rnnoise'` | Noise reduction algorithm |
| `autoCleanup` | `boolean` | `true` | Automatically cleanup resources |
| `cleanupDelay` | `number` | `5000` | Delay before cleanup (ms) |
| `useWorker` | `boolean` | `true` | Use Web Workers for processing |
| `workerPath` | `string` | `undefined` | Custom worker script path |
| `allowDegraded` | `boolean` | `false` | Allow degraded mode |
| `enableAGC` | `boolean` | `false` | Enable automatic gain control |
| `workerCount` | `number` | `2` | Number of worker threads (1-8) |

### Chunk Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `chunkDuration` | `number` | `8` | Chunk duration in seconds (0.1-30) |
| `overlap` | `number` | `0.1` | Overlap between chunks (0-0.5) |
| `onChunkProcessed` | `function` | `undefined` | Chunk processing callback |

## Advanced Usage

### Configuration Builder

```typescript
import { getConfigValidator } from 'murmuraba';

const validator = getConfigValidator();
const config = validator.createConfig()
  .withCore({
    logLevel: 'debug',
    bufferSize: 2048
  })
  .withChunks({
    chunkDuration: 10,
    overlap: 0.2
  })
  .withPerformance({
    targetLatency: 50,
    adaptiveProcessing: true
  })
  .build();
```

### Validation with Error Handling

```typescript
import { getConfigValidator } from 'murmuraba';

const validator = getConfigValidator();
const userConfig = {
  bufferSize: 999, // Invalid
  workerCount: 10  // Too high
};

const result = validator.validateAndMerge(userConfig);

if (!result.ok) {
  const errors = validator.getErrorMessages(result.error);
  const suggestions = validator.suggestFixes(result.error);
  
  console.error('Configuration errors:', errors);
  console.log('Suggestions:', suggestions);
  // Output:
  // Configuration errors: [
  //   'bufferSize: Invalid union',
  //   'workerCount: Too high'
  // ]
  // Suggestions: [
  //   'Buffer size must be one of: 256, 512, 1024, 2048, 4096',
  //   'Worker count must be between 1 and 8'
  // ]
}
```

### Runtime Type Guards

```typescript
import { getConfigValidator } from 'murmuraba';

const validator = getConfigValidator();
const unknownConfig: unknown = await fetchConfigFromAPI();

// Type guard validation
if (validator.validateRuntime(unknownConfig)) {
  // TypeScript knows unknownConfig is ValidatedMurmubaraConfig
  const engine = MurmubaraEngineFactory.create(unknownConfig);
}
```

## Configuration Presets

### High Quality
```typescript
{
  noiseReductionLevel: 'high',
  bufferSize: 2048,
  algorithm: 'adaptive',
  targetLatency: 200,
  adaptiveProcessing: true
}
```
Best for: Offline processing, maximum quality

### Low Latency
```typescript
{
  noiseReductionLevel: 'low',
  bufferSize: 256,
  algorithm: 'rnnoise',
  targetLatency: 50,
  adaptiveProcessing: false
}
```
Best for: Real-time communication, live streaming

### Balanced (Default)
```typescript
{
  noiseReductionLevel: 'medium',
  bufferSize: 512,
  algorithm: 'rnnoise',
  targetLatency: 100,
  adaptiveProcessing: true
}
```
Best for: General purpose, good balance of quality and performance

## Error Messages and Suggestions

The validation system provides helpful error messages and suggestions:

```typescript
// Invalid buffer size
"Buffer size must be one of: 256, 512, 1024, 2048, 4096"

// Invalid noise reduction level  
"Noise reduction level must be: low, medium, high, or auto"

// Worker count out of range
"Worker count must be between 1 and 8"

// Cleanup delay out of range
"Cleanup delay must be between 0 and 60000 milliseconds"
```

## TypeScript Support

All configuration types are fully typed:

```typescript
import type {
  ValidatedMurmubaraConfig,
  ValidatedChunkConfig,
  ValidatedCompleteConfig,
  ValidationError
} from 'murmuraba';

// Use types in your code
function processAudio(config: ValidatedMurmubaraConfig) {
  // TypeScript knows all properties and their types
  if (config.enableAGC) {
    // ...
  }
}
```

## Best Practices

1. **Use Presets**: Start with a preset and override only what you need
2. **Validate Early**: Validate configuration before creating engines
3. **Handle Errors**: Always check validation results and provide feedback
4. **Type Safety**: Use TypeScript types for compile-time safety
5. **Defaults**: Rely on defaults unless you have specific requirements

## Migration Guide

If you're upgrading from a version without configuration validation:

1. Your existing configurations will continue to work
2. Invalid values will now throw errors with helpful messages
3. Consider using presets for optimal settings
4. Add error handling for configuration validation

```typescript
// Before
const engine = new MurmubaraEngine({
  bufferSize: 1000 // Would silently use default
});

// After
try {
  const engine = MurmubaraEngineFactory.create({
    bufferSize: 1000 // Will throw with helpful error
  });
} catch (error) {
  console.error('Configuration error:', error.message);
  // "Configuration validation failed:
  //  bufferSize: Invalid union
  //  
  //  Suggestions:
  //  Buffer size must be one of: 256, 512, 1024, 2048, 4096"
}
```
