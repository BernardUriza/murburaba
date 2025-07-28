# DOM Integration Tests Guide

## Overview

This guide explains how to run integration tests for Murmuraba's noise reduction in a real browser environment with actual audio processing.

## Why Browser Testing?

Murmuraba uses:

- Web Audio API
- WebAssembly (WASM) for RNNoise
- DOM manipulation for script loading
- Real-time audio processing

These features require a real browser environment and cannot be fully tested in Jest/Node.js.

## Test Setup

### 1. Create Test HTML Page

Create `test/integration/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Murmuraba Integration Tests</title>
    <style>
      body {
        font-family: monospace;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      .test-section {
        border: 1px solid #ccc;
        padding: 10px;
        margin: 10px 0;
      }
      .pass {
        color: green;
      }
      .fail {
        color: red;
      }
      .metrics {
        background: #f0f0f0;
        padding: 10px;
        margin: 10px 0;
      }
      button {
        padding: 10px 20px;
        margin: 5px;
        cursor: pointer;
      }
      canvas {
        border: 1px solid #ddd;
        display: block;
        margin: 10px 0;
      }
    </style>
  </head>
  <body>
    <h1>Murmuraba Noise Reduction Tests</h1>

    <div class="test-section">
      <h2>Test Controls</h2>
      <button onclick="runAllTests()">Run All Tests</button>
      <button onclick="clearResults()">Clear Results</button>
    </div>

    <div class="test-section">
      <h2>Audio Input Test</h2>
      <button onclick="testMicrophone()">Test Microphone</button>
      <button onclick="testFileUpload()">Test File Upload</button>
      <input type="file" id="audioFile" accept="audio/*" style="display:none" />
      <div id="audioInputResults"></div>
    </div>

    <div class="test-section">
      <h2>Noise Reduction Tests</h2>
      <button onclick="testWhiteNoise()">Test White Noise</button>
      <button onclick="testPinkNoise()">Test Pink Noise</button>
      <button onclick="testRealWorldAudio()">Test Real Audio</button>
      <div id="noiseReductionResults"></div>
    </div>

    <div class="test-section">
      <h2>Performance Tests</h2>
      <button onclick="testLatency()">Test Latency</button>
      <button onclick="testCPUUsage()">Test CPU Usage</button>
      <div id="performanceResults"></div>
    </div>

    <div class="test-section">
      <h2>Visualizations</h2>
      <canvas id="waveform" width="800" height="200"></canvas>
      <canvas id="spectrum" width="800" height="200"></canvas>
    </div>

    <div id="results" class="metrics"></div>

    <script src="../../dist/murmuraba.js"></script>
    <script src="./test-runner.js"></script>
  </body>
</html>
```

### 2. Create Test Runner

Create `test/integration/test-runner.js`:

```javascript
// Test state
let engine = null;
let audioContext = null;
let results = [];

// Initialize
async function initialize() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    engine = await murmuraba.initializeAudioEngine({
      bufferSize: 4096,
      noiseReductionLevel: 'high',
    });
    log('✓ Engine initialized', 'pass');
    return true;
  } catch (error) {
    log(`✗ Initialization failed: ${error.message}`, 'fail');
    return false;
  }
}

// Test microphone input
async function testMicrophone() {
  if (!(await initialize())) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const controller = await murmuraba.processStream(stream);

    // Analyze audio for 3 seconds
    const metrics = await analyzeAudio(controller.stream, 3000);

    controller.stop();
    stream.getTracks().forEach(track => track.stop());

    displayMetrics('Microphone Test', metrics);
    log('✓ Microphone test complete', 'pass');
  } catch (error) {
    log(`✗ Microphone test failed: ${error.message}`, 'fail');
  }
}

// Test with uploaded file
async function testFileUpload() {
  document.getElementById('audioFile').click();
  document.getElementById('audioFile').onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Process offline
    const processed = await processOffline(audioBuffer);

    // Compare SNR
    const metrics = compareBuffers(audioBuffer, processed);
    displayMetrics('File Upload Test', metrics);
  };
}

// Generate and test white noise
async function testWhiteNoise() {
  if (!(await initialize())) return;

  const duration = 2; // seconds
  const sampleRate = 48000;
  const samples = duration * sampleRate;

  // Generate white noise + sine wave
  const buffer = audioContext.createBuffer(1, samples, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < samples; i++) {
    // 440Hz sine wave + white noise
    data[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / sampleRate) + 0.2 * (Math.random() - 0.5);
  }

  const processed = await processOffline(buffer);
  const metrics = compareBuffers(buffer, processed);

  displayMetrics('White Noise Test', {
    ...metrics,
    expectedReduction: '60-80%',
    actualReduction: `${(metrics.noiseReduction * 100).toFixed(1)}%`,
  });
}

// Analyze audio stream
async function analyzeAudio(stream, duration) {
  return new Promise(resolve => {
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    let samples = [];
    let startTime = Date.now();

    processor.onaudioprocess = e => {
      const inputData = e.inputBuffer.getChannelData(0);
      samples.push(...inputData);

      if (Date.now() - startTime > duration) {
        source.disconnect();
        processor.disconnect();
        analyzer.disconnect();

        const metrics = calculateMetrics(new Float32Array(samples));
        resolve(metrics);
      }
    };

    source.connect(analyzer);
    analyzer.connect(processor);
    processor.connect(audioContext.destination);
  });
}

// Calculate audio metrics
function calculateMetrics(samples) {
  const rms = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
  const peak = Math.max(...samples.map(Math.abs));
  const zeroCrossings = samples.filter((x, i) => i > 0 && x * samples[i - 1] < 0).length;

  // Simple spectral analysis
  const fftSize = 2048;
  const fft = new Float32Array(fftSize);
  // ... FFT implementation or use Web Audio AnalyserNode

  return {
    rms: rms.toFixed(4),
    peak: peak.toFixed(4),
    zeroCrossingRate: (zeroCrossings / samples.length).toFixed(4),
    duration: (samples.length / 48000).toFixed(2) + 's',
    samples: samples.length,
  };
}

// Compare original vs processed
function compareBuffers(original, processed) {
  const origData = original.getChannelData(0);
  const procData = processed.getChannelData(0);

  const origRMS = Math.sqrt(origData.reduce((sum, x) => sum + x * x, 0) / origData.length);
  const procRMS = Math.sqrt(procData.reduce((sum, x) => sum + x * x, 0) / procData.length);

  const noiseReduction = 1 - procRMS / origRMS;

  // Calculate SNR improvement (simplified)
  const snrImprovement = 20 * Math.log10(origRMS / procRMS);

  return {
    originalRMS: origRMS.toFixed(4),
    processedRMS: procRMS.toFixed(4),
    noiseReduction: noiseReduction.toFixed(3),
    snrImprovement: snrImprovement.toFixed(1) + ' dB',
  };
}

// Process audio offline
async function processOffline(audioBuffer) {
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // Apply processing (simplified - real implementation would use Murmuraba)
  const filter = offlineContext.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 80;

  source.connect(filter);
  filter.connect(offlineContext.destination);
  source.start();

  return await offlineContext.startRendering();
}

// UI helpers
function log(message, className = '') {
  const div = document.createElement('div');
  div.className = className;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  document.getElementById('results').appendChild(div);
}

function displayMetrics(testName, metrics) {
  const section = document.createElement('div');
  section.className = 'metrics';
  section.innerHTML = `<h3>${testName}</h3><pre>${JSON.stringify(metrics, null, 2)}</pre>`;
  document.getElementById('results').appendChild(section);
}

function clearResults() {
  document.getElementById('results').innerHTML = '';
  results = [];
}

async function runAllTests() {
  clearResults();
  log('Starting all tests...');

  await testWhiteNoise();
  await testPinkNoise();
  // ... more tests

  log('All tests complete!', 'pass');
}

// Visualization
function visualizeWaveform(samples) {
  const canvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#0066cc';
  ctx.beginPath();

  const step = Math.ceil(samples.length / width);
  for (let i = 0; i < width; i++) {
    const sample = samples[i * step] || 0;
    const y = ((1 - sample) * height) / 2;
    if (i === 0) ctx.moveTo(i, y);
    else ctx.lineTo(i, y);
  }

  ctx.stroke();
}
```

### 3. Running the Tests

1. **Build the library**:

   ```bash
   cd packages/murmuraba
   npm run build
   ```

2. **Start a local server**:

   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js
   npx http-server -p 8000
   ```

3. **Open in browser**:

   ```
   http://localhost:8000/test/integration/index.html
   ```

4. **Run tests**:
   - Click "Run All Tests" to execute the test suite
   - Use individual test buttons for specific scenarios
   - Upload real audio files with noise for realistic testing

## What to Test

### 1. Noise Types

- White noise (random)
- Pink noise (1/f spectrum)
- AC hum (50/60 Hz)
- Background chatter
- Fan/ventilation noise
- Keyboard typing
- Real-world recordings

### 2. Performance Metrics

- Processing latency (<10ms)
- CPU usage (<20%)
- Memory usage
- No audio dropouts
- Consistent frame timing

### 3. Quality Metrics

- SNR improvement (>10dB)
- Speech intelligibility
- No artifacts or distortion
- Smooth noise gating
- Natural sound preservation

## Expected Results

### Good Performance

- White noise: 60-80% reduction
- Pink noise: 50-70% reduction
- AC hum: 80-90% reduction
- Latency: <10ms per frame
- CPU: <15% on modern hardware

### Common Issues

1. **Clicking/popping**: Check buffer boundaries
2. **Over-suppression**: Adjust threshold
3. **Voice distortion**: Check VAD sensitivity
4. **High CPU**: Optimize processing path

## Debugging Tips

1. **Enable verbose logging**:

   ```javascript
   murmuraba.initializeAudioEngine({
     logLevel: 'debug',
     onLog: (level, msg) => console.log(`[${level}] ${msg}`),
   });
   ```

2. **Monitor performance**:

   ```javascript
   murmuraba.onMetricsUpdate(metrics => {
     console.log('Metrics:', metrics);
   });
   ```

3. **Check browser compatibility**:
   - Chrome/Edge: Full support
   - Firefox: Check WASM flags
   - Safari: Limited Web Audio support

## Contributing Test Cases

To add new test cases:

1. Record real-world audio with specific noise types
2. Save as 48kHz mono WAV files
3. Add to `test/fixtures/` directory
4. Update test runner with new scenarios

Remember: Real-world testing reveals issues that unit tests miss!
