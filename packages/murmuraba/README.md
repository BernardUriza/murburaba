# 🚀 Murmuraba - Advanced Audio Chunking & Noise Reduction

[![npm version](https://badge.fury.io/js/murmuraba.svg)](https://www.npmjs.com/package/murmuraba)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Murmuraba** provides real-time audio noise reduction with advanced chunked processing for web applications. The new API delivers chunks as ready-to-use blobs with integrated VAD metrics, eliminating client-side complexity.

## 🌟 Key Features

- **🎯 Advanced File Chunking**: Process audio files into configurable chunks with automatic format conversion
- **📊 Integrated VAD Metrics**: Voice Activity Detection metrics calculated per chunk
- **🔄 Format Flexibility**: Convert chunks to WAV, WebM, or raw formats automatically
- **⚡ Zero Client Complexity**: Chunks come as ready-to-use blobs with timestamps
- **🎙️ Real-time Noise Reduction**: RNNoise neural network with WebAssembly
- **🛡️ Full TypeScript Support**: Complete type safety with strict interfaces

## Installation

```bash
npm install murmuraba
# or
yarn add murmuraba
# or  
pnpm add murmuraba
```

## 🎯 Core API Functions

Murmuraba exposes two main API functions that work together:

### 1. `initializeAudioEngine()` - Engine Initialization

**MUST be called before any audio processing.** This function prepares the WebAssembly engine and audio processing pipeline.

```typescript
import { initializeAudioEngine } from 'murmuraba';

// Initialize the engine with configuration
await initializeAudioEngine({
  algorithm: 'spectral',    // 'spectral' | 'rnnoise' | 'custom'
  logLevel: 'info',         // 'debug' | 'info' | 'warn' | 'error'
  allowDegraded: true       // Allow fallback mode if WASM fails
});

console.log('✅ Audio engine initialized and ready!');
```

### 2. `processFileWithMetrics()` - Audio Processing

After engine initialization, use this function to process audio from **files** or **microphone**.

#### 🎤 Live Microphone Recording

Use `'Use.Mic'` as the first parameter to record directly from the microphone:

```typescript
import { processFileWithMetrics } from 'murmuraba';

// Record from microphone for 10 seconds
const result = await processFileWithMetrics('Use.Mic', {
  recordingDuration: 10000,  // 10 seconds
  chunkOptions: {
    chunkDuration: 6000,     // 6-second chunks
    outputFormat: 'wav'      // 'wav' | 'webm' | 'raw'
  }
});

console.log(`🎤 Recorded ${result.chunks.length} chunks`);
```

#### 📁 File Processing

Process uploaded audio files:

```typescript
import { processFileWithMetrics } from 'murmuraba';

// Process an audio file
const result = await processFileWithMetrics(audioFile, {
  chunkOptions: {
    chunkDuration: 8000,     // 8-second chunks
    outputFormat: 'wav'      // Output format
  }
});

console.log(`📁 Processed ${result.chunks.length} chunks from file`);
```

## 🚀 Complete Example - Step by Step

```typescript
import { 
  initializeAudioEngine, 
  processFileWithMetrics 
} from 'murmuraba';

async function processAudio() {
  try {
    // Step 1: Initialize the engine (required!)
    console.log('⚡ Initializing audio engine...');
    await initializeAudioEngine({
      algorithm: 'spectral',
      logLevel: 'info',
      allowDegraded: true
    });
    console.log('✅ Engine ready!');

    // Step 2a: Process from microphone
    console.log('🎤 Recording from microphone...');
    const micResult = await processFileWithMetrics('Use.Mic', {
      recordingDuration: 15000,  // 15 seconds
      chunkOptions: {
        chunkDuration: 5000,     // 5-second chunks
        outputFormat: 'wav'
      }
    });
    
    console.log(`✅ Recorded ${micResult.chunks.length} chunks`);
    
    // Step 2b: Process from file
    const fileInput = document.getElementById('audioFile') as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (file) {
      console.log('📁 Processing audio file...');
      const fileResult = await processFileWithMetrics(file, {
        chunkOptions: {
          chunkDuration: 8000,   // 8-second chunks
          outputFormat: 'wav'
        }
      });
      
      console.log(`✅ Processed ${fileResult.chunks.length} chunks`);
      
      // Use the chunks
      fileResult.chunks.forEach((chunk, index) => {
        console.log(`Chunk ${index + 1}:`);
        console.log(`  Duration: ${chunk.duration / 1000}s`);
        console.log(`  VAD Score: ${(chunk.vadScore * 100).toFixed(1)}%`);
        
        // Play the chunk
        const audioUrl = URL.createObjectURL(chunk.blob);
        const audio = new Audio(audioUrl);
        // audio.play();
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

## 🔧 API Reference

### initializeAudioEngine(config?)

Initializes the audio processing engine. **Must be called before any audio processing.**

```typescript
interface MurmubaraConfig {
  algorithm?: 'spectral' | 'rnnoise' | 'custom';  // Processing algorithm
  logLevel?: 'debug' | 'info' | 'warn' | 'error'; // Logging level
  allowDegraded?: boolean;                         // Allow fallback mode
  bufferSize?: 2048 | 4096 | 8192 | 16384;       // Audio buffer size
  noiseReductionLevel?: number;                    // 0-100 reduction strength
}

function initializeAudioEngine(config?: MurmubaraConfig): Promise<void>;
```

### processFileWithMetrics() - Overloaded Function

#### Microphone Recording

```typescript
function processFileWithMetrics(
  useMic: 'Use.Mic',
  options?: {
    recordingDuration?: number;    // Recording duration in ms
    chunkOptions?: ChunkOptions;   // Chunking configuration
  }
): Promise<ProcessFileResult>;
```

#### File Processing

```typescript
function processFileWithMetrics(
  file: File,
  options?: {
    chunkOptions?: ChunkOptions;   // Chunking configuration
  }
): Promise<ProcessFileResult>;
```

### Type Definitions

```typescript
interface ChunkOptions {
  chunkDuration: number;          // Chunk duration in milliseconds
  outputFormat: 'wav' | 'webm' | 'raw';  // Output audio format
}

interface ProcessedChunk {
  blob: Blob;                     // Ready-to-use audio blob
  startTime: number;              // Start timestamp (ms)
  endTime: number;                // End timestamp (ms) 
  duration: number;               // Duration (ms)
  vadScore: number;               // Voice Activity Detection score (0-1)
  metrics: {
    noiseRemoved: number;         // Noise reduction amount
    averageLevel: number;         // Average audio level
    vad: number;                  // VAD score
  };
}

interface ProcessFileResult {
  chunks: ProcessedChunk[];       // Array of processed chunks
  processedBuffer: ArrayBuffer;   // Full processed audio (optional)
  averageVad: number;             // Average VAD across all chunks
  totalDuration: number;          // Total duration (ms)
  metadata: {
    sampleRate: number;           // Audio sample rate
    channels: number;             // Number of channels
    originalDuration: number;     // Original file duration
  };
}
```

## 💡 React Hook Example

```tsx
import React, { useState, useCallback } from 'react';
import { 
  initializeAudioEngine, 
  processFileWithMetrics,
  ProcessedChunk 
} from 'murmuraba';

function useAudioProcessor() {
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunks, setChunks] = useState<ProcessedChunk[]>([]);

  // Initialize engine once
  const initEngine = useCallback(async () => {
    if (isEngineReady) return;
    
    try {
      await initializeAudioEngine({
        algorithm: 'spectral',
        logLevel: 'info'
      });
      setIsEngineReady(true);
    } catch (error) {
      console.error('Engine initialization failed:', error);
    }
  }, [isEngineReady]);

  // Process audio file
  const processFile = useCallback(async (file: File) => {
    if (!isEngineReady) {
      console.warn('Engine not initialized');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processFileWithMetrics(file, {
        chunkOptions: {
          chunkDuration: 8000,
          outputFormat: 'wav'
        }
      });
      setChunks(result.chunks);
    } finally {
      setIsProcessing(false);
    }
  }, [isEngineReady]);

  // Record from microphone
  const recordFromMic = useCallback(async (duration: number = 10000) => {
    if (!isEngineReady) {
      console.warn('Engine not initialized');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processFileWithMetrics('Use.Mic', {
        recordingDuration: duration,
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'wav'
        }
      });
      setChunks(result.chunks);
    } finally {
      setIsProcessing(false);
    }
  }, [isEngineReady]);

  return {
    isEngineReady,
    isProcessing,
    chunks,
    initEngine,
    processFile,
    recordFromMic
  };
}
```

## 🎯 Quick Start Guide

1. **Initialize the engine once when your app starts:**

```typescript
await initializeAudioEngine();
```

2. **Process audio from microphone:**

```typescript
const result = await processFileWithMetrics('Use.Mic', {
  recordingDuration: 10000  // 10 seconds
});
```

3. **Process audio from file:**

```typescript
const result = await processFileWithMetrics(file, {
  chunkOptions: { chunkDuration: 8000, outputFormat: 'wav' }
});
```

## ⚠️ Important Notes

- **Always call `initializeAudioEngine()` first** - The engine must be initialized before any audio processing
- **Engine initialization is one-time** - Initialize once and use throughout your app lifecycle
- **Microphone permissions** - When using `'Use.Mic'`, the browser will request microphone permissions
- **Memory management** - Remember to call `URL.revokeObjectURL()` when done with blob URLs

## 🔧 Browser Requirements

- **Web Audio API** support
- **WebAssembly** support  
- **Modern browsers**: Chrome 66+, Firefox 60+, Safari 11.1+, Edge 79+

## 📚 Additional Resources

- [API Documentation](./docs/API.md)
- [Integration Examples](./examples/)
- [Performance Guidelines](./docs/PERFORMANCE.md)

## License

MIT © Murmuraba Team

---

**Ready to process audio with zero complexity?**  
Initialize the engine and start processing! 🚀