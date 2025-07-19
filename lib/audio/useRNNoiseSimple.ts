import { useEffect, useRef, useState } from 'react';

export const useRNNoiseSimple = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rnnoiseRef = useRef<any>(null);

  const initializeRNNoise = async () => {
    if (isInitialized || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[RNNoise Simple] Starting initialization...');
      
      // Load script
      const script = document.createElement('script');
      script.src = '/rnnoise-fixed.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      console.log('[RNNoise Simple] Script loaded');
      
      // Create module
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      const RNNoiseModule = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            return `/dist/${filename}`;
          }
          return filename;
        }
      });
      
      console.log('[RNNoise Simple] Module created');
      
      // Create state
      const state = RNNoiseModule._rnnoise_create(0);
      if (!state) {
        throw new Error('Failed to create RNNoise state');
      }
      
      // Allocate memory for int16 samples (2 bytes per sample)
      const inputPtr = RNNoiseModule._malloc(480 * 2);
      const outputPtr = RNNoiseModule._malloc(480 * 2);
      
      if (!inputPtr || !outputPtr) {
        throw new Error('Failed to allocate memory');
      }
      
      console.log('[RNNoise Simple] State:', state, 'Ptrs:', inputPtr, outputPtr);
      
      // Initialize RNNoise with some warm-up frames
      const silentFrame = new Float32Array(480);
      for (let i = 0; i < 10; i++) {
        // Convert to int16
        for (let j = 0; j < 480; j++) {
          RNNoiseModule.HEAP16[(inputPtr >> 1) + j] = 0;
        }
        RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
      }
      console.log('[RNNoise Simple] Warmed up with 10 silent frames');
      
      // Store everything - reuse the allocated memory
      rnnoiseRef.current = {
        module: RNNoiseModule,
        state,
        inputPtr,
        outputPtr,
        inputBuffer: [],
        outputBuffer: []
      };
      
      console.log('[RNNoise Simple] Ready for processing with state:', state);
      
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      
      // Create processor
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
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
        
        // Process chunks of 480 samples
        while (rnnoiseRef.current.inputBuffer.length >= 480) {
          const frame = rnnoiseRef.current.inputBuffer.splice(0, 480);
          
          // Convert to int16
          const pcmData = new Int16Array(480);
          for (let i = 0; i < 480; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(frame[i] * 32768)));
          }
          
          // Copy to WASM - write directly to HEAP16
          for (let j = 0; j < 480; j++) {
            rnnoiseRef.current.module.HEAP16[(rnnoiseRef.current.inputPtr >> 1) + j] = pcmData[j];
          }
          
          // Process
          const vadProb = rnnoiseRef.current.module._rnnoise_process_frame(
            rnnoiseRef.current.state, 
            rnnoiseRef.current.outputPtr, 
            rnnoiseRef.current.inputPtr
          );
          
          // Get output - read from HEAP16 directly
          const outputData = new Int16Array(480);
          for (let i = 0; i < 480; i++) {
            outputData[i] = rnnoiseRef.current.module.HEAP16[(rnnoiseRef.current.outputPtr >> 1) + i];
          }
          
          // Log occasionally with more detail
          if (Math.random() < 0.02) {
            const maxIn = Math.max(...pcmData.map(Math.abs));
            const maxOut = Math.max(...outputData.map(Math.abs));
            
            // Check first few samples of input and output
            const inputSamples = [];
            const outputSamples = [];
            for (let i = 0; i < 5; i++) {
              inputSamples.push(pcmData[i]);
              outputSamples.push(outputData[i]);
            }
            
            // Also check what's in the heap before and after
            const heapInput = [];
            const heapOutput = [];
            for (let i = 0; i < 5; i++) {
              heapInput.push(rnnoiseRef.current.module.HEAP16[(rnnoiseRef.current.inputPtr >> 1) + i]);
              heapOutput.push(rnnoiseRef.current.module.HEAP16[(rnnoiseRef.current.outputPtr >> 1) + i]);
            }
            
            console.log('[RNNoise Simple] Processing:',
                       '\n  VAD:', vadProb.toFixed(3), 
                       '\n  Max Input:', maxIn, 'Max Output:', maxOut,
                       '\n  Input samples:', inputSamples,
                       '\n  Output samples:', outputSamples,
                       '\n  Heap input:', heapInput,
                       '\n  Heap output:', heapOutput,
                       '\n  State:', rnnoiseRef.current.state,
                       '\n  Reduction:', maxIn > 0 ? ((1 - maxOut/maxIn) * 100).toFixed(1) + '%' : 'N/A');
          }
          
          // Convert back to float
          for (let i = 0; i < 480; i++) {
            rnnoiseRef.current.outputBuffer.push(outputData[i] / 32768.0);
          }
        }
        
        // Output
        for (let i = 0; i < output.length; i++) {
          if (rnnoiseRef.current.outputBuffer.length > 0) {
            output[i] = rnnoiseRef.current.outputBuffer.shift();
          } else {
            output[i] = 0;
          }
        }
      };
      
      processorRef.current = processor;
      setIsInitialized(true);
      console.log('[RNNoise Simple] Initialization complete!');
      
    } catch (err) {
      console.error('[RNNoise Simple] Error:', err);
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const processStream = async (stream: MediaStream): Promise<MediaStream> => {
    if (!isInitialized) {
      await initializeRNNoise();
    }
    
    if (!audioContextRef.current || !processorRef.current) {
      throw new Error('Not initialized');
    }
    
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const destination = audioContextRef.current.createMediaStreamDestination();
    
    source.connect(processorRef.current);
    processorRef.current.connect(destination);
    
    return destination.stream;
  };

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (rnnoiseRef.current) {
      const { module, state, inputPtr, outputPtr } = rnnoiseRef.current;
      module._free(inputPtr);
      module._free(outputPtr);
      module._rnnoise_destroy(state);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  return {
    isInitialized,
    isLoading,
    error,
    processStream,
    cleanup,
    initializeRNNoise
  };
};