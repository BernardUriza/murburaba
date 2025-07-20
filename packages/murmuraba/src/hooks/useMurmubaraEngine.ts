import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  initializeAudioEngine,
  destroyEngine,
  processStream,
  processStreamChunked,
  getEngineStatus,
  getDiagnostics,
  onMetricsUpdate,
} from '../api';
import {
  MurmubaraConfig,
  EngineState,
  ProcessingMetrics,
  StreamController,
  DiagnosticInfo,
  ChunkMetrics,
} from '../types';
import { getAudioConverter, AudioConverter } from '../utils/audioConverter';

export interface ProcessedChunk extends ChunkMetrics {
  id: string;
  processedAudioUrl?: string;
  originalAudioUrl?: string;
  isPlaying: boolean;
  isExpanded: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  chunks: ProcessedChunk[];
}

export interface UseMurmubaraEngineOptions extends MurmubaraConfig {
  autoInitialize?: boolean;
  defaultChunkDuration?: number;
  fallbackToManual?: boolean;
  onInitError?: (error: Error) => void;
  react19Mode?: boolean;
}

export interface UseMurmubaraEngineReturn {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  engineState: EngineState;
  metrics: ProcessingMetrics | null;
  diagnostics: DiagnosticInfo | null;
  
  // Recording State
  recordingState: RecordingState;
  currentStream: MediaStream | null;
  streamController: StreamController | null;
  
  // Actions
  initialize: () => Promise<void>;
  destroy: (force?: boolean) => Promise<void>;
  processStream: (stream: MediaStream) => Promise<StreamController>;
  processStreamChunked: (
    stream: MediaStream,
    config: {
      chunkDuration: number;
      onChunkProcessed?: (chunk: ChunkMetrics) => void;
    }
  ) => Promise<StreamController>;
  
  // Recording Actions
  startRecording: (chunkDuration?: number) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecordings: () => void;
  
  // Audio Playback Actions
  toggleChunkPlayback: (chunkId: string, audioType: 'processed' | 'original') => Promise<void>;
  toggleChunkExpansion: (chunkId: string) => void;
  
  // Utility
  getDiagnostics: () => DiagnosticInfo | null;
  resetError: () => void;
  formatTime: (seconds: number) => string;
  getAverageNoiseReduction: () => number;
}

/**
 * Main Murmuraba hook with full recording, chunking, and playback functionality
 * 
 * @example
 * ```tsx
 * const {
 *   isInitialized,
 *   recordingState,
 *   startRecording,
 *   stopRecording,
 *   toggleChunkPlayback
 * } = useMurmubaraEngine({
 *   autoInitialize: true,
 *   defaultChunkDuration: 8
 * });
 * ```
 */
export function useMurmubaraEngine(
  options: UseMurmubaraEngineOptions = {}
): UseMurmubaraEngineReturn {
  const { 
    autoInitialize = false, 
    defaultChunkDuration = 8,
    fallbackToManual = false, 
    onInitError,
    react19Mode = false,
    ...config 
  } = options;
  
  // Detect React version
  const reactVersion = React.version;
  const isReact19 = reactVersion.startsWith('19') || react19Mode;
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>('uninitialized');
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  
  // Recording specific state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    chunks: []
  });
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [originalStream, setOriginalStream] = useState<MediaStream | null>(null);
  const [streamController, setStreamController] = useState<StreamController | null>(null);
  
  // Refs for internal state management
  const metricsUnsubscribeRef = useRef<(() => void) | null>(null);
  const initializePromiseRef = useRef<Promise<void> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const originalRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkRecordingsRef = useRef<Map<string, { processed: Blob[], original: Blob[], finalized: boolean }>>(new Map());
  const processChunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingMimeTypeRef = useRef<string>('audio/webm');
  const audioConverterRef = useRef<AudioConverter | null>(null);
  
  // Initialize engine
  const initialize = useCallback(async () => {
    if (initializePromiseRef.current) {
      return initializePromiseRef.current;
    }
    
    if (isInitialized) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    initializePromiseRef.current = (async () => {
      try {
        await initializeAudioEngine(config);
        
        // Set up metrics listener
        onMetricsUpdate((newMetrics: ProcessingMetrics) => {
          setMetrics(newMetrics);
        });
        
        // Initialize audio converter
        audioConverterRef.current = getAudioConverter();
        
        setIsInitialized(true);
        setEngineState('ready');
        updateDiagnostics();
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errorMessage = error.message;
        setError(errorMessage);
        setEngineState('error');
        
        // Call error callback if provided
        if (onInitError) {
          onInitError(error);
        }
        
        // If fallback is enabled and we're in React 19, try manual initialization
        if (fallbackToManual && isReact19) {
          console.warn('[MurmubaraEngine] Auto-init failed in React 19, attempting manual fallback');
        } else {
          throw err;
        }
      } finally {
        setIsLoading(false);
        initializePromiseRef.current = null;
      }
    })();
    
    return initializePromiseRef.current;
  }, [config, isInitialized, isReact19, fallbackToManual, onInitError]);
  
  // Destroy engine
  const destroy = useCallback(async (force: boolean = false) => {
    if (!isInitialized) {
      return;
    }
    
    try {
      // Stop any ongoing recording
      if (recordingState.isRecording) {
        stopRecording();
      }
      
      await destroyEngine({ force });
      setIsInitialized(false);
      setEngineState('destroyed');
      setMetrics(null);
      setDiagnostics(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized, recordingState.isRecording]);
  
  // Detect supported MIME type using AudioConverter utility
  const getSupportedMimeType = useCallback(() => {
    return AudioConverter.getBestRecordingFormat();
  }, []);
  
  // Start recording with chunking
  const startRecording = useCallback(async (chunkDuration: number = defaultChunkDuration) => {
    try {
      if (!isInitialized) {
        await initialize();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        } 
      });

      setOriginalStream(stream);
      setCurrentStream(stream);

      // Clear previous recordings
      chunkRecordingsRef.current.clear();
      let recordingChunkId: string | null = null;
      let previousChunkId: string | null = null;
      
      // Process with chunking
      const controller = await processStreamChunked(stream, {
        chunkDuration: chunkDuration * 1000,
        onChunkProcessed: (chunk) => {
          const chunkId = `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const enhancedChunk: ProcessedChunk = {
            ...chunk,
            id: chunkId,
            isPlaying: false,
            isExpanded: false
          };
          
          setRecordingState(prev => ({
            ...prev,
            chunks: [...prev.chunks, enhancedChunk]
          }));
          
          // Finalize previous chunk if exists
          if (previousChunkId && chunkRecordingsRef.current.has(previousChunkId)) {
            const prevRecording = chunkRecordingsRef.current.get(previousChunkId)!;
            prevRecording.finalized = true;
          }
          
          // Initialize recording storage for this chunk
          chunkRecordingsRef.current.set(chunkId, { processed: [], original: [], finalized: false });
          
          // Important: Update the chunk IDs in the correct order
          previousChunkId = recordingChunkId;
          recordingChunkId = chunkId;
          
          console.log('New chunk created:', chunkId, 'Previous chunk:', previousChunkId);
        }
      });

      setStreamController(controller);

      // Detect and use supported MIME type
      const mimeType = getSupportedMimeType();
      recordingMimeTypeRef.current = mimeType;
      console.log('Using MIME type for recording:', mimeType);

      // Record processed and original audio
      const processedStream = controller.stream;
      const recorder = new MediaRecorder(processedStream, { mimeType });
      const originalRecorder = new MediaRecorder(stream, { mimeType });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && recordingChunkId) {
          const recordings = chunkRecordingsRef.current.get(recordingChunkId);
          if (recordings) {
            recordings.processed.push(event.data);
          }
        }
      };
      
      originalRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && recordingChunkId) {
          const recordings = chunkRecordingsRef.current.get(recordingChunkId);
          if (recordings) {
            recordings.original.push(event.data);
          }
        }
      };

      // Start continuous recording with timeslice
      recorder.start(100); // collect data every 100ms
      originalRecorder.start(100);
      
      // Process recorded chunks periodically
      processChunkIntervalRef.current = setInterval(() => {
        chunkRecordingsRef.current.forEach((recordings, chunkId) => {
          // Only process if we have data and haven't already created URLs
          const needsProcessing = (recordings.processed.length > 0 || recordings.original.length > 0);
          const hasEnoughData = recordings.finalized || recordings.processed.length > 3 || recordings.original.length > 3;
          
          if (needsProcessing && hasEnoughData) {
            const chunk = recordingState.chunks.find(c => c.id === chunkId);
            
            // Skip if we already have URLs
            if (chunk && chunk.processedAudioUrl && chunk.originalAudioUrl) {
              return;
            }
            
            const processedBlob = recordings.processed.length > 0 
              ? new Blob(recordings.processed, { type: mimeType })
              : null;
            const originalBlob = recordings.original.length > 0
              ? new Blob(recordings.original, { type: mimeType })
              : null;
            
            const processedUrl = processedBlob && processedBlob.size > 0 ? URL.createObjectURL(processedBlob) : undefined;
            const originalUrl = originalBlob && originalBlob.size > 0 ? URL.createObjectURL(originalBlob) : undefined;
            
            if (processedUrl || originalUrl) {
              setRecordingState(prev => ({
                ...prev,
                chunks: prev.chunks.map(chunk => {
                  if (chunk.id === chunkId) {
                    return {
                      ...chunk,
                      processedAudioUrl: processedUrl || chunk.processedAudioUrl,
                      originalAudioUrl: originalUrl || chunk.originalAudioUrl
                    };
                  }
                  return chunk;
                })
              }));
              
              // Clear the processed data to avoid reprocessing
              if (recordings.finalized) {
                recordings.processed = [];
                recordings.original = [];
              }
            }
          }
        });
      }, 500); // Check more frequently
      
      mediaRecorderRef.current = recorder;
      originalRecorderRef.current = originalRecorder;
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        recordingTime: 0
      }));
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [isInitialized, initialize, processStreamChunked, getSupportedMimeType, defaultChunkDuration]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    // First, stop the recorders to get final data
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (originalRecorderRef.current && originalRecorderRef.current.state !== 'inactive') {
      originalRecorderRef.current.stop();
    }
    
    // Finalize all pending recordings
    chunkRecordingsRef.current.forEach((recording) => {
      recording.finalized = true;
    });
    
    // Give time for final data to be processed
    setTimeout(() => {
      if (streamController) {
        streamController.stop();
      }
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      if (originalStream) {
        originalStream.getTracks().forEach(track => track.stop());
      }
    }, 500);
    
    // Clear intervals
    if (processChunkIntervalRef.current) {
      clearInterval(processChunkIntervalRef.current);
      processChunkIntervalRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setRecordingState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false
    }));
    setStreamController(null);
    setCurrentStream(null);
    setOriginalStream(null);
  }, [streamController, currentStream, originalStream]);
  
  // Pause recording
  const pauseRecording = useCallback(() => {
    if (streamController && !recordingState.isPaused) {
      streamController.pause();
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      if (originalRecorderRef.current?.state === 'recording') {
        originalRecorderRef.current.pause();
      }
      setRecordingState(prev => ({ ...prev, isPaused: true }));
    }
  }, [streamController, recordingState.isPaused]);
  
  // Resume recording
  const resumeRecording = useCallback(() => {
    if (streamController && recordingState.isPaused) {
      streamController.resume();
      if (mediaRecorderRef.current?.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      if (originalRecorderRef.current?.state === 'paused') {
        originalRecorderRef.current.resume();
      }
      setRecordingState(prev => ({ ...prev, isPaused: false }));
    }
  }, [streamController, recordingState.isPaused]);
  
  // Clear all recordings
  const clearRecordings = useCallback(() => {
    recordingState.chunks.forEach(chunk => {
      if (chunk.processedAudioUrl) URL.revokeObjectURL(chunk.processedAudioUrl);
      if (chunk.originalAudioUrl) URL.revokeObjectURL(chunk.originalAudioUrl);
    });
    
    // Clear audio elements
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    audioRefs.current = {};
    
    setRecordingState(prev => ({ ...prev, chunks: [] }));
  }, [recordingState.chunks]);
  
  // Toggle chunk playback with audio conversion support
  const toggleChunkPlayback = useCallback(async (chunkId: string, audioType: 'processed' | 'original') => {
    const chunk = recordingState.chunks.find(c => c.id === chunkId);
    if (!chunk) {
      console.error('Chunk not found:', chunkId);
      return;
    }

    const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl;
    if (!audioUrl) {
      console.error(`No ${audioType} audio URL for chunk:`, chunkId);
      return;
    }

    const audioKey = `${chunkId}-${audioType}`;
    
    // Check if we need to convert the audio
    let playableUrl = audioUrl;
    const mimeType = recordingMimeTypeRef.current;
    
    // Always convert to WAV for maximum compatibility
    if (audioConverterRef.current) {
      console.log('Converting audio from', mimeType, 'to WAV for playback...');
      try {
        playableUrl = await audioConverterRef.current.convertBlobUrl(audioUrl);
        console.log('Audio converted successfully');
      } catch (error) {
        console.error('Failed to convert audio:', error);
        // Use original URL as fallback
        playableUrl = audioUrl;
      }
    }
    
    if (!audioRefs.current[audioKey]) {
      audioRefs.current[audioKey] = new Audio();
      
      audioRefs.current[audioKey].onerror = (e) => {
        console.error('Audio playback error:', e);
        console.error('Audio URL:', audioUrl);
        console.error('Audio type:', audioType);
      };
      
      audioRefs.current[audioKey].onended = () => {
        setRecordingState(prev => ({
          ...prev,
          chunks: prev.chunks.map(c => 
            c.id === chunkId ? { ...c, isPlaying: false } : c
          )
        }));
      };
      
      audioRefs.current[audioKey].src = playableUrl;
    }

    const audio = audioRefs.current[audioKey];
    
    if (chunk.isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setRecordingState(prev => ({
        ...prev,
        chunks: prev.chunks.map(c => 
          c.id === chunkId ? { ...c, isPlaying: false } : c
        )
      }));
    } else {
      // Stop all other audio
      Object.values(audioRefs.current).forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
      
      setRecordingState(prev => ({
        ...prev,
        chunks: prev.chunks.map(c => ({ ...c, isPlaying: false }))
      }));
      
      // Play this audio
      try {
        await audio.play();
        setRecordingState(prev => ({
          ...prev,
          chunks: prev.chunks.map(c => 
            c.id === chunkId ? { ...c, isPlaying: true } : c
          )
        }));
      } catch (error) {
        console.error('Failed to play audio:', error);
        if ((error as Error).name === 'NotSupportedError') {
          console.error('Audio format not supported. MIME type:', mimeType);
        }
      }
    }
  }, [recordingState.chunks]);
  
  // Toggle chunk expansion
  const toggleChunkExpansion = useCallback((chunkId: string) => {
    setRecordingState(prev => ({
      ...prev,
      chunks: prev.chunks.map(c => {
        if (c.id === chunkId) {
          return { ...c, isExpanded: !c.isExpanded };
        } else {
          return { ...c, isExpanded: false };
        }
      })
    }));
  }, []);
  
  // Format time helper
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Get average noise reduction
  const getAverageNoiseReduction = useCallback(() => {
    if (recordingState.chunks.length === 0) return 0;
    return recordingState.chunks.reduce((acc, chunk) => acc + chunk.noiseRemoved, 0) / recordingState.chunks.length;
  }, [recordingState.chunks]);
  
  const processStreamWrapper = useCallback(async (stream: MediaStream) => {
    if (!isInitialized) {
      throw new Error('Engine not initialized');
    }
    
    try {
      const controller = await processStream(stream);
      updateDiagnostics();
      return controller;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);
  
  const processStreamChunkedWrapper = useCallback(async (
    stream: MediaStream,
    chunkConfig: {
      chunkDuration: number;
      onChunkProcessed?: (chunk: ChunkMetrics) => void;
    }
  ) => {
    if (!isInitialized) {
      throw new Error('Engine not initialized');
    }
    
    try {
      const controller = await processStreamChunked(stream, chunkConfig);
      updateDiagnostics();
      return controller;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);
  
  const updateDiagnostics = useCallback(() => {
    if (!isInitialized) {
      setDiagnostics(null);
      return null;
    }
    
    try {
      const diag = getDiagnostics();
      setDiagnostics(diag);
      setEngineState(diag.engineState);
      return diag;
    } catch {
      return null;
    }
  }, [isInitialized]);
  
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  // Auto-initialize if requested
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isLoading) {
      initialize();
    }
  }, [autoInitialize, isInitialized, isLoading, initialize]);
  
  // Update recording time
  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused) {
      const startTime = Date.now() - recordingState.recordingTime * 1000;
      recordingIntervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          recordingTime: Math.floor((Date.now() - startTime) / 1000)
        }));
      }, 100);
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, [recordingState.isRecording, recordingState.isPaused, recordingState.recordingTime]);
  
  // Update engine state periodically
  useEffect(() => {
    if (!isInitialized) return;
    
    const interval = setInterval(() => {
      try {
        const status = getEngineStatus();
        setEngineState(status as EngineState);
      } catch {
        // Engine might be destroyed
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isInitialized]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingState.isRecording) {
        stopRecording();
      }
      if (isInitialized) {
        destroy(true).catch(console.error);
      }
    };
  }, []);
  
  return {
    // State
    isInitialized,
    isLoading,
    error,
    engineState,
    metrics,
    diagnostics,
    
    // Recording State
    recordingState,
    currentStream,
    streamController,
    
    // Actions
    initialize,
    destroy,
    processStream: processStreamWrapper,
    processStreamChunked: processStreamChunkedWrapper,
    
    // Recording Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecordings,
    
    // Audio Playback Actions
    toggleChunkPlayback,
    toggleChunkExpansion,
    
    // Utility
    getDiagnostics: updateDiagnostics,
    resetError,
    formatTime,
    getAverageNoiseReduction,
  };
}