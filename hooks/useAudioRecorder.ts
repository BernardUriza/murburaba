import { useState, useRef, useEffect, useCallback } from 'react';
import { useRNNoise } from '../lib/audio/useRNNoise';

export interface AudioChunk {
  id: number;
  url: string;
  urlWithoutNR?: string;
  timestamp: Date;
}

interface UseAudioRecorderProps {
  initialChunkDuration?: number;
  enableNoiseSupression?: boolean;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioChunks: AudioChunk[];
  chunkDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  setChunkDuration: (duration: number) => void;
  clearChunks: () => void;
  isNoiseSuppressionEnabled: boolean;
  setNoiseSuppressionEnabled: (enabled: boolean) => void;
  isRNNoiseInitialized: boolean;
  isRNNoiseLoading: boolean;
  rnnoiseError: string | null;
  initializeRNNoise: () => Promise<void>;
}

export const useAudioRecorder = ({ 
  initialChunkDuration = 2,
  enableNoiseSupression = true
}: UseAudioRecorderProps = {}): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [chunkDuration, setChunkDuration] = useState(initialChunkDuration);
  const [isNoiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(enableNoiseSupression);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const originalRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const chunkIdRef = useRef(0);
  const currentChunksRef = useRef<Blob[]>([]);
  const currentOriginalChunksRef = useRef<Blob[]>([]);
  
  const { 
    processStream, 
    isInitialized, 
    isLoading: isRNNoiseLoading, 
    error: rnnoiseError,
    cleanup: cleanupRNNoise,
    initializeRNNoise 
  } = useRNNoise();
  
  useEffect(() => {
    workerRef.current = new Worker('/audio-recorder.worker.js');
    
    workerRef.current.onmessage = (e) => {
      const { type } = e.data;
      
      switch (type) {
        case 'CHUNK_END':
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          if (originalRecorderRef.current && originalRecorderRef.current.state === 'recording') {
            originalRecorderRef.current.stop();
          }
          break;
          
        case 'CHUNK_START':
          if (streamRef.current && streamRef.current.active && isRecording) {
            startNewChunk();
          }
          break;
      }
    };
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [isRecording]);
  
  const startNewChunk = useCallback(() => {
    if (!streamRef.current || !streamRef.current.active) return;
    
    currentChunksRef.current = [];
    currentOriginalChunksRef.current = [];
    
    // If noise suppression is enabled and we have a processed stream, record both
    if (isNoiseSuppressionEnabled && processedStreamRef.current) {
      // Main recorder with noise reduction
      const mediaRecorder = new MediaRecorder(processedStreamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      
      // Original recorder without noise reduction
      const originalRecorder = new MediaRecorder(streamRef.current);
      originalRecorderRef.current = originalRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentChunksRef.current.push(event.data);
        }
      };
      
      originalRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentOriginalChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        if (currentChunksRef.current.length > 0) {
          const audioBlob = new Blob(currentChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          
          let urlWithoutNR: string | undefined;
          if (currentOriginalChunksRef.current.length > 0) {
            const originalBlob = new Blob(currentOriginalChunksRef.current, { type: 'audio/webm' });
            urlWithoutNR = URL.createObjectURL(originalBlob);
          }
          
          setAudioChunks(prev => [...prev, {
            id: chunkIdRef.current++,
            url,
            urlWithoutNR,
            timestamp: new Date()
          }]);
        }
        
        // Stop original recorder if it's still recording
        if (originalRecorderRef.current && originalRecorderRef.current.state === 'recording') {
          originalRecorderRef.current.stop();
        }
      };
      
      mediaRecorder.start();
      originalRecorder.start();
    } else {
      // No noise reduction - just record the raw stream
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      currentChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        if (currentChunksRef.current.length > 0) {
          const audioBlob = new Blob(currentChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          
          setAudioChunks(prev => [...prev, {
            id: chunkIdRef.current++,
            url,
            timestamp: new Date()
          }]);
        }
      };
      
      mediaRecorder.start();
    }
  }, [isNoiseSuppressionEnabled]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Apply noise suppression if enabled
      if (isNoiseSuppressionEnabled) {
        try {
          const processedStream = await processStream(stream);
          processedStreamRef.current = processedStream;
        } catch (error) {
          console.error('Failed to apply noise suppression:', error);
          // Continue without noise suppression
        }
      }
      
      setAudioChunks([]);
      chunkIdRef.current = 0;
      setIsRecording(true);
      
      startNewChunk();
      
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'START',
          payload: { chunkDuration }
        });
      }
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  };
  
  const stopRecording = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (originalRecorderRef.current && originalRecorderRef.current.state === 'recording') {
      originalRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach(track => track.stop());
      processedStreamRef.current = null;
    }
    
    cleanupRNNoise();
    
    setIsRecording(false);
  };
  
  const updateChunkDuration = (duration: number) => {
    setChunkDuration(duration);
    if (workerRef.current && !isRecording) {
      workerRef.current.postMessage({
        type: 'UPDATE_DURATION',
        payload: { chunkDuration: duration }
      });
    }
  };
  
  const clearChunks = () => {
    audioChunks.forEach(chunk => URL.revokeObjectURL(chunk.url));
    setAudioChunks([]);
  };
  
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      audioChunks.forEach(chunk => URL.revokeObjectURL(chunk.url));
    };
  }, []);
  
  return {
    isRecording,
    audioChunks,
    chunkDuration,
    startRecording,
    stopRecording,
    setChunkDuration: updateChunkDuration,
    clearChunks,
    isNoiseSuppressionEnabled,
    setNoiseSuppressionEnabled,
    isRNNoiseInitialized: isInitialized,
    isRNNoiseLoading,
    rnnoiseError,
    initializeRNNoise
  };
};