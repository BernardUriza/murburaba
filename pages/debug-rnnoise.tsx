import { useState } from 'react';

export default function DebugRNNoise() {
  const [log, setLog] = useState<string[]>([]);

  const runDebug = async () => {
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setLog([...logs]);
    };

    try {
      // Load script
      addLog('Loading script...');
      const script = document.createElement('script');
      script.src = '/rnnoise-fixed.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      // Create module
      addLog('Creating module...');
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      const RNNoiseModule = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            return `/dist/${filename}`;
          }
          return filename;
        }
      });

      // Create multiple states to test
      addLog('Creating states...');
      const states = [];
      for (let i = 0; i < 3; i++) {
        const state = RNNoiseModule._rnnoise_create(0);
        states.push(state);
        addLog(`State ${i}: ${state}`);
      }

      // Test with each state
      const inputPtr = RNNoiseModule._malloc(480 * 2);
      const outputPtr = RNNoiseModule._malloc(480 * 2);
      
      addLog(`Memory: input=${inputPtr}, output=${outputPtr}`);

      // Create test signal
      const testSignal = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        testSignal[i] = Math.floor(Math.sin(2 * Math.PI * 1000 * i / 48000) * 5000);
      }

      // Test each state multiple times
      for (let stateIdx = 0; stateIdx < states.length; stateIdx++) {
        addLog(`\n--- Testing state ${stateIdx} ---`);
        
        for (let frame = 0; frame < 3; frame++) {
          // Copy input
          RNNoiseModule.HEAP16.set(testSignal, inputPtr >> 1);
          
          // Process
          const vad = RNNoiseModule._rnnoise_process_frame(
            states[stateIdx], 
            outputPtr, 
            inputPtr
          );
          
          // Read output different ways
          const output1 = [];
          const output2 = [];
          const output3 = [];
          
          // Method 1: Direct HEAP16 access
          for (let i = 0; i < 10; i++) {
            output1.push(RNNoiseModule.HEAP16[(outputPtr >> 1) + i]);
          }
          
          // Method 2: New Int16Array with subarray
          const arr2 = RNNoiseModule.HEAP16.subarray(outputPtr >> 1, (outputPtr >> 1) + 10);
          for (let i = 0; i < 10; i++) {
            output2.push(arr2[i]);
          }
          
          // Method 3: New Int16Array with buffer
          const arr3 = new Int16Array(RNNoiseModule.HEAP16.buffer, outputPtr, 10);
          for (let i = 0; i < 10; i++) {
            output3.push(arr3[i]);
          }
          
          addLog(`Frame ${frame}: VAD=${vad.toFixed(3)}`);
          addLog(`  Method 1: ${output1.join(', ')}`);
          addLog(`  Method 2: ${output2.join(', ')}`);
          addLog(`  Method 3: ${output3.join(', ')}`);
        }
      }

      // Clean up
      for (const state of states) {
        RNNoiseModule._rnnoise_destroy(state);
      }
      RNNoiseModule._free(inputPtr);
      RNNoiseModule._free(outputPtr);
      
      addLog('\nDone!');
      
    } catch (err) {
      addLog(`Error: ${err}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug RNNoise</h1>
      <button onClick={runDebug}>Run Debug</button>
      <pre style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f0f0f0',
        fontSize: '12px',
        whiteSpace: 'pre-wrap'
      }}>
        {log.join('\n')}
      </pre>
    </div>
  );
}