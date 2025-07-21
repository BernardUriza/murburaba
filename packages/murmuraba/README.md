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

## What's New in v1.3.0 🎉

### 🎯 **Revolutionary Clean Architecture**
Complete refactoring that moves ALL audio logic into the package, making it a complete, standalone solution:

- **🔥 Zero-Setup Recording**: `useMurmubaraEngine` handles MediaRecorder, streams, and chunks internally
- **📦 Complete Package**: No more external dependencies or setup - import and use immediately
- **🎵 Built-in Recording Pipeline**: Start, stop, pause, resume with automatic chunking and time tracking
- **🔄 WAV-First Strategy**: Prioritizes WAV format with automatic fallback to WebM/Opus
- **🎛️ Integrated Audio Playback**: `toggleChunkPlayback()` for both original and processed audio
- **📊 Complete State Management**: `recordingState` includes everything - time, chunks, status
- **🧹 Automatic Memory Management**: Auto-cleanup of audio URLs and MediaRecorder resources
- **⚡ Utility Functions**: `formatTime()`, `getAverageNoiseReduction()`, chunk expansion controls
- **🏗️ Clean Separation**: Frontend becomes pure UI - all audio logic in the package

### **Why This Changes Everything**
- **Frontend Developers**: Just import the hook and render - no complex audio logic required
- **Package Users**: Complete audio processing solution in any React app with a single import
- **Clean Architecture**: Perfect separation between UI components and audio processing business logic

### Previous Features (v1.2.0)
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

## React Hook Usage - Complete Example

The `useMurmubaraEngine` hook is now a complete audio processing solution that handles everything internally:

```tsx
import { useMurmubaraEngine } from 'murmuraba';

function AudioComponent() {
  const {
    // Engine State
    isInitialized,
    isLoading,
    error,
    engineState,
    metrics,
    diagnostics,
    
    // Recording State (complete state object)
    recordingState,      // { isRecording, isPaused, recordingTime, chunks }
    currentStream,       // Current MediaStream being processed
    
    // Engine Control
    initialize,
    destroy,
    
    // Recording Pipeline (all-in-one functions)
    startRecording,      // (chunkDuration?) => Promise<void> - handles everything
    stopRecording,       // () => void - stops and finalizes
    pauseRecording,      // () => void - pauses current recording
    resumeRecording,     // () => void - resumes paused recording
    clearRecordings,     // () => void - clears all chunks and URLs
    
    // Audio Playback (built-in)
    toggleChunkPlayback, // (chunkId, audioType) => Promise<void>
    toggleChunkExpansion,// (chunkId) => void
    
    // Utility Functions (included)
    formatTime,          // (seconds) => "MM:SS" format
    getAverageNoiseReduction, // () => number (average across all chunks)
    resetError          // () => void - clears error state
  } = useMurmubaraEngine({
    autoInitialize: false,        // Initialize on mount
    defaultChunkDuration: 8,      // Default chunk size in seconds
    noiseReductionLevel: 'high',  // Processing quality
    bufferSize: 2048,            // Audio buffer size
    logLevel: 'info'             // Logging level
  });

  return (
    <div>
      {/* Engine Initialization */}
      {!isInitialized && !isLoading && (
        <button onClick={initialize}>
          Initialize Engine
        </button>
      )}
      
      {isLoading && <div>🚀 Initializing Neural Engine...</div>}

      {/* Zero-Setup Recording - Just One Function Call */}
      {isInitialized && (
        <div>
          {!recordingState.isRecording ? (
            <button onClick={() => startRecording(8)}>
              🎙️ Start Recording (8s chunks)
            </button>
          ) : (
            <>
              <button onClick={stopRecording}>⏹️ Stop</button>
              {recordingState.isPaused ? (
                <button onClick={resumeRecording}>▶️ Resume</button>
              ) : (
                <button onClick={pauseRecording}>⏸️ Pause</button>
              )}
              <span>🎵 Recording: {formatTime(recordingState.recordingTime)}</span>
            </>
          )}
        </div>
      )}

      {/* Real-time Processing Metrics */}
      {metrics && recordingState.isRecording && (
        <div>
          <p>🔇 Noise Reduction: {metrics.noiseReductionLevel.toFixed(1)}%</p>
          <p>⚡ Latency: {metrics.processingLatency.toFixed(2)}ms</p>
          <p>📊 Input Level: {(metrics.inputLevel * 100).toFixed(0)}%</p>
          <p>📈 Average Reduction: {getAverageNoiseReduction().toFixed(1)}%</p>
        </div>
      )}

      {/* Automatically Processed Chunks with Built-in Playback */}
      <div>
        <h3>🎵 Processed Chunks ({recordingState.chunks.length})</h3>
        {recordingState.chunks.map((chunk, index) => (
          <div key={chunk.id}>
            <h4>Chunk #{index + 1} - {formatTime(chunk.duration / 1000)}</h4>
            <p>🔇 Noise Removed: {chunk.noiseRemoved.toFixed(1)}%</p>
            
            {/* Built-in Audio Playback Controls */}
            <button 
              onClick={() => toggleChunkPlayback(chunk.id, 'original')}
              disabled={!chunk.originalAudioUrl}
            >
              🔊 {chunk.isPlaying ? 'Stop' : 'Play'} Original
            </button>
            
            <button 
              onClick={() => toggleChunkPlayback(chunk.id, 'processed')}
              disabled={!chunk.processedAudioUrl}
            >
              🎵 {chunk.isPlaying ? 'Stop' : 'Play'} Enhanced
            </button>
            
            <button onClick={() => toggleChunkExpansion(chunk.id)}>
              {chunk.isExpanded ? '▲ Hide' : '▼ Show'} Details
            </button>
            
            {/* Automatic Detail Expansion */}
            {chunk.isExpanded && (
              <div>
                <p>📅 Start: {new Date(chunk.startTime).toLocaleTimeString()}</p>
                <p>🏁 End: {new Date(chunk.endTime).toLocaleTimeString()}</p>
                <p>⚡ Processing: {chunk.metrics.processingLatency.toFixed(2)}ms</p>
                <p>🎞️ Frames: {chunk.metrics.frameCount}</p>
                <p>📊 Input Level: {(chunk.metrics.inputLevel * 100).toFixed(1)}%</p>
                <p>📈 Output Level: {(chunk.metrics.outputLevel * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* One-Click Cleanup */}
      {recordingState.chunks.length > 0 && (
        <button onClick={clearRecordings}>
          🧹 Clear All Recordings
        </button>
      )}
      
      {/* Error Handling */}
      {error && (
        <div>
          ⚠️ {error} 
          <button onClick={resetError}>✕</button>
        </div>
      )}
    </div>
  );
}
```

## Configuration Options

### `useMurmubaraEngine` Hook Options

```typescript
interface UseMurmubaraEngineOptions {
  // Engine Initialization
  autoInitialize?: boolean;          // Auto-initialize engine on mount (default: false)
  
  // Recording Configuration  
  defaultChunkDuration?: number;     // Default chunk duration in seconds (default: 8)
  
  // Audio Processing
  noiseReductionLevel?: 'low' | 'medium' | 'high';  // Processing quality (default: 'high')
  bufferSize?: 256 | 512 | 1024 | 2048 | 4096;     // Audio buffer size (default: 2048)
  
  // Logging & Debugging
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';  // Logging level (default: 'info')
  
  // Advanced Options
  useWorker?: boolean;               // Use Web Worker for processing (default: true)
  autoCleanup?: boolean;             // Auto-cleanup inactive resources (default: true)
  cleanupDelay?: number;             // Cleanup delay in ms (default: 5000)
}
```

### Hook Return Interface

```typescript
interface UseMurmubaraEngineReturn {
  // Engine State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  engineState: 'uninitialized' | 'initializing' | 'ready' | 'processing' | 'error';
  metrics: ProcessingMetrics | null;
  diagnostics: DiagnosticInfo | null;
  
  // Recording State (Complete State Object)
  recordingState: {
    isRecording: boolean;
    isPaused: boolean;
    recordingTime: number;           // Total recording time in seconds
    chunks: ProcessedChunk[];        // Array of processed audio chunks
  };
  currentStream: MediaStream | null; // Current audio stream being processed
  
  // Engine Control
  initialize: () => Promise<void>;
  destroy: (force?: boolean) => Promise<void>;
  resetError: () => void;
  
  // Complete Recording Pipeline (All-in-One Functions)
  startRecording: (chunkDuration?: number) => Promise<void>;  // Handles MediaRecorder setup
  stopRecording: () => void;                                  // Stops and finalizes all chunks
  pauseRecording: () => void;                                 // Pauses current recording
  resumeRecording: () => void;                                // Resumes paused recording
  clearRecordings: () => void;                                // Clears all chunks and audio URLs
  
  // Built-in Audio Playback
  toggleChunkPlayback: (chunkId: string, audioType: 'original' | 'processed') => Promise<void>;
  toggleChunkExpansion: (chunkId: string) => void;
  
  // Utility Functions (Built-in)
  formatTime: (seconds: number) => string;                    // Format seconds to "MM:SS"
  getAverageNoiseReduction: () => number;                     // Calculate average across all chunks
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

## Testing

### Unit Tests

```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
```

### Integration Tests (Browser)

For real-world audio testing with actual noise reduction, see our [DOM Integration Testing Guide](./docs/DOM_INTEGRATION_TESTS.md).

This guide covers:
- Testing with real microphone input
- File upload testing with noisy audio
- Performance benchmarking
- Visual waveform analysis
- SNR (Signal-to-Noise Ratio) measurements

## Performance Tips

1. Use appropriate buffer sizes:
   - Lower latency: 256 or 512
   - Better performance: 2048 or 4096

2. Configure noise reduction level based on your needs:
   - `low`: Minimal processing, lowest latency
   - `medium`: Balanced (default)
   - `high`: Maximum noise reduction

3. Enable auto-cleanup to free resources when inactive

## Migration from v1.2.x to v1.3.0

### Before v1.3.0 (Complex Setup)
```typescript
// Multiple hooks and manual setup required
const { processStream, cleanup } = useAudioEngine();
const { startRecording, stopRecording } = useAudioRecorder();
const { convert } = useAudioConverter();

// Manual MediaRecorder setup
const mediaRecorder = new MediaRecorder(stream);
// Manual chunk handling
// Manual audio URL management
// Manual playback controls
cleanup(); // Partial cleanup
```

### After v1.3.0 (Zero Setup)
```typescript
// Single hook with everything built-in
const { 
  startRecording,        // Handles MediaRecorder, chunking, conversion
  stopRecording,         // Complete cleanup
  toggleChunkPlayback,   // Built-in playback
  recordingState,        // Complete state
  formatTime,            // Utility functions included
  clearRecordings        // One-click cleanup
} = useMurmubaraEngine();

// Just one function call - handles everything
await startRecording(8); // 8-second chunks, automatic WAV conversion, playback ready
```

### Key Improvements in v1.3.0
- **🔥 90% Less Code**: Frontend reduced from 1700+ lines to <100 lines
- **📦 Complete Package**: All logic moved to reusable package
- **🎯 Zero Setup**: No manual MediaRecorder or chunk management
- **🔄 WAV-First**: Automatic format prioritization and conversion
- **🧹 Auto Cleanup**: Proper memory management built-in
- **🎵 Integrated Playback**: No need for external audio components

## License

MIT © Murmuraba Team

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- 🐛 [Report bugs](https://github.com/bernarducs/murmuraba/issues)
- 💡 [Request features](https://github.com/bernarducs/murmuraba/issues)
- 📖 [Documentation](https://github.com/bernarducs/murmuraba/wiki)