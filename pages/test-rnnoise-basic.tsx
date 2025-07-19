import { useState } from 'react';

export default function TestRNNoiseBasic() {
  const [log, setLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log(message);
  };

  const testRNNoise = async () => {
    setIsProcessing(true);
    setLog([]);
    
    try {
      // Load RNNoise
      addLog('Loading RNNoise script...');
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/rnnoise-fixed.js';
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });

      addLog('Creating WASM module...');
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      const Module = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            return `/dist/${filename}`;
          }
          return filename;
        }
      });

      addLog('Creating RNNoise state...');
      const state = Module._rnnoise_create(0);
      addLog(`State created: ${state}`);

      if (!state) {
        throw new Error('Failed to create state');
      }

      // Allocate memory
      const inputPtr = Module._malloc(480 * 2);
      const outputPtr = Module._malloc(480 * 2);
      addLog(`Memory allocated - Input: ${inputPtr}, Output: ${outputPtr}`);

      // Test 1: Silent frame
      addLog('\n--- Test 1: Silent frame ---');
      const silentFrame = new Int16Array(480);
      Module.HEAP16.set(silentFrame, inputPtr >> 1);
      const vadSilent = Module._rnnoise_process_frame(state, outputPtr, inputPtr);
      addLog(`VAD for silence: ${vadSilent}`);

      // Test 2: Pure tone (1kHz)
      addLog('\n--- Test 2: Pure tone (1kHz) ---');
      const toneFrame = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        toneFrame[i] = Math.floor(Math.sin(2 * Math.PI * 1000 * i / 48000) * 16000);
      }
      Module.HEAP16.set(toneFrame, inputPtr >> 1);
      const vadTone = Module._rnnoise_process_frame(state, outputPtr, inputPtr);
      
      const toneOutput = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        toneOutput[i] = Module.HEAP16[(outputPtr >> 1) + i];
      }
      
      const maxInput = Math.max(...toneFrame.map(Math.abs));
      const maxOutput = Math.max(...toneOutput.map(Math.abs));
      addLog(`VAD for tone: ${vadTone}`);
      addLog(`Max input amplitude: ${maxInput}`);
      addLog(`Max output amplitude: ${maxOutput}`);
      addLog(`First 5 output samples: ${Array.from(toneOutput.slice(0, 5))}`);

      // Test 3: White noise
      addLog('\n--- Test 3: White noise ---');
      const noiseFrame = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        noiseFrame[i] = Math.floor((Math.random() - 0.5) * 10000);
      }
      Module.HEAP16.set(noiseFrame, inputPtr >> 1);
      const vadNoise = Module._rnnoise_process_frame(state, outputPtr, inputPtr);
      
      const noiseOutput = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        noiseOutput[i] = Module.HEAP16[(outputPtr >> 1) + i];
      }
      
      const maxNoiseIn = Math.max(...noiseFrame.map(Math.abs));
      const maxNoiseOut = Math.max(...noiseOutput.map(Math.abs));
      addLog(`VAD for noise: ${vadNoise}`);
      addLog(`Max noise input: ${maxNoiseIn}`);
      addLog(`Max noise output: ${maxNoiseOut}`);
      addLog(`Reduction: ${((1 - maxNoiseOut/maxNoiseIn) * 100).toFixed(1)}%`);

      // Test 4: Speech-like signal (mix of frequencies)
      addLog('\n--- Test 4: Speech-like signal ---');
      const speechFrame = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        // Mix of frequencies typical in speech
        speechFrame[i] = Math.floor(
          (Math.sin(2 * Math.PI * 200 * i / 48000) * 5000 +
           Math.sin(2 * Math.PI * 800 * i / 48000) * 3000 +
           Math.sin(2 * Math.PI * 2000 * i / 48000) * 2000 +
           (Math.random() - 0.5) * 1000)
        );
      }
      Module.HEAP16.set(speechFrame, inputPtr >> 1);
      const vadSpeech = Module._rnnoise_process_frame(state, outputPtr, inputPtr);
      
      const speechOutput = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        speechOutput[i] = Module.HEAP16[(outputPtr >> 1) + i];
      }
      
      const maxSpeechIn = Math.max(...speechFrame.map(Math.abs));
      const maxSpeechOut = Math.max(...speechOutput.map(Math.abs));
      addLog(`VAD for speech-like: ${vadSpeech}`);
      addLog(`Max speech input: ${maxSpeechIn}`);
      addLog(`Max speech output: ${maxSpeechOut}`);

      // Cleanup
      Module._free(inputPtr);
      Module._free(outputPtr);
      Module._rnnoise_destroy(state);
      
      addLog('\n✅ All tests completed!');
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">RNNoise Basic Test</h1>
      
      <button
        onClick={testRNNoise}
        disabled={isProcessing}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 mb-4"
      >
        {isProcessing ? 'Testing...' : 'Run RNNoise Test'}
      </button>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Test Log:</h2>
        <pre className="text-sm whitespace-pre-wrap font-mono">
          {log.length > 0 ? log.join('\n') : 'Click "Run RNNoise Test" to start'}
        </pre>
      </div>
    </div>
  );
}