import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioChunk {
  id: number;
  url: string;
  timestamp: Date;
}

interface UseAudioRecorderProps {
  initialChunkDuration?: number;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioChunks: AudioChunk[];
  chunkDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  setChunkDuration: (duration: number) => void;
  clearChunks: () => void;
}

export const useAudioRecorder = ({ 
  initialChunkDuration = 2 
}: UseAudioRecorderProps = {}): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [chunkDuration, setChunkDuration] = useState(initialChunkDuration);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const chunkIdRef = useRef(0);
  const currentChunksRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    workerRef.current = new Worker('/audio-recorder.worker.js');
    
    workerRef.current.onmessage = (e) => {
      const { type } = e.data;
      
      switch (type) {
        case 'CHUNK_END':
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
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
  }, []);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
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
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
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
    clearChunks
  };
};