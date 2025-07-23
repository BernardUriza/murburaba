# processFile API Documentation

The `processFile` method allows you to process WAV files with RNNoise noise reduction without requiring real-time streaming.

## Method Signature

```typescript
async processFile(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer>
```

## Requirements

- **Input Format**: PCM 16-bit mono 48kHz WAV file
- **Engine State**: The Murmuraba engine must be initialized before calling this method

## Usage Example

### Basic Usage

```javascript
import { initializeAudioEngine, processFile, destroyEngine } from 'murmuraba';

// Initialize the engine
await initializeAudioEngine({
  logLevel: 'info',
  noiseReductionLevel: 'medium'
});

// Read a WAV file
const response = await fetch('/path/to/audio.wav');
const arrayBuffer = await response.arrayBuffer();

// Process the file
const processedArrayBuffer = await processFile(arrayBuffer);

// Create a blob for playback or download
const blob = new Blob([processedArrayBuffer], { type: 'audio/wav' });
const url = URL.createObjectURL(blob);

// Play the processed audio
const audio = new Audio(url);
audio.play();

// Clean up when done
await destroyEngine();
```

### With React Hook

```javascript
import { useMurmubaraEngine } from 'murmuraba';

function AudioProcessor() {
  const { initialize, processFile, isInitialized } = useMurmubaraEngine();
  
  const handleFileUpload = async (file) => {
    if (!isInitialized) {
      await initialize();
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const processed = await processFile(arrayBuffer);
    
    // Use the processed audio...
  };
  
  return (
    <input 
      type="file" 
      accept=".wav" 
      onChange={(e) => handleFileUpload(e.target.files[0])}
    />
  );
}
```

## Processing Details

1. **WAV Header Parsing**: The method validates the WAV file format
2. **Frame Processing**: Audio is processed in 480-sample frames (10ms at 48kHz)
3. **Real-time Logging**: Each frame logs VAD (Voice Activity Detection) and RMS values
4. **Output Format**: Returns a new WAV file with the same format as input

## Frame-by-Frame Metrics

During processing, the following metrics are logged for each frame:

- **VAD (Voice Activity Detection)**: 0.0 to 1.0 value indicating voice presence
- **Input RMS**: Root Mean Square of the input signal
- **Output RMS**: Root Mean Square of the processed signal
- **Noise Reduction**: Percentage of noise removed

## Error Handling

The method will throw errors for:

- Invalid WAV file format
- Unsupported audio format (must be PCM)
- Unsupported channel count (must be mono)
- Unsupported sample rate (must be 48kHz)
- Unsupported bit depth (must be 16-bit)
- Engine not initialized

## Performance Considerations

- Processing time depends on file size
- Approximately 100-200ms per second of audio on modern hardware
- Memory usage is proportional to file size
- Large files may require significant memory

## Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Murmuraba File Processor</title>
</head>
<body>
  <input type="file" id="fileInput" accept=".wav">
  <button id="processBtn">Process</button>
  <audio id="output" controls style="display:none"></audio>

  <script type="module">
    import { initializeAudioEngine, processFile } from './murmuraba.esm.js';
    
    let isInitialized = false;
    
    document.getElementById('processBtn').addEventListener('click', async () => {
      const fileInput = document.getElementById('fileInput');
      const file = fileInput.files[0];
      
      if (!file) {
        alert('Please select a file');
        return;
      }
      
      try {
        // Initialize if needed
        if (!isInitialized) {
          await initializeAudioEngine();
          isInitialized = true;
        }
        
        // Process file
        const arrayBuffer = await file.arrayBuffer();
        const processed = await processFile(arrayBuffer);
        
        // Play result
        const blob = new Blob([processed], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = document.getElementById('output');
        audio.src = url;
        audio.style.display = 'block';
        
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    });
  </script>
</body>
</html>
```