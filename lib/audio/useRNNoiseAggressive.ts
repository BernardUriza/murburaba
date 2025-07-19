import { useEffect, useRef, useState } from 'react';

export const useRNNoiseAggressive = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const rnnoiseRef = useRef<any>(null);
  
  // Noise gate parameters
  const noiseFloor = useRef(0.01); // Estimated noise floor
  const smoothingFactor = 0.95; // For noise floor estimation

  const initializeRNNoise = async () => {
    if (isInitialized || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[RNNoise Aggressive] Starting initialization...');
      
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
      
      // Allocate memory for float32 samples (4 bytes per sample)
      const inputPtr = RNNoiseModule._malloc(480 * 4);
      const outputPtr = RNNoiseModule._malloc(480 * 4);
      
      // Warm up with silent frames
      const silentFrame = new Float32Array(480);
      for (let i = 0; i < 20; i++) {
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
        previousFrame: new Float32Array(480), // For smoothing
        vadHistory: new Array(10).fill(0), // VAD history for smoothing
        vadHistoryIndex: 0
      };
      
      console.log('[RNNoise Aggressive] Ready for processing');
      
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      
      // Create processor with larger buffer for better processing
      const processor = audioContextRef.current.createScriptProcessor(8192, 1, 1);
      
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
          
          // Pre-process: Apply high-pass filter to remove low-frequency noise
          const highpassFrame = applyHighPassFilter(floatFrame, 80); // 80Hz cutoff
          
          // Copy to WASM heap
          rnnoiseRef.current.module.HEAPF32.set(highpassFrame, rnnoiseRef.current.inputPtr >> 2);
          
          // Process with RNNoise
          const vadProb = rnnoiseRef.current.module._rnnoise_process_frame(
            rnnoiseRef.current.state, 
            rnnoiseRef.current.outputPtr, 
            rnnoiseRef.current.inputPtr
          );
          
          // Get output
          const outputData = new Float32Array(480);
          for (let i = 0; i < 480; i++) {
            outputData[i] = rnnoiseRef.current.module.HEAPF32[(rnnoiseRef.current.outputPtr >> 2) + i];
          }
          
          // Update VAD history for smoothing
          rnnoiseRef.current.vadHistory[rnnoiseRef.current.vadHistoryIndex] = vadProb;
          rnnoiseRef.current.vadHistoryIndex = (rnnoiseRef.current.vadHistoryIndex + 1) % 10;
          
          // Calculate smoothed VAD
          const smoothedVAD = rnnoiseRef.current.vadHistory.reduce((a: number, b: number) => a + b, 0) / 10;
          
          // Estimate noise floor during silence
          const frameEnergy = calculateRMS(outputData);
          if (smoothedVAD < 0.1) {
            noiseFloor.current = noiseFloor.current * smoothingFactor + frameEnergy * (1 - smoothingFactor);
          }
          
          // Apply multiple noise reduction techniques
          let processedFrame = outputData;
          
          // 1. VAD-based gating with hysteresis
          const vadThresholdHigh = 0.6;
          const vadThresholdLow = 0.3;
          if (smoothedVAD < vadThresholdLow) {
            // Strong attenuation when no voice
            const attenuation = Math.pow(smoothedVAD / vadThresholdLow, 2) * 0.1;
            processedFrame = processedFrame.map(s => s * attenuation);
          } else if (smoothedVAD < vadThresholdHigh) {
            // Gradual attenuation
            const attenuation = 0.1 + 0.9 * ((smoothedVAD - vadThresholdLow) / (vadThresholdHigh - vadThresholdLow));
            processedFrame = processedFrame.map(s => s * attenuation);
          }
          
          // 2. Spectral subtraction based on noise floor
          if (frameEnergy < noiseFloor.current * 2) {
            const attenuation = Math.max(0, 1 - (noiseFloor.current / frameEnergy));
            processedFrame = processedFrame.map(s => s * attenuation);
          }
          
          // 3. Smooth transitions to avoid artifacts
          for (let i = 0; i < 480; i++) {
            const smoothing = 0.1;
            processedFrame[i] = processedFrame[i] * (1 - smoothing) + rnnoiseRef.current.previousFrame[i] * smoothing;
            rnnoiseRef.current.previousFrame[i] = processedFrame[i];
          }
          
          // Log occasionally
          if (Math.random() < 0.02) {
            const maxIn = Math.max(...floatFrame.map(Math.abs));
            const maxOut = Math.max(...processedFrame.map(Math.abs));
            console.log('[RNNoise Aggressive]',
                       '\n  VAD:', vadProb.toFixed(3), '(Smoothed:', smoothedVAD.toFixed(3) + ')',
                       '\n  Noise Floor:', noiseFloor.current.toFixed(4),
                       '\n  Frame Energy:', frameEnergy.toFixed(4),
                       '\n  Reduction:', maxIn > 0 ? ((1 - maxOut/maxIn) * 100).toFixed(1) + '%' : 'N/A');
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
      console.log('[RNNoise Aggressive] Initialization complete!');
      
    } catch (err) {
      console.error('[RNNoise Aggressive] Error:', err);
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

// Helper functions
function calculateRMS(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i];
  }
  return Math.sqrt(sum / frame.length);
}

function applyHighPassFilter(frame: Float32Array, cutoffHz: number): Float32Array {
  // Simple first-order high-pass filter
  const output = new Float32Array(frame.length);
  const rc = 1.0 / (2.0 * Math.PI * cutoffHz);
  const dt = 1.0 / 48000; // sample rate
  const alpha = rc / (rc + dt);
  
  output[0] = frame[0];
  for (let i = 1; i < frame.length; i++) {
    output[i] = alpha * (output[i-1] + frame[i] - frame[i-1]);
  }
  
  return output;
}