# MurmurabaSuite UI Components Guide

## Overview

MurmurabaSuite includes a comprehensive set of UI components for audio processing visualization and control. All components are fully typed with TypeScript and designed to work seamlessly with the MurmurabaSuite architecture.

## Available Components

### 1. **SimpleWaveformAnalyzer**
Real-time waveform visualization for audio streams.

```tsx
import { SimpleWaveformAnalyzer } from 'murmuraba';

<SimpleWaveformAnalyzer
  isRecording={true}
  streamId={currentStreamId}
  height={200}
  width={800}
  color="#4CAF50"
  backgroundColor="#1a1a1a"
/>
```

### 2. **ChunkProcessingResults**
Display and manage processed audio chunks with playback controls.

```tsx
import { ChunkProcessingResults } from 'murmuraba';

<ChunkProcessingResults
  chunks={processedChunks}
  selectedChunkId={selectedId}
  onChunkSelect={(id) => setSelectedId(id)}
  onTogglePlayback={(id, type) => handlePlayback(id, type)}
  onDownload={(id, format, type) => handleDownload(id, format, type)}
/>
```

### 3. **AudioPlayer**
Full-featured audio player with custom controls.

```tsx
import { AudioPlayer } from 'murmuraba';

<AudioPlayer
  audioUrl="/path/to/audio.wav"
  title="My Audio"
  onPlay={() => console.log('Playing')}
  onPause={() => console.log('Paused')}
  onEnded={() => console.log('Ended')}
  showDownload={true}
  showVolumeControl={true}
/>
```

### 4. **AdvancedMetricsPanel**
Real-time metrics display panel.

```tsx
import { AdvancedMetricsPanel } from 'murmuraba';

<AdvancedMetricsPanel
  metrics={{
    noiseReductionLevel: 0.85,
    processingLatency: 12,
    inputLevel: 0.7,
    outputLevel: 0.5,
    timestamp: Date.now(),
    frameCount: 1000,
    droppedFrames: 0
  }}
  isVisible={showMetrics}
  position="right"
  onClose={() => setShowMetrics(false)}
/>
```

### 5. **SyncedWaveforms**
Synchronized waveform display for original and processed audio.

```tsx
import { SyncedWaveforms } from 'murmuraba';

<SyncedWaveforms
  originalAudioUrl="/original.wav"
  processedAudioUrl="/processed.wav"
  height={300}
  showControls={true}
  showTimeline={true}
  onTimeUpdate={(time) => console.log('Time:', time)}
/>
```

### 6. **WaveformAnalyzer**
Advanced waveform analyzer with FFT visualization.

```tsx
import { WaveformAnalyzer } from 'murmuraba';

<WaveformAnalyzer
  audioContext={audioContext}
  sourceNode={sourceNode}
  isActive={true}
  showFFT={true}
  showWaveform={true}
  fftSize={2048}
/>
```

### 7. **BuildInfo**
Display build information in various formats.

```tsx
import { BuildInfo } from 'murmuraba';

// Inline format
<BuildInfo />

// Badge format
<BuildInfo format="badge" />

// Block format
<BuildInfo format="block" size="large" />
```

### 8. **ErrorBoundary**
Wrap components to handle errors gracefully.

```tsx
import { ErrorBoundary, withErrorBoundary } from 'murmuraba';

// As wrapper
<ErrorBoundary fallback={<div>Error occurred</div>}>
  <YourComponent />
</ErrorBoundary>

// As HOC
const SafeComponent = withErrorBoundary(YourComponent, {
  fallback: <div>Error occurred</div>
});
```

## Import Methods

### Method 1: Direct from main package
```tsx
import { 
  SimpleWaveformAnalyzer,
  ChunkProcessingResults,
  AudioPlayer,
  // ... other components
} from 'murmuraba';
```

### Method 2: From components subpath (if configured)
```tsx
import { ChunkProcessingResults } from 'murmuraba/components';
```

### Method 3: With types
```tsx
import type { 
  ChunkProcessingResultsProps,
  AudioPlayerProps,
  SimpleWaveformAnalyzerProps 
} from 'murmuraba';
```

## Integration with MurmurabaSuite

All components are designed to work with MurmurabaSuite hooks:

```tsx
function MyAudioApp() {
  const { 
    chunks, 
    isProcessing, 
    isRecording 
  } = useAudioProcessor();
  
  return (
    <>
      {/* Live waveform during recording */}
      {isRecording && (
        <SimpleWaveformAnalyzer
          isRecording={isRecording}
          height={200}
        />
      )}
      
      {/* Show results after processing */}
      {chunks.length > 0 && (
        <ChunkProcessingResults
          chunks={chunks}
          onChunkSelect={(id) => console.log('Selected:', id)}
        />
      )}
    </>
  );
}
```

## Styling

All components support customization through:

1. **CSS Modules**: Components use `.module.css` files
2. **className prop**: Pass custom classes
3. **Style props**: Direct style overrides
4. **Theme variables**: CSS custom properties

```tsx
// Custom styling example
<ChunkProcessingResults
  chunks={chunks}
  className="my-custom-chunks"
  style={{ maxHeight: '400px' }}
/>
```

## Performance Considerations

1. **Lazy Loading**: Components are tree-shakeable
2. **Memoization**: Heavy components are memoized
3. **Virtual Scrolling**: Large lists use virtualization
4. **Web Workers**: Audio processing offloaded

## TypeScript Support

All components are fully typed:

```tsx
import type { ProcessedChunk } from 'murmuraba';

const handleChunkSelect = (chunk: ProcessedChunk) => {
  console.log(chunk.averageVad);
};
```

## Examples

See `/components/MurmurabaUIShowcase.tsx` for a complete showcase of all components.

## Best Practices

1. **Use with hooks**: Leverage `useAudioProcessor` for data
2. **Error handling**: Wrap in ErrorBoundary for production
3. **Accessibility**: All components support ARIA attributes
4. **Performance**: Use React.memo for parent components
5. **Cleanup**: Components handle cleanup automatically

## Troubleshooting

### Components not found
Ensure you're importing from 'murmuraba' main export.

### Style issues
Check that CSS modules are loaded correctly in your bundler.

### TypeScript errors
Update to latest version of murmuraba for newest type definitions.