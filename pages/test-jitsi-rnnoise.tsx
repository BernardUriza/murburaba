import { useState, useRef } from 'react';

export default function TestJitsiRNNoise() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rnnoiseRef = useRef<any>(null);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toISOString().split('T')[1]}: ${message}`]);
    console.log(message);
  };

  const initializeRNNoise = async () => {
    try {
      addLog('Loading Jitsi RNNoise...');
      
      // Load the Jitsi RNNoise module
      const script = document.createElement('script');
      script.src = '/rnnoise-jitsi.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      addLog('Creating module...');
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      const Module = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename === 'rnnoise.wasm') {
            return '/dist/rnnoise-jitsi.wasm';
          }
          return filename;
        }
      });

      addLog('Module created, creating state...');
      const state = Module._rnnoise_create(0);
      
      if (!state) {
        throw new Error('Failed to create RNNoise state');
      }

      // Allocate memory for float32 processing
      const inputPtr = Module._malloc(480 * 4);
      const outputPtr = Module._malloc(480 * 4);
      
      addLog(`State: ${state}, Input: ${inputPtr}, Output: ${outputPtr}`);
      
      // Store everything
      rnnoiseRef.current = {
        module: Module,
        state,
        inputPtr,
        outputPtr,
        inputBuffer: [],
        outputBuffer: []
      };

      addLog('✅ RNNoise initialized successfully!');
      return true;
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      return false;
    }
  };

  const startRecording = async () => {
    setIsProcessing(true);
    setLog([]);
    
    try {
      // Initialize RNNoise first
      const initialized = await initializeRNNoise();
      if (!initialized) return;

      addLog('Getting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create script processor
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      let processedFrames = 0;
      processorRef.current.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        
        if (!rnnoiseRef.current) {
          output.set(input);
          return;
        }
        
        // Add to input buffer
        for (let i = 0; i < input.length; i++) {
          rnnoiseRef.current.inputBuffer.push(input[i]);
        }
        
        // Process 480-sample frames
        while (rnnoiseRef.current.inputBuffer.length >= 480) {
          const frame = rnnoiseRef.current.inputBuffer.splice(0, 480);
          const floatFrame = new Float32Array(frame);
          
          // Copy to WASM heap
          rnnoiseRef.current.module.HEAPF32.set(floatFrame, rnnoiseRef.current.inputPtr >> 2);
          
          // Process
          const vadProb = rnnoiseRef.current.module._rnnoise_process_frame(
            rnnoiseRef.current.state,
            rnnoiseRef.current.outputPtr,
            rnnoiseRef.current.inputPtr
          );
          
          // Get output
          const outputFrame = new Float32Array(480);
          for (let i = 0; i < 480; i++) {
            outputFrame[i] = rnnoiseRef.current.module.HEAPF32[(rnnoiseRef.current.outputPtr >> 2) + i];
          }
          
          // Log occasionally
          processedFrames++;
          if (processedFrames % 100 === 0) {
            const maxIn = Math.max(...floatFrame.map(Math.abs));
            const maxOut = Math.max(...outputFrame.map(Math.abs));
            addLog(`Frame ${processedFrames}: VAD=${vadProb.toFixed(3)}, MaxIn=${maxIn.toFixed(3)}, MaxOut=${maxOut.toFixed(3)}`);
          }
          
          // Add to output buffer
          for (let i = 0; i < 480; i++) {
            rnnoiseRef.current.outputBuffer.push(outputFrame[i]);
          }
        }
        
        // Output processed audio
        for (let i = 0; i < output.length; i++) {
          if (rnnoiseRef.current.outputBuffer.length > 0) {
            output[i] = rnnoiseRef.current.outputBuffer.shift();
          } else {
            output[i] = 0;
          }
        }
      };
      
      // Connect nodes
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      addLog('🎙️ Recording with noise suppression...');
      setIsRecording(true);
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (rnnoiseRef.current) {
      const { module, state, inputPtr, outputPtr } = rnnoiseRef.current;
      module._free(inputPtr);
      module._free(outputPtr);
      module._rnnoise_destroy(state);
    }
    
    setIsRecording(false);
    addLog('⏹️ Recording stopped');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Jitsi RNNoise</h1>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={startRecording}
          disabled={isProcessing || isRecording}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isProcessing ? 'Initializing...' : 'Start Recording'}
        </button>
        
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Stop Recording
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold mb-2">Log:</h2>
        <pre className="text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
          {log.length > 0 ? log.join('\n') : 'Click "Start Recording" to test'}
        </pre>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>This test uses Jitsi's official RNNoise WASM build.</p>
        <p>Speak into your microphone to test noise suppression.</p>
      </div>
    </div>
  );
}