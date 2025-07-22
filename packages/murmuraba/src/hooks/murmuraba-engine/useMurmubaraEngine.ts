import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  initializeAudioEngine,
  destroyEngine,
  processStream,
  processStreamChunked,
  getEngineStatus,
  getDiagnostics,
  onMetricsUpdate,
  getEngine,
} from '../../api';
import { getAudioConverter, AudioConverter, destroyAudioConverter } from '../../utils/audioConverter';

// Import types
import {
  ProcessedChunk,
  RecordingState,
  UseMurmubaraEngineOptions,
  UseMurmubaraEngineReturn
} from './types';
import {
  EngineState,
  ProcessingMetrics,
  StreamController,
  DiagnosticInfo,
  ChunkMetrics,
} from '../../types';

// Import managers
import { URLManager } from './urlManager';
import { ChunkManager } from './chunkManager';
import { RecordingManager } from './recordingManager';
import { AudioExporter } from './audioExporter';
import { PlaybackManager } from './playbackManager';
import { createRecordingFunctions } from './recordingFunctions';

// Import hooks
import { useRecordingState } from './useRecordingState';

// Import constants
import { DEFAULT_CHUNK_DURATION, RECORDING_UPDATE_INTERVAL, LOG_PREFIX } from './constants';

/**
 * Main Murmuraba hook with medical-grade recording functionality
 * Refactored for better maintainability
 */
export function useMurmubaraEngine(
  options: UseMurmubaraEngineOptions = {}
): UseMurmubaraEngineReturn {
  const { 
    autoInitialize = false, 
    defaultChunkDuration = DEFAULT_CHUNK_DURATION,
    fallbackToManual = false, 
    onInitError,
    react19Mode = false,
    ...config 
  } = options;

  // Check React version
  const isReact19 = react19Mode || React.version.startsWith('19');
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<EngineState>('uninitialized');
  const [metrics, setMetrics] = useState<ProcessingMetrics | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  
  // Use dedicated recording state hook
  const {
    recordingState,
    startRecording: recordingStateStart,
    stopRecording: recordingStateStop,
    pauseRecording: recordingStatePause,
    resumeRecording: recordingStateResume,
    addChunk,
    toggleChunkPlayback: recordingStateTogglePlayback,
    toggleChunkExpansion,
    clearRecordings: recordingStateClear,
    updateRecordingTime
  } = useRecordingState();
  
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [originalStream, setOriginalStream] = useState<MediaStream | null>(null);
  const [streamController, setStreamController] = useState<StreamController | null>(null);
  
  // Initialize managers
  const urlManagerRef = useRef(new URLManager());
  const chunkManagerRef = useRef(new ChunkManager(urlManagerRef.current));
  const recordingManagerRef = useRef(new RecordingManager(urlManagerRef.current));
  const audioExporterRef = useRef(new AudioExporter());
  const playbackManagerRef = useRef(new PlaybackManager());
  
  // Other refs
  const metricsUnsubscribeRef = useRef<(() => void) | null>(null);
  const initializePromiseRef = useRef<Promise<void> | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioConverterRef = useRef<AudioConverter | null>(null);
  
  // Update diagnostics
  const updateDiagnostics = useCallback(() => {
    if (!isInitialized) {
      setDiagnostics(null);
      return null;
    }
    
    try {
      const diag = getDiagnostics();
      setDiagnostics(diag);
      return diag;
    } catch {
      return null;
    }
  }, [isInitialized]);

  // Fix race condition: Update diagnostics when isInitialized changes to true
  useEffect(() => {
    if (isInitialized && !diagnostics) {
      updateDiagnostics();
    }
  }, [isInitialized, diagnostics, updateDiagnostics]);
  
  // Initialize engine
  const initialize = useCallback(async () => {
    console.log(`🚀 ${LOG_PREFIX.LIFECYCLE} Initializing MurmubaraEngine...`);
    if (initializePromiseRef.current) {
      console.log(`⏳ ${LOG_PREFIX.LIFECYCLE} Already initializing, returning existing promise`);
      return initializePromiseRef.current;
    }
    
    if (isInitialized) {
      console.log(`✅ ${LOG_PREFIX.LIFECYCLE} Already initialized, skipping`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    initializePromiseRef.current = (async () => {
      try {
        console.log(`🔧 ${LOG_PREFIX.LIFECYCLE} Calling initializeAudioEngine with config:`, config);
        await initializeAudioEngine(config);
        
        // Set up metrics listener
        onMetricsUpdate((newMetrics: ProcessingMetrics) => {
          setMetrics(newMetrics);
        });
        
        // Initialize audio converter
        audioConverterRef.current = getAudioConverter();
        audioExporterRef.current.setAudioConverter(audioConverterRef.current);
        
        setIsInitialized(true);
        setEngineState('ready');
        console.log(`🎉 ${LOG_PREFIX.LIFECYCLE} Engine initialized successfully!`);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio engine';
        console.error(`❌ ${LOG_PREFIX.LIFECYCLE} Initialization failed:`, errorMessage);
        setError(errorMessage);
        setEngineState('error');
        
        if (onInitError) {
          onInitError(err instanceof Error ? err : new Error(errorMessage));
        }
        
        throw err;
      } finally {
        setIsLoading(false);
        initializePromiseRef.current = null;
      }
    })();
    
    return initializePromiseRef.current;
  }, [config, isInitialized, onInitError, updateDiagnostics]);
  
  // Destroy engine
  const destroy = useCallback(async (force: boolean = false) => {
    console.log(`🔥 ${LOG_PREFIX.LIFECYCLE} Destroying engine...`, { force });
    if (!isInitialized) {
      console.log(`⚠️ ${LOG_PREFIX.LIFECYCLE} Engine not initialized, skipping destroy`);
      return;
    }
    
    try {
      // Stop any ongoing recording
      if (recordingState.isRecording) {
        console.log(`🛑 ${LOG_PREFIX.LIFECYCLE} Stopping ongoing recording before destroy`);
        recordingManagerRef.current.stopRecording();
      }
      
      // Clean up event listeners
      if (metricsUnsubscribeRef.current) {
        metricsUnsubscribeRef.current();
        metricsUnsubscribeRef.current = null;
      }
      
      // CRITICAL: Destroy audio converter to prevent memory leaks
      destroyAudioConverter();
      
      // Clean up all URLs
      urlManagerRef.current.revokeAllUrls();
      
      await destroyEngine({ force });
      setIsInitialized(false);
      setEngineState('destroyed');
      setMetrics(null);
      setDiagnostics(null);
      console.log(`💀 ${LOG_PREFIX.LIFECYCLE} Engine destroyed successfully`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized, recordingState.isRecording]);
  
  // Export functions (delegated to AudioExporter)
  const exportChunkAsWav = useCallback(async (
    chunkId: string,
    audioType: 'processed' | 'original'
  ): Promise<Blob> => {
    const chunk = chunkManagerRef.current.findChunk(recordingState.chunks, chunkId);
    if (!chunk) throw new Error(`Chunk not found: ${chunkId}`);
    
    return audioExporterRef.current.exportChunkAsWav(chunk, audioType);
  }, [recordingState.chunks]);
  
  const exportChunkAsMp3 = useCallback(async (
    chunkId: string,
    audioType: 'processed' | 'original',
    bitrate?: number
  ): Promise<Blob> => {
    const chunk = chunkManagerRef.current.findChunk(recordingState.chunks, chunkId);
    if (!chunk) throw new Error(`Chunk not found: ${chunkId}`);
    
    return audioExporterRef.current.exportChunkAsMp3(chunk, audioType, bitrate);
  }, [recordingState.chunks]);
  
  const downloadChunk = useCallback(async (
    chunkId: string,
    format: 'webm' | 'wav' | 'mp3',
    audioType: 'processed' | 'original'
  ): Promise<void> => {
    const chunk = chunkManagerRef.current.findChunk(recordingState.chunks, chunkId);
    if (!chunk) throw new Error(`Chunk not found: ${chunkId}`);
    
    return audioExporterRef.current.downloadChunk(chunk, format, audioType);
  }, [recordingState.chunks]);
  
  // Utility functions
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  const getAverageNoiseReduction = useCallback(() => {
    return chunkManagerRef.current.getAverageNoiseReduction(recordingState.chunks);
  }, [recordingState.chunks]);
  
  // Create recording functions
  const recordingFunctions = createRecordingFunctions({
    isInitialized,
    recordingState,
    recordingStateHook: {
      recordingState,
      startRecording: recordingStateStart,
      stopRecording: recordingStateStop,
      pauseRecording: recordingStatePause,
      resumeRecording: recordingStateResume,
      addChunk,
      toggleChunkPlayback: recordingStateTogglePlayback,
      toggleChunkExpansion,
      clearRecordings: recordingStateClear,
      updateRecordingTime
    },
    currentStream,
    originalStream,
    setCurrentStream,
    setOriginalStream,
    setStreamController,
    setError,
    chunkManager: chunkManagerRef.current,
    recordingManager: recordingManagerRef.current,
    initialize
  });
  
  // Playback functions
  const toggleChunkPlayback = useCallback(async (
    chunkId: string,
    audioType: 'processed' | 'original'
  ): Promise<void> => {
    const chunk = chunkManagerRef.current.findChunk(recordingState.chunks, chunkId);
    if (!chunk) return;
    
    await playbackManagerRef.current.toggleChunkPlayback(
      chunk,
      audioType,
      (id, isPlaying) => {
        recordingStateTogglePlayback(id, isPlaying);
      }
    );
  }, [recordingState.chunks, recordingStateTogglePlayback]);
  
  // Effects
  
  // Auto-initialize
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isLoading) {
      console.log(`🤖 ${LOG_PREFIX.LIFECYCLE} Auto-initializing engine...`);
      initialize();
    }
  }, [autoInitialize, isInitialized, isLoading, initialize]);
  
  // Update recording time
  useEffect(() => {
    if (recordingState.isRecording && !recordingState.isPaused) {
      const startTime = Date.now() - recordingState.recordingTime * 1000;
      const interval = setInterval(() => {
        updateRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, RECORDING_UPDATE_INTERVAL);
      
      return () => clearInterval(interval);
    }
  }, [recordingState.isRecording, recordingState.isPaused, recordingState.recordingTime, updateRecordingTime]);
  
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
    console.log(`🌟 ${LOG_PREFIX.LIFECYCLE} Component mounted, setting up cleanup handler`);
    
    return () => {
      console.log(`👋 ${LOG_PREFIX.LIFECYCLE} Component unmounting, cleaning up...`);
      
      // CRITICAL: Destroy audio converter to prevent memory leaks
      destroyAudioConverter();
      
      // Clean up all URLs
      urlManagerRef.current.revokeAllUrls();
      
      // Clean up audio elements
      playbackManagerRef.current.cleanup();
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
    processStream: processStream as any, // Type casting for compatibility
    processStreamChunked: processStreamChunked as any,
    
    // Recording Actions
    startRecording: recordingFunctions.startRecording,
    stopRecording: recordingFunctions.stopRecording,
    pauseRecording: recordingFunctions.pauseRecording,
    resumeRecording: recordingFunctions.resumeRecording,
    clearRecordings: recordingFunctions.clearRecordings,
    
    // Audio Playback Actions
    toggleChunkPlayback,
    toggleChunkExpansion,
    
    // Export Actions
    exportChunkAsWav,
    exportChunkAsMp3,
    downloadChunk,
    
    // Utility
    getDiagnostics: updateDiagnostics,
    resetError: () => setError(null),
    formatTime,
    getAverageNoiseReduction,
  };
}