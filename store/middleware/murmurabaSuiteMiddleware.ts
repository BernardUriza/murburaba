import { Middleware, MiddlewareAPI } from '@reduxjs/toolkit';
import { DIContainer, TOKENS } from '../../packages/murmuraba/src/core/DIContainer';
import { IAudioProcessor, ProcessedChunk, ProcessingMetrics } from 'murmuraba';
import { 
  setProcessing, 
  setProcessingResults, 
  addChunk,
  setError,
  clearError
} from '../slices/audioSlice';
import { addNotification } from '../slices/uiSlice';

// Action types for MurmurabaSuite integration
export const MURMURABA_ACTIONS = {
  PROCESS_FILE: 'murmuraba/PROCESS_FILE',
  PROCESS_RECORDING: 'murmuraba/PROCESS_RECORDING',
  PROCESS_STREAM: 'murmuraba/PROCESS_STREAM',
  CANCEL_PROCESSING: 'murmuraba/CANCEL_PROCESSING',
  SET_CONTAINER: 'murmuraba/SET_CONTAINER'
} as const;

// Store DI container reference
let suiteContainer: DIContainer | null = null;

export const setSuiteContainer = (container: DIContainer) => {
  suiteContainer = container;
};

export const murmurabaSuiteMiddleware: Middleware = (store: MiddlewareAPI) => (next) => async (action: any) => {
  // Handle container setup
  if (action.type === MURMURABA_ACTIONS.SET_CONTAINER) {
    suiteContainer = action.payload;
    return next(action);
  }

  // Pass through if no container or not a murmuraba action
  if (!suiteContainer || !action.type.startsWith('murmuraba/')) {
    return next(action);
  }

  // Log middleware activity in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[MurmurabaSuite Middleware]', action.type);
  }

  let processor: IAudioProcessor;
  try {
    processor = suiteContainer.get<IAudioProcessor>(TOKENS.AudioProcessor);
  } catch (error) {
    console.error('Failed to get AudioProcessor from container:', error);
    store.dispatch(setError({
      message: 'Audio processor not available',
      code: 'PROCESSOR_NOT_AVAILABLE'
    }));
    return next(action);
  }
  
  switch (action.type) {
    case MURMURABA_ACTIONS.PROCESS_FILE: {
      const { file, options } = action.payload;
      
      // Set up progress tracking
      const unsubscribeProgress = processor.onProgress((progress: any) => {
        // Could dispatch progress action here if needed
      });
      
      // Set up chunk tracking
      const unsubscribeChunk = processor.onChunk((chunk: ProcessedChunk) => {
        store.dispatch(addChunk(chunk));
      });
      
      // Set up metrics tracking  
      const unsubscribeMetrics = processor.onMetrics((metrics: ProcessingMetrics) => {
        // Could dispatch metrics action here
      });
      
      try {
        store.dispatch(setProcessing(true));
        store.dispatch(clearError());
        
        const result = await processor.processFile(file, options);
        
        store.dispatch(setProcessingResults(result));
        store.dispatch(addNotification({
          type: 'success',
          message: `Successfully processed ${file.name}`
        }));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        store.dispatch(setError({ 
          message: `Failed to process file: ${errorMessage}`,
          code: 'PROCESSING_ERROR'
        }));
        
        store.dispatch(addNotification({
          type: 'error',
          message: `Failed to process file: ${errorMessage}`
        }));
        
      } finally {
        store.dispatch(setProcessing(false));
        unsubscribeProgress();
        unsubscribeChunk();
        unsubscribeMetrics();
      }
      
      break;
    }
    
    case MURMURABA_ACTIONS.PROCESS_RECORDING: {
      const { duration, options } = action.payload;
      
      try {
        store.dispatch(setProcessing(true));
        store.dispatch(clearError());
        
        const result = await processor.processRecording(duration, options);
        
        store.dispatch(setProcessingResults(result));
        store.dispatch(addNotification({
          type: 'success',
          message: 'Recording processed successfully'
        }));
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        store.dispatch(setError({ 
          message: `Recording failed: ${errorMessage}`,
          code: 'RECORDING_ERROR'
        }));
        
        store.dispatch(addNotification({
          type: 'error',
          message: `Recording failed: ${errorMessage}`
        }));
        
      } finally {
        store.dispatch(setProcessing(false));
      }
      
      break;
    }
    
    case MURMURABA_ACTIONS.CANCEL_PROCESSING: {
      processor.cancel();
      store.dispatch(setProcessing(false));
      store.dispatch(addNotification({
        type: 'info',
        message: 'Processing cancelled'
      }));
      break;
    }
  }
  
  return next(action);
};

// Action creators for MurmurabaSuite
export const processFileAction = (file: File, options?: any) => ({
  type: MURMURABA_ACTIONS.PROCESS_FILE,
  payload: { file, options }
});

export const processRecordingAction = (duration: number, options?: any) => ({
  type: MURMURABA_ACTIONS.PROCESS_RECORDING,
  payload: { duration, options }
});

export const cancelProcessingAction = () => ({
  type: MURMURABA_ACTIONS.CANCEL_PROCESSING
});