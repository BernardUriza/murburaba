# Voice Activity Detection (VAD) Implementation

## Overview

This document describes the implementation of Voice Activity Detection (VAD) functionality in the Murmuraba package, including the `murmubaraVAD` function and audio metadata extraction utilities.

## Background

The current Susurro hook contains placeholder VAD implementations that need to be replaced with real implementations from the Murmuraba engine. This implementation provides:

1. **Real VAD Analysis**: Accurate voice activity detection using RNNoise and custom algorithms
2. **Audio Metadata Extraction**: Proper duration calculation and format detection
3. **Voice Segment Detection**: Identification of continuous voice segments with timestamps

## Implementation Details

### 1. murmubaraVAD Function

The `murmubaraVAD` function analyzes audio buffers and returns detailed voice activity metrics.

**Function Signature:**
```typescript
export async function murmubaraVAD(buffer: ArrayBuffer): Promise<{
  average: number;      // Real average VAD score (0.0 to 1.0)
  scores: number[];     // Frame-by-frame VAD scores
  metrics: Array<{      // Detailed metrics per frame
    timestamp: number;
    vadScore: number;
    energy: number;
    zeroCrossingRate: number;
  }>;
  voiceSegments?: Array<{  // Optional voice segments
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
}>
```

**Implementation Strategy:**
- Uses RNNoise for neural network-based VAD when available
- Falls back to energy-based detection with zero-crossing rate analysis
- Processes audio in 20ms frames (standard for speech processing)
- Applies adaptive thresholding based on noise floor estimation
- Includes temporal smoothing to reduce false positives

### 2. extractAudioMetadata Function

Extracts accurate metadata from audio buffers by parsing file headers.

**Function Signature:**
```typescript
export function extractAudioMetadata(buffer: ArrayBuffer): {
  duration: number;      // Actual duration in seconds
  sampleRate: number;    // Real sample rate from audio header
  channels: number;      // Real channel count
  bitDepth: number;      // Bits per sample
  format: string;        // Audio format (wav, mp3, webm, etc.)
}
```

**Supported Formats:**
- WAV (PCM, IEEE Float)
- MP3 (via ID3 tags and frame headers)
- WebM/Opus (via container parsing)
- Raw PCM (with assumptions)

### 3. Voice Segment Detection

Identifies continuous voice segments with:
- Start and end timestamps
- Average confidence score per segment
- Minimum segment duration filtering (100ms default)
- Gap bridging for natural speech patterns

## Algorithm Details

### VAD Algorithm Components

1. **Energy-based Detection**
   - Calculate RMS energy for each frame
   - Compare against adaptive threshold
   - Account for background noise level

2. **Zero-Crossing Rate (ZCR)**
   - Count sign changes in the audio signal
   - Higher ZCR indicates unvoiced speech or noise
   - Lower ZCR suggests voiced speech

3. **Spectral Features**
   - Spectral centroid for frequency distribution
   - Spectral rolloff for high-frequency content
   - Used to distinguish speech from noise

4. **Neural Network VAD (RNNoise)**
   - When available, use RNNoise's pre-trained model
   - Provides robust VAD probability (0-1)
   - Handles various noise conditions well

5. **Temporal Smoothing**
   - Apply median filter to reduce spurious detections
   - Use hangover time to prevent choppy segments
   - Bridge small gaps in speech

### Performance Optimizations

1. **Efficient Buffer Processing**
   - Use typed arrays for fast computation
   - Process in chunks to avoid blocking
   - Reuse buffers where possible

2. **Web Workers**
   - Offload heavy computation to workers
   - Maintain responsive UI during analysis

3. **Caching**
   - Cache computed features for repeated analysis
   - Store noise profile for adaptive thresholding

## Testing Strategy

### Unit Tests
- Test each algorithm component independently
- Verify accuracy with known test signals
- Check edge cases (silence, pure noise, mixed content)

### Integration Tests
- Test with real audio files
- Verify compatibility with Susurro hook
- Check performance with large files

### Test Cases
1. **Accuracy Tests**
   - Speech with 70% activity → expect ~70% VAD
   - Pure silence → expect 0% VAD
   - Pure noise → expect low VAD with proper threshold

2. **Duration Tests**
   - Known duration files → accuracy within 0.1s
   - Various formats (WAV, MP3, WebM)
   - Different sample rates and bit depths

3. **Segment Detection**
   - Clear speech segments → accurate boundaries
   - Speech with pauses → proper gap handling
   - Noisy speech → robust detection

## Integration with Susurro

Replace placeholder implementations:

```typescript
// In useSusurro.ts
import { murmubaraVAD, extractAudioMetadata } from 'murmuraba';

// Replace analyzeVAD
const analyzeVAD = useCallback(async (buffer: ArrayBuffer): Promise<VADAnalysisResult> => {
  const result = await murmubaraVAD(buffer);
  return result;
}, []);

// Replace calculateDuration
const calculateDuration = (buffer: ArrayBuffer): number => {
  const metadata = extractAudioMetadata(buffer);
  return metadata.duration;
};
```

## File Structure

```
packages/murmuraba/src/
├── vad/
│   ├── index.ts              # Main exports
│   ├── murmuraba-vad.ts      # Core VAD implementation
│   ├── audio-metadata.ts     # Metadata extraction
│   ├── algorithms/
│   │   ├── energy-vad.ts     # Energy-based VAD
│   │   ├── zcr-vad.ts        # Zero-crossing rate
│   │   ├── spectral-vad.ts   # Spectral features
│   │   └── segment-detector.ts # Voice segment detection
│   └── __tests__/
│       ├── murmuraba-vad.test.ts
│       ├── audio-metadata.test.ts
│       └── test-audio/       # Test audio files
└── index.ts                  # Updated exports
```

## Performance Requirements

- Process 5-minute audio in < 500ms
- Support real-time processing for streaming
- Memory usage < 50MB for typical files
- Accurate to within ±5% for VAD percentage
- Duration accurate to within 0.1 seconds

## Implementation Status

### Completed Features ✅

1. **Core VAD Implementation**
   - Energy-based VAD with adaptive thresholding
   - Zero-crossing rate analysis
   - RNNoise integration when available
   - Temporal smoothing with median filter
   - Voice segment detection with configurable parameters

2. **Audio Metadata Extraction**
   - WAV format parsing (PCM and IEEE Float)
   - MP3 format detection and basic parsing
   - WebM/Opus format detection
   - Fallback for unknown formats

3. **Module Structure**
   ```
   packages/murmuraba/src/vad/
   ├── index.ts                    ✅ Main exports
   ├── types.ts                    ✅ Type definitions
   ├── murmuraba-vad.ts           ✅ Core VAD implementation
   ├── audio-metadata.ts          ✅ Metadata extraction
   ├── algorithms/
   │   ├── energy-vad.ts          ✅ Energy-based VAD
   │   ├── zcr-vad.ts            ✅ Zero-crossing rate
   │   └── segment-detector.ts    ✅ Voice segment detection
   └── __tests__/
       ├── murmuraba-vad.test.ts  ✅ VAD tests
       └── audio-metadata.test.ts ✅ Metadata tests
   ```

4. **Package Exports**
   - Functions exported from main package index
   - Type definitions available
   - Ready for integration with Susurro

### Usage Example

```typescript
import { murmubaraVAD, extractAudioMetadata } from 'murmuraba';

// Analyze VAD
const vadResult = await murmubaraVAD(audioBuffer);
console.log(`Voice activity: ${(vadResult.average * 100).toFixed(1)}%`);
console.log(`Detected ${vadResult.voiceSegments.length} voice segments`);

// Extract metadata
const metadata = extractAudioMetadata(audioBuffer);
console.log(`Duration: ${metadata.duration}s`);
console.log(`Format: ${metadata.format}`);
console.log(`Sample rate: ${metadata.sampleRate}Hz`);
```

## Future Enhancements

1. **Advanced Features**
   - Speaker diarization support
   - Language detection integration
   - Emotion detection capabilities

2. **Optimization**
   - SIMD acceleration for compatible browsers
   - GPU acceleration via WebGL
   - Streaming VAD for real-time applications

3. **Additional Formats**
   - AAC/M4A support
   - FLAC support
   - OGG/Vorbis support

## References

- [RNNoise: Learning Noise Suppression](https://jmvalin.ca/demo/rnnoise/)
- [WebRTC VAD](https://webrtc.org/experiments/rnn-vad/)
- [Speech Processing Fundamentals](https://www.sciencedirect.com/topics/computer-science/voice-activity-detection)