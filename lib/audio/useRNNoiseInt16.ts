import { useEffect, useRef, useState } from 'react';

export const useRNNoiseInt16 = () => {
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
      console.log('[RNNoise Int16] Starting initialization...');
      
      // Load script
      const script = document.createElement('script');
      script.src = '/rnnoise-fixed.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      console.log('[RNNoise Int16] Script loaded');
      
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
      
      console.log('[RNNoise Int16] Module created');
      
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
      
      console.log('[RNNoise Int16] State:', state, 'Ptrs:', inputPtr, outputPtr);
      
      // Initialize RNNoise with some warm-up frames
      const silentFrame = new Int16Array(480);
      for (let i = 0; i < 10; i++) {
        RNNoiseModule.HEAP16.set(silentFrame, inputPtr >> 1);
        RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
      }
      console.log('[RNNoise Int16] Warmed up with 10 silent frames');
      
      // Store everything
      rnnoiseRef.current = {
        module: RNNoiseModule,
        state,
        inputPtr,
        outputPtr,
        inputBuffer: [],
        outputBuffer: []
      };
      
      console.log('[RNNoise Int16] Ready for processing');
      
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
          const int16Frame = new Int16Array(480);
          for (let i = 0; i < 480; i++) {
            int16Frame[i] = Math.max(-32768, Math.min(32767, Math.floor(frame[i] * 32768)));
          }
          
          // Copy to WASM heap
          rnnoiseRef.current.module.HEAP16.set(int16Frame, rnnoiseRef.current.inputPtr >> 1);
          
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
            const maxIn = Math.max(...int16Frame.map(Math.abs));
            const maxOut = Math.max(...outputData.map(Math.abs));
            
            console.log('[RNNoise Int16] Processing:',
                       '\n  VAD:', vadProb.toFixed(3), 
                       '\n  Max Input (int16):', maxIn, 'Max Output (int16):', maxOut,
                       '\n  First input samples:', Array.from(int16Frame.slice(0, 5)),
                       '\n  First output samples:', Array.from(outputData.slice(0, 5)),
                       '\n  Reduction:', maxIn > 0 ? ((1 - maxOut/maxIn) * 100).toFixed(1) + '%' : 'N/A');
          }
          
          // Convert back to float32 and add to output buffer
          for (let i = 0; i < 480; i++) {
            const floatSample = outputData[i] / 32768.0;
            rnnoiseRef.current.outputBuffer.push(floatSample);
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
      console.log('[RNNoise Int16] Initialization complete!');
      
    } catch (err) {
      console.error('[RNNoise Int16] Error:', err);
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