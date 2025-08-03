# 🎵 Murmuraba - Real-time Audio Noise Reduction

[![npm version](https://img.shields.io/npm/v/murmuraba.svg)](https://www.npmjs.com/package/murmuraba)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Real-time audio noise reduction for web applications using RNNoise WASM with advanced chunked recording and processing

## 🚀 Features

- ✅ **Real-time noise reduction** using RNNoise neural network
- ✅ **Input gain control** - Adjust microphone volume (0.5x-3.0x) 🎚️
- ✅ **Chunked recording** with MediaRecorder for efficient memory usage
- ✅ **Voice Activity Detection (VAD)** integrated with real-time metrics
- ✅ **Professional React components** with TypeScript
- ✅ **Stream control** - pause, resume, stop with state management
- ✅ **Export capabilities** - WAV and MP3 formats
- ✅ **Automatic cleanup** and memory management
- ✅ **React 19 compatible** with latest optimizations

## 📦 Installation

```bash
npm install murmuraba
# or
yarn add murmuraba
# or
pnpm add murmuraba
```

## 🎯 Quick Start

### Basic Recording with Noise Reduction

```typescript
import { useMurmubaraEngine } from 'murmuraba';

function App() {
  const {
    // State
    isInitialized,
    isLoading,
    error,
    metrics,
    recordingState,
    
    // Actions
    initialize,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    
    // Export functions
    exportChunkAsWav,
    exportChunkAsMp3,
    downloadChunk
  } = useMurmubaraEngine({
    autoInitialize: true,
    logLevel: 'info',
    defaultChunkDuration: 8
  });

  const { isRecording, chunks, recordingTime } = recordingState;

  const handleToggleRecording = async () => {
    if (!isRecording) {
      await startRecording(8); // 8 second chunks
    } else {
      stopRecording();
    }
  };

  return (
    <div>
      <button onClick={handleToggleRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      
      {isRecording && (
        <div>
          <p>Recording: {recordingTime}s</p>
          <p>Chunks: {chunks.length}</p>
        </div>
      )}
      
      {metrics && (
        <div>
          <p>Noise Reduction: {metrics.noiseReductionLevel.toFixed(1)}%</p>
          <p>Voice Activity: {((metrics.vadLevel || 0) * 100).toFixed(0)}%</p>
          <p>Latency: {metrics.processingLatency.toFixed(2)}ms</p>
        </div>
      )}
    </div>
  );
}
```

## 🎨 Components

### WaveformAnalyzer

Real-time waveform visualization for audio streams:

```typescript
import { WaveformAnalyzer } from 'murmuraba';

<WaveformAnalyzer 
  stream={mediaStream}
  isActive={true}
  isPaused={false}
  color="#52A32F"
  width={800}
  height={200}
  hideControls={false}
/>
```

### ChunkProcessingResults

Display and manage recorded chunks:

```typescript
import { ChunkProcessingResults } from 'murmuraba';

<ChunkProcessingResults
  chunks={recordingState.chunks}
  onTogglePlayback={toggleChunkPlayback}
  onToggleExpansion={toggleChunkExpansion}
  onDownload={downloadChunk}
  onExportWav={exportChunkAsWav}
  onExportMp3={exportChunkAsMp3}
  formatTime={formatTime}
  averageNoiseReduction={getAverageNoiseReduction()}
/>
```

### AdvancedMetricsPanel

System diagnostics and performance monitoring:

```typescript
import { AdvancedMetricsPanel } from 'murmuraba';

<AdvancedMetricsPanel 
  diagnostics={diagnostics}
  isOpen={showMetrics}
  onClose={() => setShowMetrics(false)}
/>
```

### SimpleWaveformAnalyzer

Lightweight waveform display:

```typescript
import { SimpleWaveformAnalyzer } from 'murmuraba';

<SimpleWaveformAnalyzer
  stream={mediaStream}
  isActive={true}
  width={400}
  height={100}
/>
```

## 🎛️ Advanced Configuration

### Engine Options

```typescript
interface UseMurmubaraEngineOptions {
  // Initialization
  autoInitialize?: boolean;      // Auto-init on mount (default: false)
  allowDegraded?: boolean;        // Allow fallback mode (default: true)
  
  // Audio Configuration
  defaultChunkDuration?: number;  // Chunk size in seconds (default: 8)
  bufferSize?: number;           // Audio buffer size (default: 16384)
  sampleRate?: number;           // Sample rate (default: 48000)
  
  // Processing
  enableAGC?: boolean;           // Auto gain control (default: true)
  spectralFloorDb?: number;      // Noise floor (default: -80)
  noiseFloorDb?: number;         // Detection threshold (default: -60)
  denoiseStrength?: number;      // Reduction strength 0-1 (default: 0.85)
  
  // Features
  enableMetrics?: boolean;       // Real-time metrics (default: true)
  metricsUpdateInterval?: number; // Update interval ms (default: 100)
  
  // Logging
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}
```

### Real-time Metrics

```typescript
interface ProcessingMetrics {
  noiseReductionLevel: number;  // 0-100%
  processingLatency: number;    // milliseconds
  inputLevel: number;          // 0-1 (audio level)
  outputLevel: number;         // 0-1 (audio level)
  vadLevel?: number;           // 0-1 (voice activity)
  isVoiceActive?: boolean;     // true when voice detected
  frameCount: number;          // processed frames
  droppedFrames: number;       // performance indicator
  timestamp: number;           // last update time
}
```

### 🎚️ Input Gain Control (New in v3.0.0)

Control input microphone volume level to optimize audio quality:

```typescript
import { useMurmubaraEngine } from 'murmuraba';

function AudioRecorder() {
  const {
    inputGain,        // Current gain level (0.5-3.0)
    setInputGain,     // Update gain level
    getInputGain,     // Get current gain from engine
    // ... other props
  } = useMurmubaraEngine({
    inputGain: 1.5    // Initial gain (optional, default: 1.0)
  });

  return (
    <div>
      <label>Microphone Gain: {inputGain}x</label>
      <input
        type="range"
        min="0.5"
        max="3.0"
        step="0.1"
        value={inputGain}
        onChange={(e) => setInputGain(parseFloat(e.target.value))}
      />
      <div>
        <button onClick={() => setInputGain(0.7)}>🔇 Low</button>
        <button onClick={() => setInputGain(1.0)}>🔊 Normal</button>
        <button onClick={() => setInputGain(1.5)}>📢 High</button>
        <button onClick={() => setInputGain(2.0)}>🚀 Boost</button>
      </div>
    </div>
  );
}
```

**Features:**
- **Dynamic Gain Adjustment**: Change microphone input level in real-time
- **Range**: 0.5x (quieter) to 3.0x (louder) 
- **Default**: 1.0x (no change)
- **Use Cases**:
  - Compensate for quiet microphones
  - Reduce input from loud environments
  - Optimize signal before noise reduction
  - Improve voice clarity

**Technical Details:**
- Implemented using Web Audio API's `GainNode`
- Applied before all audio processing (filters, noise reduction, etc.)
- No quality loss - pure digital gain adjustment
- Prevents clipping with maximum 3.0x limit

## 🔧 Utility Functions

### File Processing

Process audio files with noise reduction:

```typescript
import { processFile, processFileWithMetrics } from 'murmuraba';

// Simple processing
const processedBuffer = await processFile(audioArrayBuffer);

// With detailed metrics
const result = await processFileWithMetrics(audioArrayBuffer);
console.log({
  averageNoiseReduction: result.metrics.averageNoiseReduction,
  voiceActivityPercentage: result.metrics.voiceActivityPercentage,
  averageVAD: result.metrics.averageVAD,
  duration: result.duration
});
```

### Audio Format Conversion

```typescript
import { AudioConverter } from 'murmuraba';

const converter = AudioConverter.getInstance();

// Convert to WAV
const wavBlob = await converter.convertToWav(audioData, sampleRate);

// Convert to MP3
const mp3Blob = await converter.convertToMp3(audioData, sampleRate, bitrate);
```

## 📱 Real-World Examples

### Recording with Custom Chunk Duration

```typescript
function RecordingApp() {
  const [chunkDuration, setChunkDuration] = useState(8);
  const { startRecording, stopRecording, recordingState } = useMurmubaraEngine();

  const handleRecord = () => {
    if (!recordingState.isRecording) {
      startRecording(chunkDuration);
    } else {
      stopRecording();
    }
  };

  return (
    <div>
      <input 
        type="range" 
        min="2" 
        max="30" 
        value={chunkDuration}
        onChange={(e) => setChunkDuration(Number(e.target.value))}
        disabled={recordingState.isRecording}
      />
      <span>{chunkDuration}s chunks</span>
      <button onClick={handleRecord}>
        {recordingState.isRecording ? 'Stop' : 'Record'}
      </button>
    </div>
  );
}
```

### File Upload and Processing

```typescript
function FileProcessor() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const processed = await processFileWithMetrics(arrayBuffer);
      
      setResult({
        originalName: file.name,
        processedBuffer: processed.processedBuffer,
        metrics: processed.metrics,
        duration: processed.duration
      });
      
      // Auto-download processed file
      const blob = new Blob([processed.processedBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="audio/*" 
        onChange={handleFileUpload}
        disabled={processing}
      />
      {processing && <p>Processing...</p>}
      {result && (
        <div>
          <h3>Results:</h3>
          <p>Noise Reduction: {result.metrics.averageNoiseReduction.toFixed(1)}%</p>
          <p>Voice Activity: {result.metrics.voiceActivityPercentage.toFixed(1)}%</p>
          <p>Duration: {result.duration.toFixed(2)}s</p>
        </div>
      )}
    </div>
  );
}
```

### Integrated Audio Recorder with Playback

```typescript
function AudioRecorderWithPlayback() {
  const {
    recordingState,
    startRecording,
    stopRecording,
    toggleChunkPlayback,
    exportChunkAsWav,
    exportChunkAsMp3,
    metrics
  } = useMurmubaraEngine({
    autoInitialize: true,
    enableMetrics: true
  });

  return (
    <div>
      {/* Recording Controls */}
      <button onClick={() => startRecording(10)}>
        Start Recording (10s chunks)
      </button>
      <button onClick={stopRecording} disabled={!recordingState.isRecording}>
        Stop Recording
      </button>

      {/* Real-time Metrics */}
      {metrics && recordingState.isRecording && (
        <div>
          <div>Input Level: {(metrics.inputLevel * 100).toFixed(0)}%</div>
          <div>Noise Reduction: {metrics.noiseReductionLevel.toFixed(1)}%</div>
          <div>Voice Detected: {metrics.isVoiceActive ? 'Yes' : 'No'}</div>
        </div>
      )}

      {/* Recorded Chunks */}
      {recordingState.chunks.map(chunk => (
        <div key={chunk.id}>
          <span>Chunk {chunk.index + 1} ({chunk.duration.toFixed(1)}s)</span>
          <button onClick={() => toggleChunkPlayback(chunk.id, 'processed')}>
            Play Processed
          </button>
          <button onClick={() => toggleChunkPlayback(chunk.id, 'original')}>
            Play Original
          </button>
          <button onClick={() => exportChunkAsWav(chunk.id)}>
            Download WAV
          </button>
          <button onClick={() => exportChunkAsMp3(chunk.id)}>
            Download MP3
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 🏗️ Architecture

### Chunked Recording System

Murmuraba uses a sophisticated chunked recording system that:

1. **Records in fixed-duration segments** - Prevents memory overflow
2. **Processes audio in real-time** - Applies noise reduction during recording
3. **Maintains dual streams** - Keeps both original and processed audio
4. **Enables partial exports** - Download only the chunks you need
5. **Provides per-chunk metrics** - Individual analysis for each segment

### Voice Activity Detection (VAD)

The integrated RNNoise VAD provides:
- Real-time voice detection (0.0 to 1.0 scale)
- Configurable thresholds for voice activity
- Integration with visual components
- Per-chunk voice activity statistics

## 🐛 Troubleshooting

### WASM Loading Issues

```typescript
// Ensure WASM file is accessible
// For Vite projects, add to vite.config.ts:
{
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@jitsi/rnnoise-wasm']
  }
}
```

### Audio Context Errors

```typescript
// Initialize after user interaction
const handleUserClick = async () => {
  await initialize();
  // Now audio context is ready
};
```

### Memory Management

```typescript
// The engine automatically cleans up, but you can force it:
const { destroy } = useMurmubaraEngine();

useEffect(() => {
  return () => {
    destroy(); // Clean up on unmount
  };
}, []);
```

## 📈 Performance

- **Latency**: < 50ms typical processing delay
- **CPU Usage**: 5-15% on modern devices
- **Memory**: ~50MB with WASM loaded
- **Browser Support**: Chrome 80+, Firefox 75+, Safari 14+, Edge 88+

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © Bernard Uriza

## 🔄 Version History

See [CHANGELOG.md](../../CHANGELOG.md) for detailed version history.

### Latest Updates (v2.3.1)
- Fixed WASM module loading
- Added VAD real-time display
- Updated to React 19.1.1
- Improved TypeScript types
- Enhanced chunk recording stability