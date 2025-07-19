import { useEffect, useRef, useState } from 'react';

export const useRNNoise = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rnnoiseNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rnnoiseModuleRef = useRef<any>(null);

  const initializeRNNoise = async () => {
    console.log('[RNNoise Hook] initializeRNNoise called', { isInitialized, isLoading });
    if (isInitialized || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('[RNNoise Hook] Starting initialization...');
      
      // Load the RNNoise script
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/rnnoise-fixed.js';
        script.onload = () => {
          console.log('[RNNoise Hook] Script loaded');
          resolve();
        };
        script.onerror = (e) => {
          console.error('[RNNoise Hook] Failed to load script:', e);
          reject(new Error('Failed to load RNNoise script'));
        };
        document.head.appendChild(script);
      });
      
      // Check if the module is available globally
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      if (!createRNNWasmModule) {
        throw new Error('createRNNWasmModule not found on window after script load');
      }
      
      console.log('[RNNoise Hook] Creating WASM module...');
      
      // Configure WASM module with correct paths
      const RNNoiseModule = await createRNNWasmModule({
        locateFile: (filename: string) => {
          if (filename.endsWith('.wasm')) {
            return `/dist/${filename}`;
          }
          return filename;
        }
      });
      console.log('[RNNoise Hook] WASM module created');
      
      // Store the module
      rnnoiseModuleRef.current = RNNoiseModule;
      
      // Create RNNoise state
      const state = RNNoiseModule._rnnoise_create(0);
      if (!state) {
        throw new Error('Failed to create RNNoise state');
      }
      console.log('[RNNoise Hook] State created:', state);
      
      // Store state and buffer info
      rnnoiseModuleRef.current.state = state;
      rnnoiseModuleRef.current.bufferSize = 480;
      rnnoiseModuleRef.current.inputPtr = RNNoiseModule._malloc(480 * 2);
      rnnoiseModuleRef.current.outputPtr = RNNoiseModule._malloc(480 * 2);
      
      console.log('[RNNoise Hook] Memory allocated - Input ptr:', rnnoiseModuleRef.current.inputPtr, 
                  'Output ptr:', rnnoiseModuleRef.current.outputPtr);
      
      // Process a few silent frames to initialize RNNoise
      const silentFrame = new Int16Array(480);
      for (let i = 0; i < 10; i++) {
        rnnoiseModuleRef.current.HEAP16.set(silentFrame, rnnoiseModuleRef.current.inputPtr >> 1);
        RNNoiseModule._rnnoise_process_frame(
          state,
          rnnoiseModuleRef.current.outputPtr,
          rnnoiseModuleRef.current.inputPtr
        );
      }
      console.log('[RNNoise Hook] Processed 10 silent frames for initialization');
      
      // Create or get audio context
      if (!audioContextRef.current) {
        // RNNoise expects 48kHz sample rate
        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
        console.log('[RNNoise Hook] Audio context created, sample rate:', audioContextRef.current.sampleRate);
      }
      
      // Use ScriptProcessorNode for better compatibility
      const bufferSize = 4096; // Must be power of 2
      const scriptProcessor = audioContextRef.current.createScriptProcessor(
        bufferSize,
        1, // input channels
        1  // output channels
      );
      
      // Buffer for accumulating samples
      let inputBuffer: number[] = [];
      let outputBuffer: number[] = [];
      
      scriptProcessor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        
        // Add input samples to buffer
        for (let i = 0; i < input.length; i++) {
          inputBuffer.push(input[i]);
        }
        
        // Process when we have enough samples
        while (inputBuffer.length >= 480 && rnnoiseModuleRef.current) {
          const frame = inputBuffer.splice(0, 480);
          
          // Convert to 16-bit PCM
          const pcmData = new Int16Array(480);
          let maxAmplitude = 0;
          for (let i = 0; i < 480; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(frame[i] * 32768)));
            maxAmplitude = Math.max(maxAmplitude, Math.abs(pcmData[i]));
          }
          
          // Copy to WASM memory
          rnnoiseModuleRef.current.HEAP16.set(pcmData, rnnoiseModuleRef.current.inputPtr >> 1);
          
          // Debug: Check the state before processing
          if (!rnnoiseModuleRef.current.state) {
            console.error('[RNNoise] State is null!');
            continue;
          }
          
          // Debug: Check input data in memory
          const inputCheck = new Int16Array(
            rnnoiseModuleRef.current.HEAP16.buffer,
            rnnoiseModuleRef.current.inputPtr,
            10 // Check first 10 samples
          );
          
          // Process with RNNoise
          const vadProb = rnnoiseModuleRef.current._rnnoise_process_frame(
            rnnoiseModuleRef.current.state,
            rnnoiseModuleRef.current.outputPtr,
            rnnoiseModuleRef.current.inputPtr
          );
          
          // Check if function returned NaN or invalid value
          if (isNaN(vadProb) || vadProb === undefined) {
            console.error('[RNNoise] Invalid VAD probability:', vadProb);
          }
          
          // Get processed data - use new Int16Array with correct buffer offset
          const processedPCM = new Int16Array(
            rnnoiseModuleRef.current.HEAP16.buffer,
            rnnoiseModuleRef.current.outputPtr,
            480
          );
          
          // Calculate processed amplitude for comparison
          let processedMaxAmplitude = 0;
          for (let i = 0; i < 480; i++) {
            processedMaxAmplitude = Math.max(processedMaxAmplitude, Math.abs(processedPCM[i]));
          }
          
          // Log VAD and amplitude occasionally
          if (Math.random() < 0.02) {
            console.log('[RNNoise] VAD:', vadProb.toFixed(3), 
                       'Input amp:', maxAmplitude, 
                       'Output amp:', processedMaxAmplitude,
                       'Reduction:', ((1 - processedMaxAmplitude/maxAmplitude) * 100).toFixed(1) + '%',
                       'First output samples:', processedPCM.slice(0, 5));
          }
          
          // Convert back to float32
          for (let i = 0; i < 480; i++) {
            // Use processed output from RNNoise
            const processedSample = processedPCM[i] / 32768.0;
            outputBuffer.push(processedSample);
            
            // Debug: If all output is zero but input had signal, there's a problem
            if (i === 0 && maxAmplitude > 100 && processedMaxAmplitude === 0) {
              console.warn('[RNNoise] Processing eliminated all signal!', 
                          'Input samples:', inputCheck.slice(0, 5),
                          'Output samples:', processedPCM.slice(0, 5));
            }
          }
        }
        
        // Output processed samples
        for (let i = 0; i < output.length; i++) {
          if (outputBuffer.length > 0) {
            output[i] = outputBuffer.shift()!;
          } else {
            output[i] = 0;
          }
        }
      };
      
      rnnoiseNodeRef.current = scriptProcessor;
      console.log('[RNNoise Hook] ScriptProcessor created');
      
      setIsInitialized(true);
      console.log('[RNNoise Hook] Initialization complete!');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[RNNoise Hook] Failed to initialize:', errorMsg);
      setError(errorMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const processStream = async (stream: MediaStream): Promise<MediaStream> => {
    if (!isInitialized) {
      await initializeRNNoise();
    }
    
    if (!audioContextRef.current || !rnnoiseNodeRef.current) {
      throw new Error('RNNoise not initialized');
    }
    
    // Create source from stream
    sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
    
    // Create destination for processed audio
    const destination = audioContextRef.current.createMediaStreamDestination();
    
    // Connect: source -> rnnoise -> destination
    sourceNodeRef.current.connect(rnnoiseNodeRef.current);
    rnnoiseNodeRef.current.connect(destination);
    
    return destination.stream;
  };

  const cleanup = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    if (rnnoiseNodeRef.current) {
      rnnoiseNodeRef.current.disconnect();
      rnnoiseNodeRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsInitialized(false);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    processStream,
    cleanup,
    initializeRNNoise
  };
};