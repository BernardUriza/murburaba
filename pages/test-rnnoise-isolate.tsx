import { useState } from 'react';

export default function TestRNNoiseIsolate() {
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
      
      // Test 1: Create state and process immediately
      log.push('\n--- Test 1: Fresh state immediate processing ---');
      const state1 = RNNoiseModule._rnnoise_create(0);
      const inputPtr1 = RNNoiseModule._malloc(480 * 2);
      const outputPtr1 = RNNoiseModule._malloc(480 * 2);
      
      // Create speech-like signal
      const speech = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        const t = i / 48000;
        speech[i] = Math.floor(
          5000 * Math.sin(2 * Math.PI * 200 * t) +
          2500 * Math.sin(2 * Math.PI * 400 * t) +
          (Math.random() - 0.5) * 500
        );
      }
      
      // Process immediately
      RNNoiseModule.HEAP16.set(speech, inputPtr1 >> 1);
      const vad1 = RNNoiseModule._rnnoise_process_frame(state1, outputPtr1, inputPtr1);
      
      let nonZero1 = 0;
      for (let i = 0; i < 480; i++) {
        if (RNNoiseModule.HEAP16[(outputPtr1 >> 1) + i] !== 0) nonZero1++;
      }
      log.push(`Immediate: VAD=${vad1.toFixed(3)}, Non-zero: ${nonZero1}/480`);
      
      // Test 2: Process same signal again
      log.push('\n--- Test 2: Same state, second frame ---');
      RNNoiseModule.HEAP16.set(speech, inputPtr1 >> 1);
      const vad2 = RNNoiseModule._rnnoise_process_frame(state1, outputPtr1, inputPtr1);
      
      let nonZero2 = 0;
      for (let i = 0; i < 480; i++) {
        if (RNNoiseModule.HEAP16[(outputPtr1 >> 1) + i] !== 0) nonZero2++;
      }
      log.push(`Second frame: VAD=${vad2.toFixed(3)}, Non-zero: ${nonZero2}/480`);
      
      // Test 3: New state with same memory
      log.push('\n--- Test 3: New state, reuse memory ---');
      const state2 = RNNoiseModule._rnnoise_create(0);
      RNNoiseModule.HEAP16.set(speech, inputPtr1 >> 1);
      const vad3 = RNNoiseModule._rnnoise_process_frame(state2, outputPtr1, inputPtr1);
      
      let nonZero3 = 0;
      for (let i = 0; i < 480; i++) {
        if (RNNoiseModule.HEAP16[(outputPtr1 >> 1) + i] !== 0) nonZero3++;
      }
      log.push(`New state: VAD=${vad3.toFixed(3)}, Non-zero: ${nonZero3}/480`);
      
      // Test 4: Completely fresh allocation
      log.push('\n--- Test 4: Fresh state and memory ---');
      const state3 = RNNoiseModule._rnnoise_create(0);
      const inputPtr2 = RNNoiseModule._malloc(480 * 2);
      const outputPtr2 = RNNoiseModule._malloc(480 * 2);
      
      RNNoiseModule.HEAP16.set(speech, inputPtr2 >> 1);
      const vad4 = RNNoiseModule._rnnoise_process_frame(state3, outputPtr2, inputPtr2);
      
      let nonZero4 = 0;
      for (let i = 0; i < 480; i++) {
        if (RNNoiseModule.HEAP16[(outputPtr2 >> 1) + i] !== 0) nonZero4++;
      }
      log.push(`Fresh everything: VAD=${vad4.toFixed(3)}, Non-zero: ${nonZero4}/480`);
      
      // Test 5: Check if model parameter matters
      log.push('\n--- Test 5: Different model parameter ---');
      const state4 = RNNoiseModule._rnnoise_create(1); // Try model 1
      const inputPtr3 = RNNoiseModule._malloc(480 * 2);
      const outputPtr3 = RNNoiseModule._malloc(480 * 2);
      
      RNNoiseModule.HEAP16.set(speech, inputPtr3 >> 1);
      const vad5 = RNNoiseModule._rnnoise_process_frame(state4, outputPtr3, inputPtr3);
      
      let nonZero5 = 0;
      for (let i = 0; i < 480; i++) {
        if (RNNoiseModule.HEAP16[(outputPtr3 >> 1) + i] !== 0) nonZero5++;
      }
      log.push(`Model 1: VAD=${vad5.toFixed(3)}, Non-zero: ${nonZero5}/480`);
      
      // Test 6: Check memory values before and after
      log.push('\n--- Test 6: Memory inspection ---');
      const state5 = RNNoiseModule._rnnoise_create(0);
      const inputPtr4 = RNNoiseModule._malloc(480 * 2);
      const outputPtr4 = RNNoiseModule._malloc(480 * 2);
      
      // Clear output memory first
      for (let i = 0; i < 480; i++) {
        RNNoiseModule.HEAP16[(outputPtr4 >> 1) + i] = 0;
      }
      
      // Set input
      RNNoiseModule.HEAP16.set(speech, inputPtr4 >> 1);
      
      // Check input values
      const inputCheck = [];
      for (let i = 0; i < 5; i++) {
        inputCheck.push(RNNoiseModule.HEAP16[(inputPtr4 >> 1) + i]);
      }
      log.push(`Input values: ${inputCheck.join(', ')}`);
      
      // Process
      const vad6 = RNNoiseModule._rnnoise_process_frame(state5, outputPtr4, inputPtr4);
      
      // Check output values
      const outputCheck = [];
      for (let i = 0; i < 5; i++) {
        outputCheck.push(RNNoiseModule.HEAP16[(outputPtr4 >> 1) + i]);
      }
      log.push(`Output values: ${outputCheck.join(', ')}, VAD: ${vad6.toFixed(3)}`);
      
      // Test 7: Try with different sample rates worth of data
      log.push('\n--- Test 7: Process multiple consecutive frames ---');
      const state6 = RNNoiseModule._rnnoise_create(0);
      const inputPtr5 = RNNoiseModule._malloc(480 * 2);
      const outputPtr5 = RNNoiseModule._malloc(480 * 2);
      
      for (let frame = 0; frame < 10; frame++) {
        // Generate slightly different signal each frame
        const signal = new Int16Array(480);
        for (let i = 0; i < 480; i++) {
          const t = (frame * 480 + i) / 48000;
          signal[i] = Math.floor(
            5000 * Math.sin(2 * Math.PI * 200 * t) +
            2500 * Math.sin(2 * Math.PI * 400 * t) +
            (Math.random() - 0.5) * 500
          );
        }
        
        RNNoiseModule.HEAP16.set(signal, inputPtr5 >> 1);
        const vad = RNNoiseModule._rnnoise_process_frame(state6, outputPtr5, inputPtr5);
        
        let nonZero = 0;
        for (let i = 0; i < 480; i++) {
          if (RNNoiseModule.HEAP16[(outputPtr5 >> 1) + i] !== 0) nonZero++;
        }
        
        if (frame === 0 || frame === 1 || frame === 9) {
          log.push(`Frame ${frame}: VAD=${vad.toFixed(3)}, Non-zero: ${nonZero}/480`);
        }
      }
      
      // Clean up
      RNNoiseModule._free(inputPtr1);
      RNNoiseModule._free(outputPtr1);
      RNNoiseModule._free(inputPtr2);
      RNNoiseModule._free(outputPtr2);
      RNNoiseModule._free(inputPtr3);
      RNNoiseModule._free(outputPtr3);
      RNNoiseModule._free(inputPtr4);
      RNNoiseModule._free(outputPtr4);
      RNNoiseModule._free(inputPtr5);
      RNNoiseModule._free(outputPtr5);
      RNNoiseModule._rnnoise_destroy(state1);
      RNNoiseModule._rnnoise_destroy(state2);
      RNNoiseModule._rnnoise_destroy(state3);
      RNNoiseModule._rnnoise_destroy(state4);
      RNNoiseModule._rnnoise_destroy(state5);
      RNNoiseModule._rnnoise_destroy(state6);
      
      log.push('\nDone!');
      
    } catch (err) {
      log.push(`Error: ${err}`);
      console.error(err);
    }
    
    setResults(log);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test RNNoise Isolation</h1>
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