# Murmuraba 🔊

Real-time audio noise reduction for web applications with advanced chunked processing.

[![npm version](https://badge.fury.io/js/murmuraba.svg)](https://www.npmjs.com/package/murmuraba)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features ✨

- 🎯 **Real-time noise reduction** using RNNoise neural network
- 📦 **Chunked processing** for streaming applications
- ⏸️ **Full stream control** - pause, resume, stop
- 📊 **Real-time metrics** with callbacks
- 🧹 **Automatic cleanup** after inactivity
- 🔧 **Configurable logging** and noise reduction levels
- 💾 **Low memory footprint** with WebAssembly
- 🎛️ **Advanced configuration** options
- 🚀 **Zero dependencies** (except for RNNoise WASM)

## What's New in v1.2.0 🎉

- **Chunked Processing**: Process audio in configurable chunks with detailed metrics
- **Enhanced API**: Complete stream control with pause/resume functionality
- **Better Cleanup**: Proper destruction of all resources including workers
- **Real-time Metrics**: Get continuous updates on noise reduction performance
- **State Management**: Clear engine states with proper transitions
- **Error Handling**: Specific error codes for better debugging

## Installation

```bash
npm install murmuraba
# or
yarn add murmuraba
# or
pnpm add murmuraba
```

## Quick Start

```typescript
import { initializeAudioEngine, processStream } from 'murmuraba';

// Initialize the engine
await initializeAudioEngine({
  logLevel: 'info',
  noiseReductionLevel: 'high'
});

// Get user's microphone
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// Process the stream
const controller = await processStream(stream);

// Use the processed stream
const processedStream = controller.stream;

// Control the stream
controller.pause();   // Pause processing
controller.resume();  // Resume processing
controller.stop();    // Stop and cleanup
```

## React Hook Usage

```tsx
import { useMurmubaraEngine } from 'murmuraba';

function AudioComponent() {
  const {
    isInitialized,
    isLoading,
    error,
    metrics,
    processStream,
    processStreamChunked
  } = useMurmubaraEngine({
    autoInitialize: true,
    noiseReductionLevel: 'high'
  });

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Option 1: Simple processing
    const controller = await processStream(stream);
    
    // Option 2: Chunked processing with callbacks
    const controller = await processStreamChunked(stream, {
      chunkDuration: 5000, // 5 seconds
      onChunkProcessed: (chunk) => {
        console.log(`Noise removed: ${chunk.noiseRemoved}%`);
      }
    });
  };

  return (
    <div>
      {metrics && (
        <div>
          Noise Reduction: {metrics.noiseReductionLevel.toFixed(1)}%
          Latency: {metrics.processingLatency.toFixed(2)}ms
        </div>
      )}
    </div>
  );
}
```

## Configuration Options

```typescript
interface MurmubaraConfig {
  // Logging
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  onLog?: (level: LogLevel, message: string) => void;
  
  // Processing
  noiseReductionLevel?: 'low' | 'medium' | 'high' | 'auto';
  bufferSize?: 256 | 512 | 1024 | 2048 | 4096;
  algorithm?: 'rnnoise' | 'spectral' | 'adaptive';
  
  // Resource management
  autoCleanup?: boolean;
  cleanupDelay?: number; // ms
  
  // Advanced
  useWorker?: boolean;
  workerPath?: string;
}
```

## Chunked Processing

Process audio in chunks for better control and metrics:

```typescript
const controller = await processStreamChunked(stream, {
  chunkDuration: 4000, // 4 seconds per chunk
  onChunkProcessed: (chunk) => {
    console.log({
      duration: chunk.duration,
      noiseRemoved: chunk.noiseRemoved,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      metrics: chunk.metrics
    });
  }
});
```

## API Reference

### Core Functions

#### `initializeAudioEngine(config?: MurmubaraConfig): Promise<void>`
Initialize the global audio engine instance.

#### `processStream(stream: MediaStream): Promise<StreamController>`
Process a MediaStream with noise reduction.

#### `processStreamChunked(stream: MediaStream, config: ChunkConfig): Promise<StreamController>`
Process a MediaStream in chunks with callbacks.

#### `destroyEngine(options?: { force?: boolean }): Promise<void>`
Destroy the engine and cleanup all resources.

#### `getEngineStatus(): EngineState`
Get the current engine state.

#### `getDiagnostics(): DiagnosticInfo`
Get detailed diagnostics information.

### StreamController

```typescript
interface StreamController {
  stream: MediaStream;      // Processed audio stream
  stop(): void;            // Stop processing
  pause(): void;           // Pause processing
  resume(): void;          // Resume processing
  getState(): EngineState; // Get current state
}
```

### Metrics

```typescript
interface ProcessingMetrics {
  noiseReductionLevel: number;  // 0-100%
  processingLatency: number;    // milliseconds
  inputLevel: number;           // 0-1
  outputLevel: number;          // 0-1
  timestamp: number;
  frameCount: number;
  droppedFrames: number;
}
```

## Browser Requirements

- Web Audio API support
- WebAssembly support
- Modern browser (Chrome 66+, Firefox 60+, Safari 11.1+, Edge 79+)

## Performance Tips

1. Use appropriate buffer sizes:
   - Lower latency: 256 or 512
   - Better performance: 2048 or 4096

2. Configure noise reduction level based on your needs:
   - `low`: Minimal processing, lowest latency
   - `medium`: Balanced (default)
   - `high`: Maximum noise reduction

3. Enable auto-cleanup to free resources when inactive

## Migration from v0.x

```typescript
// Old API
const { processStream, cleanup } = useAudioEngine();
cleanup(); // Didn't work properly

// New API
const { processStream, destroy } = useMurmubaraEngine();
const controller = await processStream(stream);
controller.stop(); // Works perfectly!
await destroy(true); // Complete cleanup
```

## License

MIT © Murmuraba Team

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- 🐛 [Report bugs](https://github.com/bernarducs/murmuraba/issues)
- 💡 [Request features](https://github.com/bernarducs/murmuraba/issues)
- 📖 [Documentation](https://github.com/bernarducs/murmuraba/wiki)