import { useState, useRef } from 'react';

export default function TestRNNoiseFinal() {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rnnoiseRef = useRef<any>(null);

  const startTest = async () => {
    const logMessages: string[] = [];
    const log = (msg: string) => {
      logMessages.push(msg);
      setLogs([...logMessages]);
    };

    try {
      // Load RNNoise
      log('Loading RNNoise...');
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

      log('Module loaded');

      // Create RNNoise state
      const state = RNNoiseModule._rnnoise_create(0);
      const inputPtr = RNNoiseModule._malloc(480 * 2);
      const outputPtr = RNNoiseModule._malloc(480 * 2);

      log(`State: ${state}, Input: ${inputPtr}, Output: ${outputPtr}`);

      // Test with known signal first
      log('\nTesting with synthetic signal...');
      const testSignal = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        testSignal[i] = Math.floor(Math.sin(2 * Math.PI * 440 * i / 48000) * 5000);
      }

      RNNoiseModule.HEAP16.set(testSignal, inputPtr >> 1);
      const testVad = RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);

      const testOutput = new Int16Array(
        RNNoiseModule.HEAP16.buffer,
        outputPtr,
        480
      );

      let nonZero = 0;
      for (let i = 0; i < 480; i++) {
        if (testOutput[i] !== 0) nonZero++;
      }

      log(`Test VAD: ${testVad.toFixed(3)}, Non-zero: ${nonZero}/480`);

      // Store everything
      rnnoiseRef.current = {
        module: RNNoiseModule,
        state,
        inputPtr,
        outputPtr
      };

      // Setup audio processing
      log('\nSetting up real-time audio processing...');
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      let frameCount = 0;
      let inputBuffer: number[] = [];
      let processedFrames = 0;

      processorRef.current.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);

        // Add to buffer
        for (let i = 0; i < input.length; i++) {
          inputBuffer.push(input[i]);
        }

        // Process when we have 480 samples
        while (inputBuffer.length >= 480 && rnnoiseRef.current) {
          const frame = inputBuffer.splice(0, 480);
          
          // Convert to PCM
          const pcmData = new Int16Array(480);
          for (let i = 0; i < 480; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(frame[i] * 32768)));
          }

          // Copy to WASM
          rnnoiseRef.current.module.HEAP16.set(pcmData, rnnoiseRef.current.inputPtr >> 1);

          // Process
          const vad = rnnoiseRef.current.module._rnnoise_process_frame(
            rnnoiseRef.current.state,
            rnnoiseRef.current.outputPtr,
            rnnoiseRef.current.inputPtr
          );

          // Get output
          const outputData = new Int16Array(
            rnnoiseRef.current.module.HEAP16.buffer,
            rnnoiseRef.current.outputPtr,
            480
          );

          processedFrames++;

          // Log every 100 frames
          if (processedFrames % 100 === 0) {
            const maxIn = Math.max(...pcmData.map(Math.abs));
            const maxOut = Math.max(...outputData.map(Math.abs));
            let nonZeroOut = 0;
            for (let i = 0; i < 480; i++) {
              if (outputData[i] !== 0) nonZeroOut++;
            }

            log(`Frame ${processedFrames}: VAD=${vad.toFixed(3)}, MaxIn=${maxIn}, MaxOut=${maxOut}, NonZero=${nonZeroOut}`);
          }
        }

        // Fill output with silence for this test
        output.fill(0);
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      log('\nRecording started! Speak into your microphone...');
      setIsRecording(true);

    } catch (err) {
      log(`Error: ${err}`);
      console.error(err);
    }
  };

  const stopTest = () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (rnnoiseRef.current) {
      const { module, state, inputPtr, outputPtr } = rnnoiseRef.current;
      module._rnnoise_destroy(state);
      module._free(inputPtr);
      module._free(outputPtr);
    }
    setIsRecording(false);
    setLogs(prev => [...prev, '\nTest stopped.']);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test RNNoise Final</h1>
      <div>
        <button onClick={startTest} disabled={isRecording}>
          Start Test
        </button>
        <button onClick={stopTest} disabled={!isRecording} style={{ marginLeft: '10px' }}>
          Stop Test
        </button>
      </div>
      <pre style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        whiteSpace: 'pre-wrap',
        fontSize: '12px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        {logs.join('\n')}
      </pre>
    </div>
  );
}