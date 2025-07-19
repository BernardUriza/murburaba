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

### Important: WebAssembly Files

Murmuraba uses WebAssembly for audio processing. After installing, you need to serve the WASM files from your public directory:

1. Copy the WASM files from `node_modules/murmuraba/dist/wasm/` to your public directory
2. Copy `rnnoise-fixed.js` from `node_modules/murmuraba/dist/` to your public directory
3. Ensure these files are accessible at runtime (e.g., `/rnnoise-fixed.js` and `/dist/*.wasm`)

## Quick Start

### React Hook Usage

The simplest way to use Murmuraba in a React application:

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

### Direct API Usage (Advanced)

For more control over the audio processing pipeline:

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

## Package Architecture

Murmuraba is designed with a modular architecture:

```
murmuraba/
├── engines/          # Audio processing engines
│   ├── RNNoiseEngine # Neural network noise reduction
│   └── (future)      # Speex, WebRTC VAD, custom engines
├── hooks/           # React integration
│   └── useAudioEngine
└── utils/           # Core utilities
    ├── MurmurabaProcessor  # Low-level audio processor
    └── AudioStreamManager  # Stream management utilities
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

## Common Issues

### CORS Issues with WASM Files
Make sure your server is configured to serve WASM files with the correct MIME type:
```
application/wasm
```

### Audio Context Restrictions
Modern browsers require user interaction before creating audio contexts. Always initialize the audio engine in response to a user action (click, tap, etc.).

### Sample Rate Compatibility
RNNoise works best at 48kHz. The library automatically handles sample rate conversion, but for best results, use 48kHz when possible.

## License

MIT © Bernard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Complete Integration Example

Here's a complete example of integrating Murmuraba in a Next.js application:

```tsx
// pages/audio-recorder.tsx
import { useState } from 'react';
import { useAudioEngine } from 'murmuraba';

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const {
    isInitialized,
    isLoading,
    error,
    processStream,
    initializeAudioEngine,
    getMetrics
  } = useAudioEngine({ engineType: 'rnnoise' });

  const startRecording = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: false, // We'll use our own
          autoGainControl: true
        } 
      });
      
      // Process with Murmuraba
      const processedStream = await processStream(stream);
      
      // Create recorder with processed stream
      const mediaRecorder = new MediaRecorder(processedStream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Get processing metrics
        const metrics = getMetrics();
        console.log('Noise reduced by:', metrics.noiseReductionLevel + '%');
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Stop after 5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      }, 5000);
      
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      <h1>Murmuraba Audio Recorder</h1>
      
      {error && <p style={{color: 'red'}}>{error}</p>}
      
      {!isInitialized ? (
        <button onClick={initializeAudioEngine} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Initialize Audio Engine'}
        </button>
      ) : (
        <button onClick={startRecording} disabled={isRecording}>
          {isRecording ? 'Recording...' : 'Start Recording (5s)'}
        </button>
      )}
      
      {audioUrl && (
        <div>
          <h3>Processed Audio:</h3>
          <audio controls src={audioUrl} />
        </div>
      )}
    </div>
  );
}
```

## Acknowledgments

- RNNoise by Jean-Marc Valin
- WebAssembly audio processing techniques