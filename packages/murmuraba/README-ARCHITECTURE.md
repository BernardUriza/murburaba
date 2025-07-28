# Murmuraba Package Architecture

## 🧨 BRUTAL v2.0 - MurmurabaSuite Era

### 🔥 BREAKING CHANGE: Complete Architecture Overhaul

**Legacy hooks ELIMINATED. MurmurabaSuite is the ONLY way forward.**

## Current State (v2.0)

### ✅ What's Inside the Package (MODERN)

- **🧨 MurmurabaSuite**: DI-based React Context architecture - THE MAIN API
- **Services Layer**: AudioProcessorService with full dependency injection
- **Core Engine**: MurmubaraEngine class with complete audio processing pipeline
- **Managers**: WorkerManager, MetricsManager, ChunkProcessor
- **Audio Utils**: AudioConverter (WAV/MP3), AudioStreamManager
- **DI Container**: Complete dependency injection system with decorators
- **Types**: Full TypeScript interfaces and types
- **React Hooks**: Modern suite-based hooks only

### ❌ ELIMINATED (No longer exists)

- ~~useMurmubaraEngine hook~~ - **DELETED**
- ~~useRecordingState hook~~ - **DELETED**
- ~~Recording managers~~ - **DELETED**
- ~~Legacy hook architecture~~ - **DELETED**
- ~~useAudioEngine (deprecated)~~ - **DELETED**

## 🎯 THE ONLY API: MurmurabaSuite

### Modern Usage Pattern:

```typescript
import {
  MurmurabaSuite,
  useAudioProcessing,
  useMurmurabaSuite,
  useAudioProcessor
} from 'murmuraba';

function App() {
  return (
    <MurmurabaSuite
      logLevel="info"
      services={{
        audioProcessor: true,
        metricsManager: true
      }}
    >
      <AudioComponent />
    </MurmurabaSuite>
  );
}

function AudioComponent() {
  // 🔥 Modern hooks - DI powered
  const { processFile, processRecording, isProcessing } = useAudioProcessing();
  const processor = useAudioProcessor();
  const { getService } = useMurmurabaSuite();

  // getUserMedia is handled automatically in processRecording()
  const handleRecord = async () => {
    const result = await processRecording(30000, {
      chunkDuration: 8000,
      enableAGC: false
    });
  };

  const handleFile = async (file: File) => {
    const result = await processFile(file, {
      chunkDuration: 8000
    });
  };
}
```

## 🏗️ Architecture Layers

### 1. React Context Layer (MurmurabaSuite)

- **MurmurabaSuite**: Main React provider component
- **Context Management**: Service injection and lifecycle
- **Lazy Loading**: Services loaded on-demand
- **Configuration**: Centralized config management

### 2. Services Layer

- **AudioProcessorService**: Main audio processing service
- **ServiceLoader**: Dynamic service loading
- **DI Container**: Dependency injection container
- **Decorators**: @Injectable, @Singleton, @Log, @Measure

### 3. Hooks Layer (Suite-based only)

- **useAudioProcessing()**: File and recording processing
- **useAudioProcessor()**: Direct processor access
- **useMurmurabaSuite()**: Container and service access
- **useSuiteLogger()**: Logging service access

### 4. Core Engine Layer

- **MurmubaraEngine**: Core audio processing
- **EngineRegistry**: Engine instance management
- **State Management**: Centralized state handling
- **Event System**: Engine event broadcasting

### 5. Utilities Layer

- **AudioConverter**: Format conversion (WAV/MP3)
- **AudioStreamManager**: Stream lifecycle management
- **WorkerManager**: Web Workers coordination
- **MetricsManager**: Performance metrics

## 🎯 Service Architecture

### Dependency Injection Flow:

```typescript
// 1. Services are registered in DIContainer
container.bind(TOKENS.AudioProcessor, AudioProcessorService);
container.bind(TOKENS.Logger, Logger);

// 2. MurmurabaSuite provides container via React Context
<MurmurabaSuite> // Creates and provides DIContainer

// 3. Hooks consume services via container
const processor = useAudioProcessor(); // Gets from container
const { processFile } = useAudioProcessing(); // Uses processor service
```

### Available Services:

- **AudioProcessor**: Main processing service with getUserMedia
- **Logger**: Structured logging service
- **MetricsManager**: Performance tracking
- **WorkerManager**: Background processing
- **ServiceLoader**: Dynamic module loading

## 📦 Package Exports (v2.0)

```typescript
// 🔥 MODERN API - Only MurmurabaSuite exports
import {
  // Main Suite
  MurmurabaSuite,

  // Modern Hooks
  useMurmurabaSuite,
  useAudioProcessor,
  useAudioProcessing,
  useSuiteLogger,

  // DI System
  TOKENS,
  SUITE_TOKENS,
  DIContainer,

  // Services
  AudioProcessorService,

  // Types
  IAudioProcessor,
  AudioProcessingOptions,
  AudioProcessingResult,

  // Components (if needed)
  SimpleWaveformAnalyzer,
  ChunkProcessingResults,
  // ... other UI components
} from 'murmuraba';
```

## 🚀 Zero Setup Usage

```bash
npm install murmuraba
```

```tsx
import { MurmurabaSuite, useAudioProcessing } from 'murmuraba';

function App() {
  return (
    <MurmurabaSuite>
      <RecordingComponent />
    </MurmurabaSuite>
  );
}

function RecordingComponent() {
  const { processRecording, isProcessing } = useAudioProcessing();

  const startRecording = async () => {
    // getUserMedia + noise reduction + chunking - all automatic
    const result = await processRecording(30000, {
      chunkDuration: 8000,
    });

    console.log(`Processed ${result.chunks.length} chunks`);
  };

  return (
    <button onClick={startRecording} disabled={isProcessing}>
      {isProcessing ? 'Recording...' : 'Start Recording'}
    </button>
  );
}
```

## 🧨 What Makes it "BRUTAL Suite"

### 1. **Real-time Processing Pipeline**

- RNNoise neural network noise reduction
- Real-time getUserMedia stream processing
- Automatic chunking and segmentation
- Dual stream handling (original + processed)

### 2. **Modern Architecture**

- Dependency injection throughout
- Service-oriented design
- React Context for state management
- Lazy service loading
- Full TypeScript support

### 3. **Zero Configuration**

- Works out of the box
- Sensible defaults
- Automatic resource management
- Memory leak prevention

### 4. **Production Ready**

- Error boundaries
- Retry mechanisms
- Performance monitoring
- Graceful degradation
- Worker support

### 5. **Developer Experience**

- Modern React hooks
- Full TypeScript IntelliSense
- Comprehensive error messages
- Built-in diagnostics
- Extensive logging

## 🎯 Migration from Legacy

### ❌ OLD WAY (DELETED):

```typescript
// This no longer exists - REMOVED
const hook = useMurmubaraEngine(options);
```

### ✅ NEW WAY (ONLY WAY):

```typescript
// Use MurmurabaSuite context
<MurmurabaSuite>
  <Component />
</MurmurabaSuite>

// Modern hooks in components
const { processFile } = useAudioProcessing();
```

## 🔧 Advanced Configuration

```typescript
<MurmurabaSuite
  logLevel="debug"
  bufferSize={2048}
  algorithm="rnnoise"
  services={{
    audioProcessor: true,
    metricsManager: true,
    workerManager: false
  }}
  lazy={false} // Load all services immediately
>
  <App />
</MurmurabaSuite>
```

---

**🧨 ARQUITECTURA BRUTAL: Una sola forma de hacer las cosas. MurmurabaSuite o nada.**
