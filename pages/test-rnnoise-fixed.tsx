import { useState } from 'react';

export default function TestRNNoiseFixed() {
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
      
      // Test with speech-like signal
      log.push('\n--- Processing Speech Signal ---');
      const speech = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        const t = i / 48000;
        speech[i] = Math.floor(
          5000 * Math.sin(2 * Math.PI * 200 * t) +
          2500 * Math.sin(2 * Math.PI * 400 * t) +
          (Math.random() - 0.5) * 500
        );
      }
      
      // Copy to WASM memory
      RNNoiseModule.HEAP16.set(speech, inputPtr >> 1);
      
      // Process 5 frames to see if output changes
      for (let frame = 0; frame < 5; frame++) {
        const vad = RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
        
        // Read output correctly - using new Int16Array with byte offset
        const outputData = new Int16Array(
          RNNoiseModule.HEAP16.buffer,
          outputPtr,
          480
        );
        
        // Count non-zero samples
        let nonZeroCount = 0;
        let maxValue = 0;
        for (let i = 0; i < 480; i++) {
          if (outputData[i] !== 0) nonZeroCount++;
          maxValue = Math.max(maxValue, Math.abs(outputData[i]));
        }
        
        log.push(`Frame ${frame}: VAD=${vad.toFixed(3)}, Non-zero: ${nonZeroCount}/480, Max: ${maxValue}`);
        
        // Show first few output values
        const firstValues = [];
        for (let i = 0; i < 10; i++) {
          firstValues.push(outputData[i]);
        }
        log.push(`  First 10 values: ${firstValues.join(', ')}`);
      }
      
      // Test with noise
      log.push('\n--- Processing White Noise ---');
      const noise = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        noise[i] = Math.floor((Math.random() - 0.5) * 10000);
      }
      
      RNNoiseModule.HEAP16.set(noise, inputPtr >> 1);
      
      for (let frame = 0; frame < 3; frame++) {
        const vad = RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
        
        const outputData = new Int16Array(
          RNNoiseModule.HEAP16.buffer,
          outputPtr,
          480
        );
        
        let nonZeroCount = 0;
        let maxValue = 0;
        for (let i = 0; i < 480; i++) {
          if (outputData[i] !== 0) nonZeroCount++;
          maxValue = Math.max(maxValue, Math.abs(outputData[i]));
        }
        
        log.push(`Noise frame ${frame}: VAD=${vad.toFixed(3)}, Non-zero: ${nonZeroCount}/480, Max: ${maxValue}`);
      }
      
      // Clean up
      RNNoiseModule._free(inputPtr);
      RNNoiseModule._free(outputPtr);
      RNNoiseModule._rnnoise_destroy(state);
      
      log.push('\nDone!');
      
    } catch (err) {
      log.push(`Error: ${err}`);
      console.error(err);
    }
    
    setResults(log);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test RNNoise Fixed</h1>
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