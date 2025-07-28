/**
 * Modern React hook for audio processing
 * 
 * @module features/audio-processing/hooks
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MurmubaraEngine } from '../../../core/MurmubaraEngine';
import { MurmubaraEngineFactory } from '../../../core/MurmubaraEngineFactory';
import type { 
  MurmubaraConfig, 
  ProcessedChunk, 
  StreamController,
  DiagnosticInfo,
  ProcessingMetrics 
} from '../../../types';
import { Result, Ok, Err } from '../../../types/result';
import type { StreamId, ChunkId } from '../../../types/branded';

export interface AudioProcessorState {
  isInitialized: boolean;
  isProcessing: boolean;
  isRecording: boolean;
  error: Error | null;
  chunks: ProcessedChunk[];
  diagnostics: DiagnosticInfo | null;
}

export interface AudioProcessorActions {
  initialize: (config?: MurmubaraConfig) => Promise<Result<void, Error>>;
  startRecording: () => Promise<Result<StreamController, Error>>;
  stopRecording: () => Promise<Result<void, Error>>;
  processFile: (file: File) => Promise<Result<ProcessedChunk[], Error>>;
  processStream: (stream: MediaStream) => Promise<Result<StreamController, Error>>;
  reset: () => void;
  destroy: () => Promise<void>;
}

export interface UseAudioProcessorOptions {
  config?: MurmubaraConfig;
  autoInitialize?: boolean;
  onChunkProcessed?: (chunk: ProcessedChunk) => void;
  onError?: (error: Error) => void;
}

/**
 * Modern React hook for audio processing with Murmuraba
 * 
 * @example
 * ```tsx
 * function AudioRecorder() {
 *   const { state, actions } = useAudioProcessor({
 *     config: { noiseReductionLevel: 'high' },
 *     onChunkProcessed: (chunk) => console.log('Chunk:', chunk)
 *   });
 * 
 *   const handleStart = async () => {
 *     const result = await actions.startRecording();
 *     if (!result.ok) {
 *       console.error('Failed to start:', result.error);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleStart} disabled={!state.isInitialized}>
 *         {state.isRecording ? 'Stop' : 'Start'} Recording
 *       </button>
 *       {state.error && <div>Error: {state.error.message}</div>}
 *       <div>Chunks processed: {state.chunks.length}</div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAudioProcessor(
  options: UseAudioProcessorOptions = {}
): { state: AudioProcessorState; actions: AudioProcessorActions } {
  const { config, autoInitialize = true, onChunkProcessed, onError } = options;
  
  // Engine reference
  const engineRef = useRef<MurmubaraEngine | null>(null);
  const streamControllerRef = useRef<StreamController | null>(null);
  
  // State
  const [state, setState] = useState<AudioProcessorState>({
    isInitialized: false,
    isProcessing: false,
    isRecording: false,
    error: null,
    chunks: [],
    diagnostics: null,
  });
  
  // Error handler
  const handleError = useCallback((error: Error) => {
    setState(prev => ({ ...prev, error }));
    onError?.(error);
  }, [onError]);
  
  // Initialize engine
  const initialize = useCallback(async (
    overrideConfig?: MurmubaraConfig
  ): Promise<Result<void, Error>> => {
    try {
      if (engineRef.current?.isInitialized) {
        return Ok(undefined);
      }
      
      setState(prev => ({ ...prev, error: null }));
      
      // Create engine with config
      const engine = MurmubaraEngineFactory.create(overrideConfig || config);
      engineRef.current = engine;
      
      // Initialize engine
      await engine.initialize();
      
      // Get diagnostics
      const diagnostics = await engine.getDiagnostics();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        diagnostics,
      }));
      
      return Ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Initialization failed');
      handleError(err);
      return Err(err);
    }
  }, [config, handleError]);
  
  // Start recording
  const startRecording = useCallback(async (): Promise<Result<StreamController, Error>> => {
    try {
      if (!engineRef.current?.isInitialized) {
        const err = new Error('Engine not initialized');
        handleError(err);
        return Err(err);
      }
      
      setState(prev => ({ ...prev, isRecording: true, error: null }));
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        }
      });
      
      // Process stream with chunk callback
      const controller = await engineRef.current.processStream(stream, {
        chunkDuration: 8,
        onChunkProcessed: (chunk: any) => {
          setState(prev => ({
            ...prev,
            chunks: [...prev.chunks, chunk as unknown as ProcessedChunk],
          }));
          onChunkProcessed?.(chunk as unknown as ProcessedChunk);
        },
      });
      
      streamControllerRef.current = controller;
      return Ok(controller);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start recording');
      handleError(err);
      setState(prev => ({ ...prev, isRecording: false }));
      return Err(err);
    }
  }, [handleError, onChunkProcessed]);
  
  // Stop recording
  const stopRecording = useCallback(async (): Promise<Result<void, Error>> => {
    try {
      if (streamControllerRef.current) {
        streamControllerRef.current.stop();
        streamControllerRef.current = null;
      }
      
      setState(prev => ({ ...prev, isRecording: false }));
      return Ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to stop recording');
      handleError(err);
      return Err(err);
    }
  }, [handleError]);
  
  // Process file
  const processFile = useCallback(async (
    file: File
  ): Promise<Result<ProcessedChunk[], Error>> => {
    try {
      if (!engineRef.current?.isInitialized) {
        const err = new Error('Engine not initialized');
        handleError(err);
        return Err(err);
      }
      
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await engineRef.current.processFile(arrayBuffer);
      
      // Process file doesn't return chunks, it returns the processed audio
      setState(prev => ({
        ...prev,
        isProcessing: false,
      }));
      
      // Create a pseudo-chunk for the processed file
      const processedBlob = new Blob([result], { type: 'audio/wav' });
      const processedChunk: ProcessedChunk = {
        id: `file-${Date.now()}`,
        blob: processedBlob,
        startTime: 0,
        endTime: file.size / 48000, // Approximate duration
        duration: file.size / 48000,
        vadScore: 0,
        averageVad: 0,
        processedAudioUrl: URL.createObjectURL(processedBlob),
        originalAudioUrl: URL.createObjectURL(file),
        vadData: [],
        metrics: {
          inputLevel: 0,
          outputLevel: 0,
          noiseReductionLevel: 0,
          processingLatency: 0,
          vadProbability: 0,
          framesProcessed: 0,
          chunksProcessed: 1,
          totalDuration: file.size / 48000,
          droppedFrames: 0,
          audioQuality: 1,
          timestamp: Date.now(),
          frameCount: 0,
        },
        originalSize: file.size,
        processedSize: result.byteLength,
        noiseRemoved: 0,
        isPlaying: false,
        isValid: true,
      };
      
      setState(prev => ({
        ...prev,
        chunks: [...prev.chunks, processedChunk],
      }));
      
      return Ok([processedChunk]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to process file');
      handleError(err);
      setState(prev => ({ ...prev, isProcessing: false }));
      return Err(err);
    }
  }, [handleError]);
  
  // Process stream
  const processStream = useCallback(async (
    stream: MediaStream
  ): Promise<Result<StreamController, Error>> => {
    try {
      if (!engineRef.current?.isInitialized) {
        const err = new Error('Engine not initialized');
        handleError(err);
        return Err(err);
      }
      
      const controller = await engineRef.current.processStream(stream);
      return Ok(controller);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to process stream');
      handleError(err);
      return Err(err);
    }
  }, [handleError]);
  
  // Reset state
  const reset = useCallback(() => {
    setState({
      isInitialized: engineRef.current?.isInitialized || false,
      isProcessing: false,
      isRecording: false,
      error: null,
      chunks: [],
      diagnostics: state.diagnostics,
    });
  }, [state.diagnostics]);
  
  // Destroy engine
  const destroy = useCallback(async () => {
    try {
      if (streamControllerRef.current) {
        streamControllerRef.current.stop();
        streamControllerRef.current = null;
      }
      
      if (engineRef.current) {
        await engineRef.current.destroy();
        engineRef.current = null;
      }
      
      setState({
        isInitialized: false,
        isProcessing: false,
        isRecording: false,
        error: null,
        chunks: [],
        diagnostics: null,
      });
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to destroy engine'));
    }
  }, [handleError]);
  
  // Auto-initialize
  useEffect(() => {
    if (autoInitialize && !engineRef.current) {
      initialize();
    }
    
    return () => {
      destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Actions object
  const actions = useMemo<AudioProcessorActions>(
    () => ({
      initialize,
      startRecording,
      stopRecording,
      processFile,
      processStream,
      reset,
      destroy,
    }),
    [initialize, startRecording, stopRecording, processFile, processStream, reset, destroy]
  );
  
  return { state, actions };
}
