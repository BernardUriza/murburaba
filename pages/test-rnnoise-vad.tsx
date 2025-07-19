import { useState } from 'react';

export default function TestRNNoiseVAD() {
  const [isRecording, setIsRecording] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog(prev => [...prev.slice(-20), msg]);
    console.log(msg);
  };

  const testVAD = async () => {
    try {
      addLog('Loading RNNoise...');
      
      // Load script
      const script = document.createElement('script');
      script.src = '/rnnoise-fixed.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      const createRNNWasmModule = (window as any).createRNNWasmModule;
      const Module = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            return `/dist/${filename}`;
          }
          return filename;
        }
      });

      addLog('Creating state...');
      const state = Module._rnnoise_create(0);
      const inputPtr = Module._malloc(480 * 4);
      const outputPtr = Module._malloc(480 * 4);

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      const audioContext = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      let frameCount = 0;
      const inputBuffer: number[] = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        
        // Add to buffer
        for (let i = 0; i < input.length; i++) {
          inputBuffer.push(input[i]);
        }

        // Process 480-sample frames
        while (inputBuffer.length >= 480) {
          const frame = inputBuffer.splice(0, 480);
          
          // Test 1: Process as Float32
          const floatFrame = new Float32Array(frame);
          Module.HEAPF32.set(floatFrame, inputPtr >> 2);
          const vadFloat = Module._rnnoise_process_frame(state, outputPtr, inputPtr);
          
          // Get output from Float32
          const outputFloat = new Float32Array(480);
          for (let i = 0; i < 480; i++) {
            outputFloat[i] = Module.HEAPF32[(outputPtr >> 2) + i];
          }
          
          // Calculate metrics
          const maxInput = Math.max(...frame.map(Math.abs));
          const maxOutFloat = Math.max(...outputFloat.map(Math.abs));
          const avgInput = frame.reduce((a, b) => a + Math.abs(b), 0) / 480;
          
          frameCount++;
          if (frameCount % 50 === 0) {
            addLog(`Frame ${frameCount}:`);
            addLog(`  Input - Max: ${maxInput.toFixed(4)}, Avg: ${avgInput.toFixed(6)}`);
            addLog(`  Float32 - VAD: ${vadFloat.toFixed(6)}, Max Out: ${maxOutFloat.toFixed(4)}`);
            
            // Check first few samples
            addLog(`  First 5 input: [${frame.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
            addLog(`  First 5 output: [${outputFloat.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
            addLog('---');
          }
        }
        
        // Pass through
        e.outputBuffer.getChannelData(0).set(input);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);

      // Stop after 10 seconds
      setTimeout(() => {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        setIsRecording(false);
        addLog('Test completed!');
      }, 10000);

    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">RNNoise VAD Test</h1>
      
      <p className="mb-4 text-gray-600">
        This test compares Float32 vs Int16 processing to debug VAD issues.
      </p>

      <button
        onClick={testVAD}
        disabled={isRecording}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 mb-4"
      >
        {isRecording ? 'Recording... (10s)' : 'Start VAD Test'}
      </button>

      <div className="bg-gray-100 p-4 rounded font-mono text-sm">
        <div className="max-h-96 overflow-y-auto">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}