import { ProcessedChunk, RecordingState } from './types';
import { StreamController } from '../../types';
import { processStream } from '../../api';
import { UseRecordingStateReturn } from './useRecordingState';
import { IChunkManager, IRecordingManager } from './interfaces';
import { logger } from './logger';
import { DEFAULT_CHUNK_DURATION } from './constants';

interface RecordingFunctionsProps {
  isInitialized: boolean;
  recordingState: RecordingState;
  recordingStateHook: UseRecordingStateReturn;
  currentStream: MediaStream | null;
  originalStream: MediaStream | null;
  setCurrentStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  setOriginalStream: React.Dispatch<React.SetStateAction<MediaStream | null>>;
  setStreamController: React.Dispatch<React.SetStateAction<StreamController | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  chunkManager: IChunkManager;
  recordingManager: IRecordingManager;
  initialize: () => Promise<void>;
}

export function createRecordingFunctions({
  isInitialized,
  recordingState,
  recordingStateHook,
  currentStream,
  originalStream,
  setCurrentStream,
  setOriginalStream,
  setStreamController,
  setError,
  chunkManager,
  recordingManager,
  initialize
}: RecordingFunctionsProps) {
  
  const {
    startRecording: startRecordingState,
    stopRecording: stopRecordingState,
    pauseRecording: pauseRecordingState,
    resumeRecording: resumeRecordingState,
    addChunk,
    clearRecordings: clearRecordingsState,
    updateRecordingTime
  } = recordingStateHook;
  
  /**
   * Start recording with concatenated streaming
   */
  const startRecording = async (chunkDuration: number = DEFAULT_CHUNK_DURATION) => {
    try {
      
      if (!isInitialized) {
        logger.info('Engine not initialized, attempting initialization...');
        try {
          await initialize();
        } catch (initError) {
          logger.error('Initialization failed during recording start', { error: initError });
          throw new Error(`Failed to initialize audio engine: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,  // REGLA 10: Desactivar TODO
          noiseSuppression: false,  // We're doing our own
          autoGainControl: false    // We have our own AGC
        } 
      });
      
      setOriginalStream(stream);
      const controller = await processStream(stream);
      setStreamController(controller);
      setCurrentStream(controller.stream);
      
      // Use hook's state management
      startRecordingState();
      
      // Start the chunk processing
      const onChunkProcessed = (chunk: ProcessedChunk) => {
        addChunk(chunk);
        logger.info('Chunk processed', {
          id: chunk.id,
          duration: chunk.duration,
          noiseReduction: chunk.noiseRemoved
        });
      };
      
      await recordingManager.startCycle(
        controller.stream,
        stream,
        chunkDuration,
        onChunkProcessed
      );
      
      logger.info('Recording started', { chunkDuration });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      logger.error('Failed to start recording', { error: errorMessage });
      setError(errorMessage);
      throw err;
    }
  };
  
  /**
   * Stop recording and cleanup
   */
  const stopRecording = () => {
    logger.info('Stopping recording');
    
    recordingManager.stopRecording();
    
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      setCurrentStream(null);
    }
    
    if (originalStream) {
      originalStream.getTracks().forEach(track => track.stop());
      setOriginalStream(null);
    }
    
    setStreamController(null);
    
    // Use hook's state management
    stopRecordingState();
    
    logger.info('Recording stopped');
  };
  
  /**
   * Pause recording
   */
  const pauseRecording = () => {
    logger.info('Pausing recording');
    recordingManager.pauseRecording();
    pauseRecordingState();
  };
  
  /**
   * Resume recording
   */
  const resumeRecording = () => {
    logger.info('Resuming recording');
    recordingManager.resumeRecording();
    resumeRecordingState();
  };
  
  /**
   * Clear all recordings
   */
  const clearRecordings = () => {
    logger.info('Clearing all recordings');
    
    // Stop any ongoing recording
    if (recordingState.isRecording) {
      stopRecording();
    }
    
    // Revoke all chunk URLs
    chunkManager.clearChunks(recordingState.chunks);
    
    // Clear state
    clearRecordingsState();
    
    logger.info('All recordings cleared');
  };
  
  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecordings
  };
}