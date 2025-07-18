import { useEffect, useRef, useState } from 'react';

export const useRNNoise = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rnnoiseNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const initializeRNNoise = async () => {
    console.log('[RNNoise Hook] initializeRNNoise called', { isInitialized, isLoading });
    if (isInitialized || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('[RNNoise Hook] Starting initialization...');
      
      // Load the RNNoise script directly
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/dist/rnnoise.js';
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
          // Ensure WASM files are loaded from the correct path
          if (filename.endsWith('.wasm')) {
            return `/dist/${filename}`;
          }
          return filename;
        }
      });
      console.log('[RNNoise Hook] WASM module created');
      
      // Create or get audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        console.log('[RNNoise Hook] Audio context created');
      }
      
      // Add the worklet module
      await audioContextRef.current.audioWorklet.addModule('/worklets/rnnoise-processor.js');
      console.log('[RNNoise Hook] Worklet module added');
      
      // Create the worklet node
      rnnoiseNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        'rnnoise-processor'
      );
      console.log('[RNNoise Hook] Worklet node created');
      
      // Send the WASM module to the worklet
      rnnoiseNodeRef.current.port.postMessage({
        type: 'init',
        wasmModule: RNNoiseModule
      });
      
      // Wait for initialization with timeout
      await new Promise((resolve, reject) => {
        if (!rnnoiseNodeRef.current) {
          reject(new Error('RNNoise node not created'));
          return;
        }
        
        const timeout = setTimeout(() => {
          reject(new Error('RNNoise initialization timeout'));
        }, 10000);
        
        rnnoiseNodeRef.current.port.onmessage = (event) => {
          if (event.data.type === 'initialized') {
            clearTimeout(timeout);
            resolve(true);
          } else if (event.data.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(event.data.error));
          }
        };
      });
      
      console.log('[RNNoise Hook] Initialization complete!');
      setIsInitialized(true);
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