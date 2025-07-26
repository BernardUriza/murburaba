import {
  MurmubaraConfig,
  ChunkMetrics,
  EngineState,
  ProcessingMetrics,
  DiagnosticInfo,
  StreamController
} from '../../types';

export interface ProcessedChunk extends ChunkMetrics {
  id: string;
  processedAudioUrl?: string;
  originalAudioUrl?: string;
  isPlaying: boolean;
  isPlayingOriginal?: boolean;
  isPlayingProcessed?: boolean;
  isValid?: boolean;
  errorMessage?: string;
  currentlyPlayingType?: 'processed' | 'original' | null;
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

// Internal interface with all functions (for internal use)
export interface UseMurmubaraEngineReturnInternal {
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
  processFile: (arrayBuffer: ArrayBuffer) => Promise<ArrayBuffer>;
  
  // Recording Actions - INTERNAL USE ONLY
  // These functions are not exposed in the public API
  // External consumers should use processFileWithMetrics('Use.Mic')
  _internal_startRecording: (chunkDuration?: number) => Promise<void>;
  _internal_stopRecording: () => void;
  _internal_pauseRecording: () => void;
  _internal_resumeRecording: () => void;
  _internal_clearRecordings: () => void;
  
  // Audio Playback Actions
  toggleChunkPlayback: (chunkId: string, audioType: 'processed' | 'original') => Promise<void>;
  
  // Export Actions
  exportChunkAsWav: (chunkId: string, audioType: 'processed' | 'original') => Promise<Blob>;
  exportChunkAsMp3: (chunkId: string, audioType: 'processed' | 'original', bitrate?: number) => Promise<Blob>;
  downloadChunk: (chunkId: string, format: 'webm' | 'wav' | 'mp3', audioType: 'processed' | 'original') => Promise<void>;
  
  // Utility
  getDiagnostics: () => DiagnosticInfo | null;
  resetError: () => void;
  formatTime: (seconds: number) => string;
  getAverageNoiseReduction: () => number;
}

// Public interface that omits internal recording functions
export interface UseMurmubaraEngineReturn extends Omit<UseMurmubaraEngineReturnInternal, 
  '_internal_startRecording' | '_internal_stopRecording' | '_internal_pauseRecording' | 
  '_internal_resumeRecording' | '_internal_clearRecordings'> {
  // Public API - users should use processFileWithMetrics('Use.Mic') for recording
}