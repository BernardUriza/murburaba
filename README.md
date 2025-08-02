# 🎵 Murmuraba Studio v3.0.0 - Next-Generation Neural Audio Processing! 🚀

**¡LA VERSIÓN 3.0.0 ESTÁ AQUÍ!** 🔥 Una plataforma completa de procesamiento de audio neural con diseño moderno revolucionario. Potenciada por RNNoise con un sistema de diseño glassmorphism de última generación y arquitectura React 19 optimizada.

## 🎯 Overview

Murmuraba provides a complete audio processing solution with a powerful React hook (`useMurmubaraEngine`) that handles **everything internally** - from recording to playback, with automatic format conversion and cross-browser compatibility. Built on RNNoise technology, it delivers state-of-the-art noise suppression with an ultra-clean API.

### 🌟 **VERSION 3.0.0 - EL DISEÑO DEL FUTURO**
- **🎨 Sistema de Diseño Completo**: Glassmorphism, gradientes animados y efectos neón modernos
- **🎯 Single Source of Truth**: Sistema de versionado unificado con `version.json`
- **⚡ React 19 Optimizado**: Selectores memorizados y rendimiento extremo
- **🎪 Arquitectura Modular**: Componentes organizados con patrones modernos
- **🌈 Tokens de Diseño**: Variables CSS para colores, espaciado y tipografía consistentes
- **📱 Responsive Avanzado**: Mobile-first con interacciones táctiles optimizadas

## 🚀 Features

### Core Features
- **Real-time Noise Reduction**: Process audio streams using RNNoise neural network
- **Advanced Chunked Recording**: Automatic audio chunking with configurable duration
- **Multi-format Support**: Automatic audio format detection and conversion
- **Cross-browser Playback**: Built-in audio converter ensures playback compatibility
- **Comprehensive State Management**: Full recording state with pause/resume support
- **Performance Metrics**: Real-time latency, noise reduction, and processing metrics
- **Waveform Visualization**: Live audio waveform display with synced playback

### ⚡ **3.0.0 - CARACTERÍSTICAS VISUALES REVOLUCIONARIAS**
- **🎨 Glassmorphism Effects**: Paneles flotantes con efectos de cristal y blur
- **🌈 Gradient Animations**: Animaciones de gradiente fluidas en tiempo real
- **💫 Neon Glow Effects**: Efectos de neón para elementos interactivos
- **🎯 Modern Design System**: Tokens CSS consistentes y mantenibles
- **📱 Enhanced Responsiveness**: Diseño móvil mejorado con gestos táctiles
- **⚡ Performance Optimized**: Animaciones GPU aceleradas y transiciones suaves
- **🎪 Component Architecture**: Organización modular con React 19 patterns
- **🌟 Dark Theme Enhanced**: Optimizaciones de tema oscuro con mejor contraste

### 🏗️ **Clean Architecture Benefits**
- **Frontend Developers**: Just import hook and render - no complex logic
- **Package Users**: Full-featured audio processing in any React app
- **Maintainers**: Clean separation between UI and audio processing

## 📋 Prerequisites

- Node.js 16.x or higher
- npm or yarn
- Modern browser with WebAudio API support

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/murmuraba.git
cd murmuraba
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎨 ¡Usa el Paquete NPM v3.0.0!

### Instalación
```bash
npm install murmuraba@3.0.0
# o
yarn add murmuraba@3.0.0
```

🔥 **¡NUEVO EN v3.0.0!** Diseño moderno completo, sistema de diseño integrado, optimizaciones React 19.

### Basic Usage
```typescript
import { useMurmubaraEngine } from 'murmuraba';

function MyAudioApp() {
  const {
    // State
    isInitialized,
    recordingState,
    metrics,
    diagnostics,
    
    // Recording controls
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecordings,
    
    // Playback controls
    toggleChunkPlayback,
    toggleChunkExpansion,
    
    // Utilities
    formatTime,
    getAverageNoiseReduction
  } = useMurmubaraEngine({
    autoInitialize: true,
    defaultChunkDuration: 8
  });

  return (
    <div>
      <button onClick={() => startRecording()}>
        Start Recording
      </button>
      
      {recordingState.chunks.map(chunk => (
        <div key={chunk.id}>
          <span>Chunk {chunk.id}: {formatTime(chunk.duration / 1000)}</span>
          <button onClick={() => toggleChunkPlayback(chunk.id, 'original')}>
            Play Original
          </button>
          <button onClick={() => toggleChunkPlayback(chunk.id, 'processed')}>
            Play Processed
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Hook API Reference

#### Options
```typescript
interface UseMurmubaraEngineOptions {
  autoInitialize?: boolean;          // Auto-initialize on mount (default: false)
  defaultChunkDuration?: number;      // Chunk duration in seconds (default: 8)
  noiseReductionLevel?: string;      // 'low' | 'medium' | 'high' (default: 'high')
  bufferSize?: number;               // Audio buffer size (default: 2048)
  logLevel?: string;                 // Logging level
}
```

#### Return Values
```typescript
interface UseMurmubaraEngineReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  engineState: EngineState;
  metrics: ProcessingMetrics | null;
  diagnostics: DiagnosticInfo | null;
  recordingState: RecordingState;
  currentStream: MediaStream | null;
  
  // Actions
  initialize: () => Promise<void>;
  destroy: (force?: boolean) => Promise<void>;
  startRecording: (chunkDuration?: number) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecordings: () => void;
  toggleChunkPlayback: (chunkId: string, audioType: 'processed' | 'original') => Promise<void>;
  toggleChunkExpansion: (chunkId: string) => void;
  
  // Utilities
  formatTime: (seconds: number) => string;
  getAverageNoiseReduction: () => number;
  resetError: () => void;
}
```

#### Recording State
```typescript
interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  chunks: ProcessedChunk[];
}

interface ProcessedChunk {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  noiseRemoved: number;
  metrics: ChunkMetrics;
  processedAudioUrl?: string;
  originalAudioUrl?: string;
  isPlaying: boolean;
  isExpanded: boolean;
}
```

## 🏗️ Project Structure

```
murmuraba/
├── packages/murmuraba/          # NPM package source
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useMurmubaraEngine.ts  # Main hook with all features
│   │   ├── utils/
│   │   │   └── audioConverter.ts      # Audio format converter
│   │   ├── core/                      # Core engine components
│   │   └── index.ts                   # Package exports
├── components/
│   ├── WaveformAnalyzer.tsx   # Audio waveform visualization
│   └── SyncedWaveforms.tsx    # Dual waveform display
├── hooks/
│   └── useMurmubaraEngine.ts  # Re-exports from package
└── pages/
    └── index.tsx              # Demo application
```

## 🔧 Technical Implementation

### RNNoise Integration

The project uses RNNoise through WebAssembly for maximum performance:

```typescript
// Initialize RNNoise
const RNNoiseModule = await createRNNWasmModule({
  locateFile: (filename: string) => {
    if (filename.endsWith('.wasm')) {
      return `/dist/${filename}`;
    }
    return filename;
  }
});

// Create noise suppression state
const state = RNNoiseModule._rnnoise_create(0);
```

### Audio Processing Pipeline

1. **Capture**: Get audio from microphone at 48kHz
2. **Buffer**: Accumulate 480 samples (RNNoise requirement)
3. **Process**: Apply RNNoise neural network
4. **Gate**: Apply energy-based silence detection
5. **Output**: Return processed audio stream

### Key Components

#### useRNNoise Hook
Handles RNNoise initialization and audio processing:
- Loads WebAssembly module
- Manages audio context and processing nodes
- Implements energy-based gating
- Provides clean API for stream processing

#### useAudioRecorder Hook
Manages recording functionality:
- Handles dual recording (with/without noise reduction)
- Manages chunk-based recording
- Coordinates with Web Worker for timing
- Creates audio blobs for playback

## 📊 How It Works

### Noise Reduction Algorithm

RNNoise uses a recurrent neural network trained on diverse audio samples to distinguish between speech and noise. The implementation adds energy-based gating for enhanced silence detection:

```typescript
// Energy-based gating
if (avgEnergy < silenceThreshold) {
  // Heavy attenuation for silence
  processedFrame = processedFrame.map(s => s * 0.1);
} else if (avgEnergy < speechThreshold) {
  // Gradual attenuation
  const factor = (avgEnergy - silenceThreshold) / 
                 (speechThreshold - silenceThreshold);
  const attenuation = 0.1 + 0.9 * factor;
  processedFrame = processedFrame.map(s => s * attenuation);
}
```

### Performance Optimizations

- Uses ScriptProcessorNode for compatibility (AudioWorklet support planned)
- Processes in 480-sample frames for optimal RNNoise performance
- Implements double buffering to prevent audio glitches
- Energy history averaging reduces processing artifacts

## 🎮 Usage

1. **Enable Noise Reduction**: Toggle the switch to activate RNNoise
2. **Start Recording**: Click "Iniciar Grabación" to begin
3. **Adjust Chunk Duration**: Use the slider to set recording chunk size
4. **Compare Results**: Play back both versions to hear the difference

## 🔍 API Reference

### useRNNoise Hook

```typescript
const {
  isInitialized,     // RNNoise ready state
  isLoading,         // Loading state
  error,             // Error message if any
  processStream,     // Function to process MediaStream
  cleanup,           // Cleanup function
  initializeRNNoise  // Manual initialization
} = useRNNoise();
```

### useAudioRecorder Hook

```typescript
const {
  isRecording,                  // Recording state
  audioChunks,                  // Recorded chunks array
  chunkDuration,                // Current chunk duration
  startRecording,               // Start recording function
  stopRecording,                // Stop recording function
  setChunkDuration,             // Update chunk duration
  clearChunks,                  // Clear all recordings
  isNoiseSuppressionEnabled,    // Noise reduction state
  setNoiseSuppressionEnabled    // Toggle noise reduction
} = useAudioRecorder(options);
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [RNNoise](https://github.com/xiph/rnnoise) by Jean-Marc Valin
- [Jitsi RNNoise WASM](https://github.com/jitsi/rnnoise-wasm) for the WebAssembly build
- Next.js team for the amazing framework

## 📚 Learn More

- [RNNoise Paper](https://jmvalin.ca/demo/rnnoise/) - Original RNNoise documentation
- [WebAudio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - MDN documentation
- [WebAssembly](https://webassembly.org/) - Official WebAssembly site

## 🚀 Next Level: Microfrontend Export Analysis

### Hypothetical Case: RNNoise as a Microfrontend Module

Converting this RNNoise implementation into a microfrontend architecture would enable it to be consumed as an independent, framework-agnostic audio processing service. Here's an analysis of how this could be achieved:

#### Architecture Considerations

1. **Module Federation Approach**
   - Use Webpack 5's Module Federation to expose the RNNoise functionality
   - Export key hooks and components as federated modules
   - Allow host applications to dynamically import the noise reduction capability

2. **Web Components Strategy**
   - Wrap the RNNoise functionality in Custom Elements
   - Create `<rnnoise-processor>` and `<rnnoise-toggle>` web components
   - Ensure framework independence through standard web APIs

3. **Standalone Service Pattern**
   - Deploy as a separate microservice with Web Audio API endpoints
   - Provide WebSocket/WebRTC connections for real-time processing
   - Offer REST API for batch audio processing

#### Implementation Approach

```javascript
// Hypothetical microfrontend export configuration
module.exports = {
  name: 'rnnoiseModule',
  filename: 'remoteEntry.js',
  exposes: {
    './RNNoiseProcessor': './lib/audio/useRNNoise',
    './AudioRecorder': './hooks/useAudioRecorder',
    './RNNoiseToggle': './components/RNNoiseToggle'
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true }
  }
};
```

#### Benefits of Microfrontend Architecture

1. **Technology Agnostic**: Can be used with React, Vue, Angular, or vanilla JS
2. **Independent Deployment**: Update noise reduction without touching main app
3. **Team Autonomy**: Audio team can work independently
4. **Performance Isolation**: WASM processing in separate context
5. **Reusability**: Single implementation across multiple products

#### Technical Challenges

1. **WASM Loading**: Cross-origin WASM loading requires proper CORS setup
2. **Audio Context Sharing**: Managing AudioContext across microfrontend boundaries
3. **State Synchronization**: Coordinating recording state between modules
4. **Bundle Size**: WASM files need efficient CDN distribution
5. **Browser Compatibility**: Ensuring consistent behavior across browsers

#### Recommended Architecture

```
┌─────────────────────────────────────────┐
│         Host Application                │
│  (React/Vue/Angular/Vanilla)           │
├─────────────────────────────────────────┤
│         Microfrontend Shell            │
│    (Module Federation Runtime)          │
├─────────────────────────────────────────┤
│      RNNoise Microfrontend             │
│  ┌─────────────────────────────┐       │
│  │   Web Component Wrapper     │       │
│  ├─────────────────────────────┤       │
│  │   RNNoise Core Module       │       │
│  │   - WASM Loader             │       │
│  │   - Audio Processor         │       │
│  │   - Stream Manager          │       │
│  └─────────────────────────────┘       │
└─────────────────────────────────────────┘
```

#### Migration Path

1. **Phase 1**: Extract core RNNoise logic into standalone package
2. **Phase 2**: Create Web Component wrappers
3. **Phase 3**: Implement Module Federation configuration
4. **Phase 4**: Setup CDN for WASM distribution
5. **Phase 5**: Create example integrations for different frameworks

This microfrontend approach would transform the RNNoise implementation from a Next.js-specific solution into a universal audio processing module that can enhance any web application with real-time noise reduction capabilities.

---

🚀 **Murmuraba Studio v3.0.0** - Construido con 💪 pasión por el diseño moderno usando React 19 y RNNoise

### 🎊 ¿Por qué v3.0.0 es REVOLUCIONARIA?

- **🎨 Diseño del Futuro**: Sistema completo de glassmorphism y efectos modernos
- **⚡ Performance Visual**: Animaciones GPU aceleradas y transiciones fluidas
- **🌈 Sistema de Tokens**: Diseño consistente con variables CSS organizadas
- **📱 Mobile Perfection**: Experiencia móvil optimizada con gestos táctiles
- **🎯 Single Source**: Versionado unificado y arquitectura modular
- **🔧 React 19 Optimized**: Patrones modernos y rendimiento máximo

### 🔥 El Futuro del Diseño Web Audio Comienza AHORA

¡Únete a la revolución visual del procesamiento de audio! Con Murmuraba Studio v3.0.0, tu aplicación no solo suena increíble... ¡SE VE ESPECTACULAR!

**#MurmurabaStudio3 #DesignRevolution #ModernUI #GlassmorphismAudio**