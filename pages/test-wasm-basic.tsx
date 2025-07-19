import { useState } from 'react';

export default function TestWASMBasic() {
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
      log.push(`Available functions: ${Object.keys(RNNoiseModule).filter(k => k.startsWith('_')).join(', ')}`);
      
      // Test memory allocation
      log.push('\n--- Memory Test ---');
      const ptr1 = RNNoiseModule._malloc(100);
      const ptr2 = RNNoiseModule._malloc(100);
      log.push(`Allocated pointers: ${ptr1}, ${ptr2}`);
      
      // Write and read memory
      for (let i = 0; i < 10; i++) {
        RNNoiseModule.HEAP16[(ptr1 >> 1) + i] = i * 1000;
      }
      
      const readBack = [];
      for (let i = 0; i < 10; i++) {
        readBack.push(RNNoiseModule.HEAP16[(ptr1 >> 1) + i]);
      }
      log.push(`Written and read back: ${readBack.join(', ')}`);
      
      // Test RNNoise functions
      log.push('\n--- RNNoise Functions Test ---');
      
      // Test state creation with different models
      const state0 = RNNoiseModule._rnnoise_create(0);
      const state1 = RNNoiseModule._rnnoise_create(1);
      log.push(`State with model 0: ${state0}`);
      log.push(`State with model 1: ${state1}`);
      
      // Get buffer size if available
      if (RNNoiseModule._rnnoise_get_frame_size) {
        const frameSize = RNNoiseModule._rnnoise_get_frame_size();
        log.push(`Frame size: ${frameSize}`);
      }
      
      // Allocate proper buffers
      const frameSize = 480;
      const inputPtr = RNNoiseModule._malloc(frameSize * 2);
      const outputPtr = RNNoiseModule._malloc(frameSize * 2);
      
      // Test with very simple signal
      log.push('\n--- Simple Signal Test ---');
      for (let i = 0; i < frameSize; i++) {
        // Simple alternating pattern
        RNNoiseModule.HEAP16[(inputPtr >> 1) + i] = (i % 2) ? 1000 : -1000;
      }
      
      // Process
      const vad1 = RNNoiseModule._rnnoise_process_frame(state0, outputPtr, inputPtr);
      log.push(`VAD: ${vad1}`);
      
      // Check output
      const output = [];
      let hasNonZero = false;
      for (let i = 0; i < 20; i++) {
        const val = RNNoiseModule.HEAP16[(outputPtr >> 1) + i];
        output.push(val);
        if (val !== 0) hasNonZero = true;
      }
      log.push(`Output (first 20): ${output.join(', ')}`);
      log.push(`Has non-zero values: ${hasNonZero}`);
      
      // Try processing the same frame multiple times
      log.push('\n--- Multiple Processing Test ---');
      for (let j = 0; j < 3; j++) {
        const vad = RNNoiseModule._rnnoise_process_frame(state0, outputPtr, inputPtr);
        const firstVal = RNNoiseModule.HEAP16[outputPtr >> 1];
        log.push(`Iteration ${j}: VAD=${vad.toFixed(3)}, First output=${firstVal}`);
      }
      
      // Test with actual audio data
      log.push('\n--- Real Audio Pattern Test ---');
      // Fill with a more realistic audio pattern
      for (let i = 0; i < frameSize; i++) {
        const angle = (2 * Math.PI * i * 440) / 48000; // 440Hz at 48kHz
        RNNoiseModule.HEAP16[(inputPtr >> 1) + i] = Math.floor(Math.sin(angle) * 10000);
      }
      
      const vad2 = RNNoiseModule._rnnoise_process_frame(state0, outputPtr, inputPtr);
      const output2 = [];
      for (let i = 0; i < 20; i++) {
        output2.push(RNNoiseModule.HEAP16[(outputPtr >> 1) + i]);
      }
      log.push(`440Hz sine: VAD=${vad2.toFixed(3)}, Output: ${output2.join(', ')}`);
      
      // Clean up
      RNNoiseModule._free(ptr1);
      RNNoiseModule._free(ptr2);
      RNNoiseModule._free(inputPtr);
      RNNoiseModule._free(outputPtr);
      RNNoiseModule._rnnoise_destroy(state0);
      RNNoiseModule._rnnoise_destroy(state1);
      
      log.push('\nDone!');
      
    } catch (err) {
      log.push(`Error: ${err}`);
      console.error(err);
    }
    
    setResults(log);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test WASM Basic</h1>
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