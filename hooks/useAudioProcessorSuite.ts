import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  processFileAction, 
  processRecordingAction, 
  cancelProcessingAction 
} from '../store/middleware/murmurabaSuiteMiddleware';
import { setChunkDuration, setEnableAGC } from '../store/slices/audioSlice';
import { useMurmurabaSuite } from 'murmuraba/react/MurmurabaSuite';

/**
 * Enhanced audio processor hook that uses MurmurabaSuite
 * Drop-in replacement for useAudioProcessor with improved architecture
 */
export function useAudioProcessorSuite() {
  const dispatch = useAppDispatch();
  const { isReady } = useMurmurabaSuite();
  
  const { 
    isProcessing, 
    chunkDuration, 
    enableAGC,
    processingResults,
    chunks,
    hasError,
    errorMessage
  } = useAppSelector(state => state.audio);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!isReady) {
      console.warn('MurmurabaSuite not ready yet');
      return;
    }
    
    dispatch(processFileAction(file, {
      chunkDuration: chunkDuration, // Pass in seconds
      outputFormat: 'wav',
      enableAGC,
      enableVAD: true
    }));
  }, [dispatch, chunkDuration, enableAGC, isReady]);

  const processWithoutChunks = useCallback(async (file: File) => {
    if (!isReady) {
      console.warn('MurmurabaSuite not ready yet');
      return;
    }
    
    // Process without chunking by not specifying chunkDuration
    dispatch(processFileAction(file, {
      outputFormat: 'wav',
      enableAGC
    }));
  }, [dispatch, enableAGC, isReady]);

  const processRecording = useCallback(async (
    duration: number = 5000,
    options?: { 
      chunkDuration?: number;
      outputFormat?: 'wav' | 'webm' | 'raw';
    }
  ) => {
    if (!isReady) {
      console.warn('MurmurabaSuite not ready yet');
      return;
    }
    
    dispatch(processRecordingAction(duration, {
      chunkDuration: options?.chunkDuration || chunkDuration, // Don't multiply here, it's already in seconds
      outputFormat: options?.outputFormat || 'wav',
      enableAGC,
      enableVAD: true
    }));
  }, [dispatch, chunkDuration, enableAGC, isReady]);

  const cancelProcessing = useCallback(() => {
    dispatch(cancelProcessingAction());
  }, [dispatch]);

  const toggleAGC = useCallback((value: boolean) => {
    dispatch(setEnableAGC(value));
  }, [dispatch]);

  const updateChunkDuration = useCallback((seconds: number) => {
    dispatch(setChunkDuration(seconds));
  }, [dispatch]);

  return {
    // State
    isProcessing,
    processingResults,
    chunks,
    enableAGC,
    chunkDuration,
    hasError,
    errorMessage,
    isReady,
    
    // Actions
    handleFileUpload,
    processWithoutChunks,
    processRecording,
    cancelProcessing,
    toggleAGC,
    updateChunkDuration
  };
}

// Export as default to make migration easier
export default useAudioProcessorSuite;