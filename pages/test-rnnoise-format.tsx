import { useState } from 'react';

export default function TestRNNoiseFormat() {
  const [results, setResults] = useState<string[]>([]);

  const runTest = async () => {
    const log: string[] = [];
    
    try {
      // Load RNNoise
      const script = document.createElement('script');
      script.src = '/rnnoise-fixed.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      const RNNoiseModule = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            return `/dist/${filename}`;
          }
          return filename;
        }
      });
      
      log.push('Module loaded');
      
      // Create state and allocate memory
      const state = RNNoiseModule._rnnoise_create(0);
      const inputPtr = RNNoiseModule._malloc(480 * 2);
      const outputPtr = RNNoiseModule._malloc(480 * 2);
      
      log.push(`State: ${state}, Input: ${inputPtr}, Output: ${outputPtr}`);
      
      // Test 1: Process silence
      log.push('\n--- Test 1: Silence ---');
      const silence = new Int16Array(480);
      RNNoiseModule.HEAP16.set(silence, inputPtr >> 1);
      const vadSilence = RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
      
      const outputSilence = [];
      for (let i = 0; i < 20; i++) {
        outputSilence.push(RNNoiseModule.HEAP16[(outputPtr >> 1) + i]);
      }
      log.push(`VAD: ${vadSilence}, Output: ${outputSilence.join(', ')}`);
      
      // Test 2: Process noise
      log.push('\n--- Test 2: White noise ---');
      const noise = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        noise[i] = Math.floor((Math.random() - 0.5) * 10000);
      }
      RNNoiseModule.HEAP16.set(noise, inputPtr >> 1);
      const vadNoise = RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
      
      const outputNoise = [];
      for (let i = 0; i < 20; i++) {
        outputNoise.push(RNNoiseModule.HEAP16[(outputPtr >> 1) + i]);
      }
      log.push(`VAD: ${vadNoise}, Output: ${outputNoise.join(', ')}`);
      
      // Test 3: Process speech-like signal (vowel sound)
      log.push('\n--- Test 3: Speech-like (vowel) ---');
      const speech = new Int16Array(480);
      // Simulate vowel with harmonics
      for (let i = 0; i < 480; i++) {
        const t = i / 48000;
        speech[i] = Math.floor(
          5000 * Math.sin(2 * Math.PI * 200 * t) +  // Fundamental
          2500 * Math.sin(2 * Math.PI * 400 * t) +  // 2nd harmonic
          1250 * Math.sin(2 * Math.PI * 600 * t) +  // 3rd harmonic
          (Math.random() - 0.5) * 500               // Some noise
        );
      }
      RNNoiseModule.HEAP16.set(speech, inputPtr >> 1);
      const vadSpeech = RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
      
      const outputSpeech = [];
      for (let i = 0; i < 20; i++) {
        outputSpeech.push(RNNoiseModule.HEAP16[(outputPtr >> 1) + i]);
      }
      log.push(`VAD: ${vadSpeech}, Output: ${outputSpeech.join(', ')}`);
      
      // Test 4: Check if output changes over time
      log.push('\n--- Test 4: Multiple frames of same signal ---');
      for (let frame = 0; frame < 5; frame++) {
        RNNoiseModule.HEAP16.set(speech, inputPtr >> 1);
        const vad = RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
        
        const output = [];
        let nonZeroCount = 0;
        for (let i = 0; i < 480; i++) {
          const val = RNNoiseModule.HEAP16[(outputPtr >> 1) + i];
          if (val !== 0) nonZeroCount++;
          if (i < 10) output.push(val);
        }
        
        log.push(`Frame ${frame}: VAD=${vad.toFixed(3)}, Non-zero samples: ${nonZeroCount}/480, First 10: [${output.join(', ')}]`);
      }
      
      // Test 5: Create a new state and test
      log.push('\n--- Test 5: New state ---');
      const state2 = RNNoiseModule._rnnoise_create(0);
      RNNoiseModule.HEAP16.set(speech, inputPtr >> 1);
      const vadNew = RNNoiseModule._rnnoise_process_frame(state2, outputPtr, inputPtr);
      
      const outputNew = [];
      for (let i = 0; i < 20; i++) {
        outputNew.push(RNNoiseModule.HEAP16[(outputPtr >> 1) + i]);
      }
      log.push(`New state: ${state2}, VAD: ${vadNew}, Output: ${outputNew.join(', ')}`);
      
      // Clean up
      RNNoiseModule._rnnoise_destroy(state);
      RNNoiseModule._rnnoise_destroy(state2);
      RNNoiseModule._free(inputPtr);
      RNNoiseModule._free(outputPtr);
      
      log.push('\nDone!');
      
    } catch (err) {
      log.push(`Error: ${err}`);
    }
    
    setResults(log);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test RNNoise Format</h1>
      <button onClick={runTest}>Run Test</button>
      <pre style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f0f0f0',
        whiteSpace: 'pre-wrap',
        fontSize: '12px'
      }}>
        {results.join('\n')}
      </pre>
    </div>
  );
}