# 🚀 Murmuraba - Advanced Audio Chunking & Noise Reduction

[![npm version](https://badge.fury.io/js/murmuraba.svg)](https://www.npmjs.com/package/murmuraba)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Murmuraba** provides real-time audio noise reduction with advanced chunked processing for web applications. The new `processFileWithMetrics` API delivers chunks as ready-to-use blobs with integrated VAD metrics, eliminating client-side complexity.

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

## 🎯 New Chunking API - processFileWithMetrics

The `processFileWithMetrics` function is the core of Murmuraba's new chunking system. It can process **audio files** or **live microphone input** and returns ready-to-use chunks with integrated metrics.

### 🎤 Live Microphone Recording

Use `'Use.Mic'` as the first parameter to record directly from the microphone:

```typescript
import { processFileWithMetrics } from 'murmuraba';

// Record 10 seconds from microphone with 6-second chunks
const result = await processFileWithMetrics('Use.Mic', {
  recordingDuration: 10000,  // 10 seconds
  chunkOptions: {
    chunkDuration: 6000,     // 6-second chunks
    outputFormat: 'wav'      // WAV output
  }
});

console.log(`🎤 Recorded ${result.chunks.length} chunks from microphone`);
result.chunks.forEach((chunk, index) => {
  console.log(`Chunk ${index + 1}: ${chunk.duration / 1000}s`);
  console.log(`VAD Score: ${(chunk.vadScore * 100).toFixed(1)}%`);
  
  // Ready to play immediately
  const audioUrl = URL.createObjectURL(chunk.blob);
  console.log(`Ready to play: ${audioUrl}`);
});
```

### 📁 File Processing

Process uploaded audio files:

### Basic Usage

```typescript
import { processFileWithMetrics } from 'murmuraba';

// Process file with default 8-second WAV chunks
const result = await processFileWithMetrics(audioFile);

console.log(result.chunks.length); // Number of chunks created
result.chunks.forEach((chunk, index) => {
  console.log(`Chunk ${index + 1}:`);
  console.log(`- Duration: ${chunk.duration}ms`);
  console.log(`- Format: ${chunk.format}`);
  console.log(`- VAD Score: ${chunk.vadMetrics.voiceActivityScore}`);
  console.log(`- Ready to use: ${chunk.blob.size} bytes`);
});
```

### Advanced Configuration

```typescript
import { processFileWithMetrics, ChunkOptions } from 'murmuraba';

const options: ChunkOptions = {
  duration: 10,        // 10-second chunks
  format: 'webm',      // Output as WebM
  quality: 'high'      // High quality processing
};

const result = await processFileWithMetrics(audioFile, options);

// Each chunk is ready to use immediately
result.chunks.forEach(chunk => {
  // Create audio element
  const audio = new Audio(URL.createObjectURL(chunk.blob));
  
  // Access integrated metrics
  console.log('Voice detected:', chunk.vadMetrics.voiceDetected);
  console.log('Noise level:', chunk.vadMetrics.noiseLevel);
  console.log('Signal quality:', chunk.vadMetrics.signalQuality);
});
```

## 🔧 TypeScript Interfaces

### Core Interfaces

```typescript
// Chunk configuration options
interface ChunkOptions {
  duration?: number;           // Chunk duration in seconds (default: 8)
  format?: 'wav' | 'webm' | 'raw';  // Output format (default: 'wav')
  quality?: 'low' | 'medium' | 'high';  // Processing quality (default: 'medium')
}

// Processed chunk with ready-to-use blob
interface ProcessedChunk {
  id: string;                  // Unique chunk identifier
  blob: Blob;                  // Ready-to-use audio blob
  duration: number;            // Duration in milliseconds
  format: string;              // Audio format (wav/webm/raw)
  startTime: number;           // Start timestamp (ms)
  endTime: number;             // End timestamp (ms)
  vadMetrics: {
    voiceActivityScore: number;     // 0-1 voice activity score
    voiceDetected: boolean;         // Voice presence detection
    noiseLevel: number;             // 0-1 noise level
    signalQuality: number;          // 0-1 signal quality
    energyLevel: number;            // Audio energy level
  };
}

// Complete processing result
interface ProcessFileResult {
  chunks: ProcessedChunk[];    // Array of processed chunks
  totalDuration: number;       // Total file duration (ms)
  originalFormat: string;      // Original file format
  processingTime: number;      // Processing time (ms)
  metadata: {
    sampleRate: number;        // Audio sample rate
    channels: number;          // Number of channels
    bitDepth?: number;         // Bit depth if available
  };
}

// Unified options interface
interface ProcessFileOptions {
  chunk?: ChunkOptions;        // Chunking configuration
  noiseReduction?: boolean;    // Enable noise reduction (default: true)
  vadEnabled?: boolean;        // Enable VAD analysis (default: true)
}
```

### Function Signatures

```typescript
// File processing
function processFileWithMetrics(
  file: File,
  options?: ProcessFileOptions
): Promise<ProcessFileResult>;

// Live microphone recording
function processFileWithMetrics(
  useMic: 'Use.Mic',
  options?: ProcessFileOptions & { recordingDuration?: number }
): Promise<ProcessFileResult>;

// Backward compatibility overload
function processFileWithMetrics(
  file: File,
  chunkOptions: ChunkOptions
): Promise<ProcessFileResult>;
```

## 🎵 Complete Example with Playback

```typescript
import { processFileWithMetrics } from 'murmuraba';

async function processAudioFile(file: File) {
  try {
    // Process with custom options
    const result = await processFileWithMetrics(file, {
      chunk: {
        duration: 6,      // 6-second chunks
        format: 'wav',    // WAV output
        quality: 'high'   // High quality
      },
      noiseReduction: true,
      vadEnabled: true
    });

    console.log(`✅ Processed ${result.chunks.length} chunks`);
    console.log(`📊 Total duration: ${result.totalDuration / 1000}s`);
    console.log(`⚡ Processing time: ${result.processingTime}ms`);

    // Use chunks immediately
    result.chunks.forEach((chunk, index) => {
      console.log(`\n🎵 Chunk ${index + 1}:`);
      console.log(`   Duration: ${chunk.duration / 1000}s`);
      console.log(`   Voice Activity: ${(chunk.vadMetrics.voiceActivityScore * 100).toFixed(1)}%`);
      console.log(`   Voice Detected: ${chunk.vadMetrics.voiceDetected ? '✅' : '❌'}`);
      console.log(`   Noise Level: ${(chunk.vadMetrics.noiseLevel * 100).toFixed(1)}%`);
      console.log(`   Signal Quality: ${(chunk.vadMetrics.signalQuality * 100).toFixed(1)}%`);
      
      // Create playable URL immediately
      const audioUrl = URL.createObjectURL(chunk.blob);
      console.log(`   🔗 Ready to play: ${audioUrl.substring(0, 50)}...`);
      
      // Cleanup URL when done (optional)
      // URL.revokeObjectURL(audioUrl);
    });

  } catch (error) {
    console.error('❌ Processing failed:', error);
  }
}

// Use with file input
const fileInput = document.getElementById('audioFile') as HTMLInputElement;
fileInput.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    processAudioFile(file);
  }
});
```

## 🔄 React Integration Example

```tsx
import React, { useState, useCallback } from 'react';
import { processFileWithMetrics, ProcessedChunk } from 'murmuraba';

function AudioChunkProcessor() {
  const [chunks, setChunks] = useState<ProcessedChunk[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [recordingFromMic, setRecordingFromMic] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setProcessing(true);
    try {
      const result = await processFileWithMetrics(file, {
        chunkOptions: { chunkDuration: 8000, outputFormat: 'wav' },
        enableVAD: true
      });
      
      setChunks(result.chunks);
      console.log(`✅ Created ${result.chunks.length} chunks from file`);
    } catch (error) {
      console.error('File processing failed:', error);
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleMicrophoneRecording = useCallback(async () => {
    setRecordingFromMic(true);
    setProcessing(true);
    try {
      const result = await processFileWithMetrics('Use.Mic', {
        recordingDuration: 15000,  // 15 seconds
        chunkOptions: { chunkDuration: 5000, outputFormat: 'wav' },
        enableVAD: true
      });
      
      setChunks(result.chunks);
      console.log(`🎤 Recorded ${result.chunks.length} chunks from microphone`);
    } catch (error) {
      console.error('Microphone recording failed:', error);
    } finally {
      setRecordingFromMic(false);
      setProcessing(false);
    }
  }, []);

  const playChunk = useCallback((chunk: ProcessedChunk) => {
    // Stop any currently playing audio
    if (currentPlaying) {
      const currentAudio = document.getElementById(currentPlaying) as HTMLAudioElement;
      currentAudio?.pause();
    }

    // Create and play new audio
    const audioUrl = URL.createObjectURL(chunk.blob);
    const audio = new Audio(audioUrl);
    const audioId = `audio-${chunk.id}`;
    
    audio.id = audioId;
    audio.onended = () => {
      setCurrentPlaying(null);
      URL.revokeObjectURL(audioUrl);
    };
    
    setCurrentPlaying(audioId);
    audio.play();
  }, [currentPlaying]);

  return (
    <div className="audio-processor">
      {/* File Upload */}
      <div className="input-section">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          disabled={processing}
        />
        <span>or</span>
        <button 
          onClick={handleMicrophoneRecording}
          disabled={processing}
        >
          {recordingFromMic ? '🎤 Recording...' : '🎤 Record from Microphone'}
        </button>
      </div>
      
      {processing && (
        <div>
          {recordingFromMic ? '🎤 Recording from microphone...' : '🔄 Processing audio file...'}
        </div>
      )}
      
      <div className="chunks-grid">
        {chunks.map((chunk, index) => (
          <div key={chunk.id} className="chunk-card">
            <h3>Chunk #{index + 1}</h3>
            <p>Duration: {(chunk.duration / 1000).toFixed(1)}s</p>
            <div className="metrics">
              <div>🎤 Voice: {chunk.vadMetrics.voiceDetected ? '✅' : '❌'}</div>
              <div>📊 Activity: {(chunk.vadMetrics.voiceActivityScore * 100).toFixed(1)}%</div>
              <div>🔇 Noise: {(chunk.vadMetrics.noiseLevel * 100).toFixed(1)}%</div>
              <div>⭐ Quality: {(chunk.vadMetrics.signalQuality * 100).toFixed(1)}%</div>
            </div>
            <button 
              onClick={() => playChunk(chunk)}
              disabled={currentPlaying === `audio-${chunk.id}`}
            >
              {currentPlaying === `audio-${chunk.id}` ? '⏸️ Playing' : '▶️ Play'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AudioChunkProcessor;
```

## 🎤 Quick Microphone Example

```typescript
// One-liner to record 30 seconds from microphone with chunking
const micResult = await processFileWithMetrics('Use.Mic', {
  recordingDuration: 30000,
  chunkOptions: { chunkDuration: 8000, outputFormat: 'wav' }
});

// Chunks are ready to use immediately!
micResult.chunks.forEach((chunk, i) => {
  console.log(`🎵 Chunk ${i + 1}: ${chunk.duration / 1000}s`);
  console.log(`   VAD: ${chunk.vadScore.toFixed(2)}`);
  console.log(`   Noise removed: ${chunk.metrics.noiseRemoved.toFixed(2)}`);
  
  // Play chunk
  const audio = new Audio(URL.createObjectURL(chunk.blob));
  audio.play();
});
```

## 🎯 Key Benefits

### ✅ Before: Manual Client-Side Complexity
```typescript
// Old way - complex client setup
const chunks = await processFile(file);
for (const chunk of chunks) {
  const audioBuffer = await convertToWAV(chunk.rawData);  // Manual conversion
  const blob = new Blob([audioBuffer], { type: 'audio/wav' });  // Manual blob creation
  const vadScore = await calculateVAD(chunk.rawData);  // Separate VAD calculation
  const url = URL.createObjectURL(blob);  // Manual URL creation
}
```

### ✅ After: Zero Client Complexity
```typescript
// Files - everything ready-to-use
const result = await processFileWithMetrics(file);

// Microphone - one line!
const micResult = await processFileWithMetrics('Use.Mic');

// Both return identical format:
result.chunks.forEach(chunk => {
  // chunk.blob is ready to use immediately
  // chunk.vadMetrics are pre-calculated
  // No manual conversions needed
  const audioUrl = URL.createObjectURL(chunk.blob);
  // Just play!
});
```

## 🛡️ Backward Compatibility

The API maintains full backward compatibility while providing new functionality:

```typescript
// Old API still works
const result = await processFileWithMetrics(arrayBuffer, onFrameProcessed);

// New file API
const result = await processFileWithMetrics(file, {
  chunkOptions: { chunkDuration: 10000, outputFormat: 'wav' },
  enableVAD: true
});

// New microphone API
const result = await processFileWithMetrics('Use.Mic', {
  recordingDuration: 15000,
  chunkOptions: { chunkDuration: 5000, outputFormat: 'wav' }
});
```

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

**Ready to eliminate client-side audio complexity?**  
Install Murmuraba and get chunks as ready-to-use blobs with integrated VAD metrics! 🚀