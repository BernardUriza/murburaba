# 🚀 Murmuraba - Enterprise-Grade Audio Processing Suite

[![npm version](https://badge.fury.io/js/murmuraba.svg)](https://www.npmjs.com/package/murmuraba)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Murmuraba** is a modern, dependency-injection based audio processing library for React applications. Built with a robust architecture using `MurmurabaSuite`, it provides real-time noise reduction, audio chunking, and comprehensive Voice Activity Detection (VAD) analysis.

## 🌟 Key Features

- **🏗️ Dependency Injection Architecture**: Modern DI-based design with `MurmurabaSuite` for flexible service management
- **🎯 Advanced Audio Chunking**: Process audio files or streams into configurable chunks with precise timing
- **📊 Real-time VAD Analysis**: Voice Activity Detection with per-chunk metrics and visualization support
- **🔊 Multi-format Support**: Process WAV, WebM, and raw audio formats with automatic conversion
- **🎙️ Neural Network Noise Reduction**: RNNoise-powered WebAssembly engine for superior noise suppression
- **⚡ Stream & File Processing**: Unified API for both file uploads and real-time microphone recording
- **🛡️ Full TypeScript Support**: Complete type safety with comprehensive interfaces
- **📈 Progress & Metrics Tracking**: Real-time callbacks for processing progress and performance metrics

## Installation

```bash
npm install murmuraba
# or
yarn add murmuraba
# or  
pnpm add murmuraba
```

## 🏗️ Architecture Overview

Murmuraba uses a modern Dependency Injection (DI) architecture centered around the `MurmurabaSuite` component:

```
┌─────────────────────────────────────────┐
│          MurmurabaSuite                 │
│  ┌────────────────────────────────┐     │
│  │     DIContainer                │     │
│  │  ┌──────────────────────────┐  │     │
│  │  │  AudioProcessorService   │  │     │
│  │  │  MetricsManager          │  │     │
│  │  │  Logger                  │  │     │
│  │  │  StateManager            │  │     │
│  │  │  WorkerManager           │  │     │
│  │  └──────────────────────────┘  │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

## 🎯 Core Components

### MurmurabaSuite - The Foundation

The `MurmurabaSuite` component is the core of Murmuraba's architecture. It manages the DI container, service initialization, and provides React context for all child components.

```typescript
import { MurmurabaSuite } from 'murmuraba';

function App() {
  return (
    <MurmurabaSuite
      algorithm="rnnoise"          // Audio processing algorithm
      logLevel="info"              // Logging verbosity
      allowDegraded={true}         // Allow degraded mode if WASM fails
      initTimeout={6000}           // Engine initialization timeout (ms)
      services={{
        audioProcessor: true,      // Enable audio processor service
        metricsManager: true,      // Enable metrics tracking
        workerManager: false       // Disable web workers
      }}
    >
      <YourApp />
    </MurmurabaSuite>
  );
}
```

### useMurmurabaSuite Hook - Access the Suite

The primary hook for accessing the DI container and suite functionality:

```typescript
import { useMurmurabaSuite, SUITE_TOKENS } from 'murmuraba';

function Component() {
  const { container, isReady, error, getService } = useMurmurabaSuite();
  
  if (!isReady) return <div>Initializing audio engine...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  // Get services directly
  const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor);
  
  return <div>Engine ready!</div>;
}
```

## 🚀 Quick Start Example

```typescript
import React from 'react';
import { MurmurabaSuite, useAudioProcessor } from 'murmuraba';

// Step 1: Wrap your app with MurmurabaSuite
function App() {
  return (
    <MurmurabaSuite algorithm="rnnoise" logLevel="info">
      <AudioProcessorDemo />
    </MurmurabaSuite>
  );
}

// Step 2: Use the audio processor in your components
function AudioProcessorDemo() {
  const { isReady, processFile, processRecording } = useAudioProcessor();
  const [chunks, setChunks] = React.useState([]);
  
  if (!isReady) return <div>Initializing...</div>;
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const result = await processFile(file, {
      chunkDuration: 8,           // 8-second chunks
      enableAGC: true,            // Auto Gain Control
      outputFormat: 'wav'         // Output format
    });
    
    setChunks(result.chunks);
  };
  
  const handleRecording = async () => {
    // Record for 30 seconds
    const result = await processRecording(30000, {
      chunkDuration: 8,
      enableAGC: false
    });
    
    setChunks(result.chunks);
  };
  
  return (
    <div>
      <input type="file" onChange={handleFileUpload} accept="audio/*" />
      <button onClick={handleRecording}>Record Audio</button>
      
      {chunks.map((chunk, idx) => (
        <div key={chunk.id}>
          <h4>Chunk {idx + 1}</h4>
          <audio src={chunk.processedAudioUrl} controls />
          <p>VAD Score: {(chunk.vadScore * 100).toFixed(1)}%</p>
          <p>Duration: {(chunk.duration / 1000).toFixed(2)}s</p>
        </div>
      ))}
    </div>
  );
}
```

## 📚 API Reference

### MurmurabaSuite Component

```typescript
interface MurmurabaSuiteConfig {
  // Engine configuration
  algorithm?: 'rnnoise' | 'spectral' | 'adaptive';
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  bufferSize?: 256 | 512 | 1024 | 2048 | 4096;
  noiseReductionLevel?: 'low' | 'medium' | 'high' | 'auto';
  
  // Suite configuration
  services?: {
    audioProcessor?: boolean;
    metricsManager?: boolean;
    workerManager?: boolean;
  };
  lazy?: boolean;              // Lazy load services (default: true)
  allowDegraded?: boolean;     // Allow degraded mode (default: true)
  initTimeout?: number;        // Initialization timeout in ms (default: 6000)
  
  // React props
  children?: ReactNode;
  onUserInteraction?: () => void;  // Callback for AudioContext resume
}
```

### IAudioProcessor Interface

The core audio processing interface exposed by the AudioProcessorService:

```typescript
interface IAudioProcessor {
  // Process audio file or ArrayBuffer
  processFile(
    file: File | ArrayBuffer,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult>;
  
  // Process MediaStream (real-time)
  processStream(
    stream: MediaStream,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult>;
  
  // Record and process from microphone
  processRecording(
    duration: number,                    // Duration in milliseconds
    options?: AudioProcessingOptions & { 
      stream?: MediaStream              // Optional existing stream
    }
  ): Promise<AudioProcessingResult>;
  
  // Event subscriptions (returns unsubscribe function)
  onProgress(callback: (progress: number) => void): () => void;
  onMetrics(callback: (metrics: ProcessingMetrics) => void): () => void;
  onChunk(callback: (chunk: ProcessedChunk) => void): () => void;
  
  // Control methods
  cancel(): void;
  isProcessing(): boolean;
}
```

### AudioProcessingOptions

```typescript
interface AudioProcessingOptions {
  enableVAD?: boolean;              // Enable Voice Activity Detection
  chunkDuration?: number;           // Chunk duration in seconds (default: 8)
  outputFormat?: 'wav' | 'webm' | 'raw';  // Output format
  enableAGC?: boolean;              // Enable Automatic Gain Control
  noiseReductionLevel?: 'low' | 'medium' | 'high' | 'auto';
}
```

### Core Type Definitions

```typescript
interface ProcessedChunk {
  id: string;                      // Unique chunk identifier
  blob?: Blob;                     // Audio blob (may be undefined during processing)
  startTime: number;               // Start timestamp in seconds
  endTime: number;                 // End timestamp in seconds
  duration: number;                // Duration in seconds
  vadScore: number;                // Voice Activity Detection score (0-1)
  averageVad: number;              // Average VAD score for the chunk
  
  // URLs for playback
  processedAudioUrl?: string;      // URL for processed audio
  originalAudioUrl?: string;       // URL for original audio
  
  // VAD timeline data
  vadData: Array<{
    time: number;                  // Time offset in chunk
    vad: number;                   // VAD value at this time
  }>;
  
  // Processing metrics
  metrics: ProcessingMetrics;
  originalSize: number;            // Original size in bytes
  processedSize: number;           // Processed size in bytes
  noiseRemoved: number;            // Noise reduction percentage (0-1)
  
  // UI state
  isPlaying: boolean;
  isValid?: boolean;
  errorMessage?: string;
  currentlyPlayingType?: 'processed' | 'original' | null;
}

interface AudioProcessingResult {
  chunks: ProcessedChunk[];        // Array of processed chunks
  processedBuffer: ArrayBuffer;    // Complete processed audio
  averageVad: number;              // Average VAD across all chunks
  totalDuration: number;           // Total duration in seconds
  metadata: {
    sampleRate: number;            // Audio sample rate (Hz)
    channels: number;              // Number of audio channels
    originalDuration: number;      // Original duration in seconds
  };
}

interface ProcessingMetrics {
  noiseReductionLevel: number;     // Current noise reduction (0-1)
  processingLatency: number;       // Processing delay in ms
  inputLevel: number;              // Input audio level (0-1)
  outputLevel: number;             // Output audio level (0-1)
  timestamp: number;               // Metric timestamp
  frameCount: number;              // Processed frame count
  droppedFrames: number;           // Dropped frames due to overload
}
```

## 🎨 Advanced Usage Examples

### Custom Hook with Progress Tracking

```typescript
import { useCallback, useState } from 'react';
import { useMurmurabaSuite, SUITE_TOKENS } from 'murmuraba';

function useAudioProcessorWithProgress() {
  const { container, isReady } = useMurmurabaSuite();
  const [progress, setProgress] = useState(0);
  const [chunks, setChunks] = useState<ProcessedChunk[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processFile = useCallback(async (file: File, options?: AudioProcessingOptions) => {
    if (!isReady) throw new Error('Suite not ready');
    
    const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor);
    setIsProcessing(true);
    setChunks([]);
    
    // Subscribe to events
    const unsubProgress = processor.onProgress(setProgress);
    const unsubChunk = processor.onChunk(chunk => {
      setChunks(prev => [...prev, chunk]);
    });
    
    try {
      const result = await processor.processFile(file, options);
      return result;
    } finally {
      unsubProgress();
      unsubChunk();
      setIsProcessing(false);
    }
  }, [container, isReady]);
  
  return { processFile, progress, chunks, isProcessing };
}
```

### Direct Service Access

```typescript
import { useMurmurabaSuite, SUITE_TOKENS } from 'murmuraba';

function AudioController() {
  const { container, isReady } = useMurmurabaSuite();
  
  const handleProcessing = async () => {
    const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor);
    const logger = container.get<ILogger>(TOKENS.Logger);
    const metrics = container.get<IMetricsManager>(TOKENS.MetricsManager);
    
    logger.info('Starting audio processing...');
    
    // Process with real-time metrics
    const unsubMetrics = processor.onMetrics(m => {
      logger.debug('Metrics:', m);
      metrics.recordMetrics(m);
    });
    
    try {
      const result = await processor.processRecording(10000, {
        chunkDuration: 5,
        enableVAD: true
      });
      
      logger.info(`Processed ${result.chunks.length} chunks`);
    } finally {
      unsubMetrics();
    }
  };
  
  return <button onClick={handleProcessing}>Process Audio</button>;
}
```

### Stream Processing with MediaStream

```typescript
function StreamProcessor() {
  const { container, isReady } = useMurmurabaSuite();
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const startStreaming = async () => {
    const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor);
    
    // Get microphone stream
    const mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { echoCancellation: false, noiseSuppression: false } 
    });
    setStream(mediaStream);
    
    // Process the stream
    const result = await processor.processStream(mediaStream, {
      chunkDuration: 8,
      outputFormat: 'wav'
    });
    
    console.log('Stream processing complete:', result);
  };
  
  const stopStreaming = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };
  
  return (
    <div>
      <button onClick={startStreaming} disabled={!isReady || !!stream}>
        Start Streaming
      </button>
      <button onClick={stopStreaming} disabled={!stream}>
        Stop Streaming
      </button>
    </div>
  );
}
```

## 📋 Built-in Hooks Reference

### useMurmurabaSuite()
Access the core suite functionality and DI container.

```typescript
const {
  container,      // DIContainer instance
  isReady,        // boolean - suite initialization status
  error,          // Error | null - initialization error
  getService,     // <T>(token: symbol) => T | null
  loadService     // (name: string) => Promise<void>
} = useMurmurabaSuite();
```

### useAudioProcessor()
Convenience hook for audio processing with built-in state management.

```typescript
const {
  isReady,           // boolean - processor ready status
  isProcessing,      // boolean - currently processing
  isRecording,       // boolean - currently recording
  processFile,       // (file: File, options?) => Promise<Result>
  processRecording,  // (duration: number, options?) => Promise<Result>
  cancelProcessing   // () => void
} = useAudioProcessor();
```

### useAudioProcessing()
High-level hook with progress tracking and error handling.

```typescript
const {
  processFile,       // (file: File, options?) => Promise<Result>
  processRecording,  // (duration: number, options?) => Promise<Result>
  isProcessing,      // boolean
  progress,          // number (0-100)
  error,             // Error | null
  cancel             // () => void
} = useAudioProcessing();
```

## ⚠️ Important Considerations

### Engine Initialization
- The WASM engine initializes automatically when `MurmurabaSuite` mounts
- Initialization timeout defaults to 6 seconds (configurable via `initTimeout`)
- Set `allowDegraded={true}` to continue if WASM fails to load

### Memory Management
- Call `URL.revokeObjectURL()` when done with chunk URLs to free memory
- Chunks contain Blob objects which can consume significant memory
- Consider implementing pagination for large numbers of chunks

### Browser Compatibility
- Requires Web Audio API support
- WebAssembly must be enabled
- AudioContext may require user interaction to start (handled automatically)

### Performance Tips
- Use `lazy={true}` (default) to load services on-demand
- Set appropriate `chunkDuration` based on your use case (default: 8 seconds)
- Monitor the `onMetrics` callback for performance insights

## 🔧 Technical Requirements

### Browser Support
- Chrome 66+ / Edge 79+
- Firefox 60+
- Safari 11.1+
- Web Audio API required
- WebAssembly support required

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "node",
    "jsx": "react",
    "strict": true
  }
}
```

## 🛠️ Service Tokens Reference

```typescript
// Core tokens (from TOKENS)
TOKENS.Logger           // ILogger
TOKENS.StateManager     // IStateManager  
TOKENS.EventEmitter     // IEventEmitter
TOKENS.MetricsManager   // IMetricsManager
TOKENS.WorkerManager    // IWorkerManager

// Suite-specific tokens (from SUITE_TOKENS)
SUITE_TOKENS.AudioProcessor  // IAudioProcessor
SUITE_TOKENS.ServiceLoader   // ServiceLoader
```

## 📦 Package Exports

```typescript
// Components
export { MurmurabaSuite } from 'murmuraba';

// Hooks
export { 
  useMurmurabaSuite,
  useAudioProcessor,
  useSuiteLogger,
  useAudioProcessing 
} from 'murmuraba';

// Types
export type {
  IAudioProcessor,
  AudioProcessingOptions,
  AudioProcessingResult,
  ProcessedChunk,
  ProcessingMetrics,
  MurmubaraConfig
} from 'murmuraba';

// Constants
export { TOKENS, SUITE_TOKENS } from 'murmuraba';

// Services (for advanced usage)
export { AudioProcessorService } from 'murmuraba';
export { DIContainer } from 'murmuraba';
```

## License

MIT © Murmuraba Team

---

**Enterprise-ready audio processing with modern React architecture.**  
Wrap your app with `MurmurabaSuite` and start processing! 🚀