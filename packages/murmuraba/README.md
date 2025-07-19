# Murmuraba

> Modular audio processing library with real-time noise reduction for web applications

[![npm version](https://img.shields.io/npm/v/murmuraba.svg)](https://www.npmjs.com/package/murmuraba)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎯 **Real-time audio processing** - Process audio streams with minimal latency
- 🔇 **Neural noise reduction** - Powered by RNNoise neural network
- 🔌 **Modular architecture** - Easy to extend with new audio engines
- ⚛️ **React hooks** - Simple integration with React applications
- 📦 **TypeScript support** - Full type definitions included
- 🌐 **WebAssembly powered** - High-performance audio processing

## Installation

```bash
npm install murmuraba
```

or

```bash
yarn add murmuraba
```

## Quick Start

### React Hook Usage

```tsx
import { useAudioEngine } from 'murmuraba';

function AudioRecorder() {
  const {
    isInitialized,
    isLoading,
    error,
    processStream,
    initializeAudioEngine,
    getMetrics
  } = useAudioEngine();

  const handleStartRecording = async () => {
    // Get user media
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Process stream with noise reduction
    const processedStream = await processStream(stream);
    
    // Use the processed stream
    const audio = new Audio();
    audio.srcObject = processedStream;
  };

  return (
    <div>
      {!isInitialized && (
        <button onClick={initializeAudioEngine} disabled={isLoading}>
          {isLoading ? 'Initializing...' : 'Initialize Audio Engine'}
        </button>
      )}
      {isInitialized && (
        <button onClick={handleStartRecording}>
          Start Recording with Noise Reduction
        </button>
      )}
    </div>
  );
}
```

### Direct API Usage

```typescript
import { createAudioEngine, MurmurabaProcessor } from 'murmuraba';

// Create an audio engine
const engine = createAudioEngine({ engineType: 'rnnoise' });

// Initialize the processor
const processor = new MurmurabaProcessor();
await processor.initialize(engine);

// Process a media stream
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const destination = processor.connectStream(stream);
const processedStream = destination.stream;

// Get processing metrics
const metrics = processor.getMetrics();
console.log(`Noise reduction: ${metrics.noiseReductionLevel}%`);
```

## Available Engines

### RNNoise (Default)
Neural network-based noise suppression that works well for removing background noise while preserving speech.

```typescript
const engine = createAudioEngine({ engineType: 'rnnoise' });
```

### Coming Soon
- **Speex** - Traditional DSP-based noise reduction
- **Custom** - Implement your own audio processing engine

## Creating Custom Engines

You can create custom audio engines by implementing the `AudioEngine` interface:

```typescript
import { AudioEngine } from 'murmuraba';

class MyCustomEngine implements AudioEngine {
  name = 'MyEngine';
  description = 'Custom audio processing engine';
  isInitialized = false;

  async initialize(): Promise<void> {
    // Initialize your engine
    this.isInitialized = true;
  }

  process(inputBuffer: Float32Array): Float32Array {
    // Process audio frames
    return inputBuffer; // Return processed audio
  }

  cleanup(): void {
    // Clean up resources
    this.isInitialized = false;
  }
}
```

## API Reference

### `useAudioEngine(config?)`

React hook for audio processing.

**Parameters:**
- `config` (optional): `AudioEngineConfig`
  - `engineType`: 'rnnoise' | 'speex' | 'custom'
  - `options`: Engine-specific options

**Returns:**
- `isInitialized`: boolean
- `isLoading`: boolean
- `error`: string | null
- `processStream(stream: MediaStream)`: Promise<MediaStream>
- `initializeAudioEngine()`: Promise<void>
- `getMetrics()`: ProcessingMetrics
- `cleanup()`: void

### `MurmurabaProcessor`

Low-level audio processor class.

**Methods:**
- `initialize(engine: AudioEngine, sampleRate?: number)`: Promise<void>
- `connectStream(stream: MediaStream)`: MediaStreamAudioDestinationNode
- `getMetrics()`: ProcessingMetrics
- `resetMetrics()`: void
- `cleanup()`: void

### `ProcessingMetrics`

```typescript
interface ProcessingMetrics {
  inputSamples: number;
  outputSamples: number;
  noiseReductionLevel: number; // 0-100%
  silenceFrames: number;
  activeFrames: number;
  averageInputEnergy: number;
  averageOutputEnergy: number;
  peakInputLevel: number;
  peakOutputLevel: number;
  processingTimeMs: number;
  totalFramesProcessed: number;
}
```

## Browser Support

- Chrome 66+
- Firefox 62+
- Safari 14.1+
- Edge 79+

WebAssembly and Web Audio API support required.

## License

MIT © Bernard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- RNNoise by Jean-Marc Valin
- WebAssembly audio processing techniques