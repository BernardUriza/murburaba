import { ProcessedChunk } from './types';
import { initializeAudioEngine, getEngine, processStream, destroyEngine } from '../../api';
import { URLManager } from './urlManager';
import { ChunkManager } from './chunkManager';
import { RecordingManager } from './recordingManager';
import { logger } from './logger';

interface StandaloneRecorder {
  startRecording: (chunkDuration?: number) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  getChunks: () => ProcessedChunk[];
  isRecording: boolean;
  isPaused: boolean;
}

export async function createStandaloneRecorder(): Promise<StandaloneRecorder> {
  // Estado interno
  let isRecording = false;
  let isPaused = false;
  let chunks: ProcessedChunk[] = [];
  let currentStream: MediaStream | null = null;
  let streamController: any = null;
  
  // Managers
  const urlManager = new URLManager();
  const chunkManager = new ChunkManager(urlManager);
  const recordingManager = new RecordingManager(urlManager);
  
  // Inicializar engine si no está inicializado
  try {
    getEngine();
  } catch {
    await initializeAudioEngine({
      algorithm: 'spectral',
      logLevel: 'info',
      allowDegraded: true
    });
  }
  
  const startRecording = async (chunkDuration: number = 8000) => {
    if (isRecording) {
      throw new Error('Recording already in progress');
    }
    
    try {
      logger.info('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      currentStream = stream;
      const controller = await processStream(stream);
      streamController = controller;
      
      isRecording = true;
      isPaused = false;
      chunks = [];
      
      // Callback para cuando se procesa un chunk
      const onChunkProcessed = (chunk: ProcessedChunk) => {
        chunks.push(chunk);
        logger.info('Chunk processed', {
          id: chunk.id,
          duration: chunk.duration,
          noiseReduction: chunk.noiseRemoved
        });
      };
      
      // Iniciar el ciclo de grabación
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
      throw err;
    }
  };
  
  const stopRecording = () => {
    if (!isRecording) return;
    
    logger.info('Stopping recording');
    
    recordingManager.stopRecording();
    
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    
    if (streamController) {
      streamController.stop();
      streamController = null;
    }
    
    isRecording = false;
    isPaused = false;
    
    logger.info('Recording stopped');
  };
  
  const pauseRecording = () => {
    if (!isRecording || isPaused) return;
    
    logger.info('Pausing recording');
    recordingManager.pauseRecording();
    isPaused = true;
  };
  
  const resumeRecording = () => {
    if (!isRecording || !isPaused) return;
    
    logger.info('Resuming recording');
    recordingManager.resumeRecording();
    isPaused = false;
  };
  
  const getChunks = () => {
    return [...chunks]; // Retornar copia para evitar mutaciones
  };
  
  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getChunks,
    get isRecording() { return isRecording; },
    get isPaused() { return isPaused; }
  };
}