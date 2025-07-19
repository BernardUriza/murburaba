import { useEffect, useRef, useState } from 'react';

export const useRNNoiseNoVAD = () => {
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
      console.log('[RNNoise NoVAD] Starting initialization...');
      
      // Load script
      const script = document.createElement('script');
      script.src = '/rnnoise-fixed.js';
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
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
      
      // Create state
      const state = RNNoiseModule._rnnoise_create(0);
      if (!state) {
        throw new Error('Failed to create RNNoise state');
      }
      
      // Allocate memory for float32 samples
      const inputPtr = RNNoiseModule._malloc(480 * 4);
      const outputPtr = RNNoiseModule._malloc(480 * 4);
      
      // Warm up
      const silentFrame = new Float32Array(480);
      for (let i = 0; i < 10; i++) {
        RNNoiseModule.HEAPF32.set(silentFrame, inputPtr >> 2);
        RNNoiseModule._rnnoise_process_frame(state, outputPtr, inputPtr);
      }
      
      // Store everything
      rnnoiseRef.current = {
        module: RNNoiseModule,
        state,
        inputPtr,
        outputPtr,
        inputBuffer: [],
        outputBuffer: [],
        energyHistory: new Array(20).fill(0),
        energyIndex: 0
      };
      
      console.log('[RNNoise NoVAD] Ready for processing');
      
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
          const floatFrame = new Float32Array(frame);
          
          // Copy to WASM heap
          rnnoiseRef.current.module.HEAPF32.set(floatFrame, rnnoiseRef.current.inputPtr >> 2);
          
          // Process with RNNoise (ignore VAD since it's always 0)
          rnnoiseRef.current.module._rnnoise_process_frame(
            rnnoiseRef.current.state, 
            rnnoiseRef.current.outputPtr, 
            rnnoiseRef.current.inputPtr
          );
          
          // Get output
          const outputData = new Float32Array(480);
          for (let i = 0; i < 480; i++) {
            outputData[i] = rnnoiseRef.current.module.HEAPF32[(rnnoiseRef.current.outputPtr >> 2) + i];
          }
          
          // Calculate frame energy for our own VAD
          const frameEnergy = calculateRMS(floatFrame);
          const outputEnergy = calculateRMS(outputData);
          
          // Update energy history
          rnnoiseRef.current.energyHistory[rnnoiseRef.current.energyIndex] = frameEnergy;
          rnnoiseRef.current.energyIndex = (rnnoiseRef.current.energyIndex + 1) % 20;
          
          // Calculate average energy
          const avgEnergy = rnnoiseRef.current.energyHistory.reduce((a: number, b: number) => a + b) / 20;
          
          // Simple energy-based gating
          let processedFrame = outputData;
          const silenceThreshold = 0.001;
          const speechThreshold = 0.005;
          
          if (avgEnergy < silenceThreshold) {
            // Very quiet - attenuate heavily
            processedFrame = processedFrame.map(s => s * 0.1);
          } else if (avgEnergy < speechThreshold) {
            // Quiet - moderate attenuation
            const factor = (avgEnergy - silenceThreshold) / (speechThreshold - silenceThreshold);
            const attenuation = 0.1 + 0.9 * factor;
            processedFrame = processedFrame.map(s => s * attenuation);
          }
          
          // Additional noise gate based on RNNoise output vs input ratio
          const reductionRatio = outputEnergy / (frameEnergy + 0.0001);
          if (reductionRatio < 0.3 && avgEnergy < speechThreshold) {
            // RNNoise reduced significantly - likely noise
            processedFrame = processedFrame.map(s => s * reductionRatio);
          }
          
          // Log occasionally
          if (Math.random() < 0.02) {
            const gateStatus = avgEnergy < silenceThreshold ? 'SILENCE' : 
                             avgEnergy < speechThreshold ? 'TRANSITION' : 'SPEECH';
            console.log('[RNNoise NoVAD]',
                       '\n  Status:', gateStatus,
                       '\n  Avg Energy:', avgEnergy.toFixed(6),
                       '\n  Frame Energy:', frameEnergy.toFixed(6),
                       '\n  RNNoise Reduction:', ((1 - reductionRatio) * 100).toFixed(1) + '%',
                       '\n  Gate Applied:', avgEnergy < speechThreshold ? 'Yes' : 'No');
          }
          
          // Add to output buffer
          for (let i = 0; i < 480; i++) {
            rnnoiseRef.current.outputBuffer.push(processedFrame[i]);
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
      console.log('[RNNoise NoVAD] Initialization complete!');
      
    } catch (err) {
      console.error('[RNNoise NoVAD] Error:', err);
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

function calculateRMS(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  return Math.sqrt(sum / frame.length);
}