// Redux action types with strict typing
import type { ProcessingResults } from './types'
import type { ProcessedChunk } from 'murmuraba'

// Audio action payloads
export interface SetProcessingResultsPayload {
  results: ProcessingResults | null
}

export interface AddChunkPayload {
  chunk: ProcessedChunk
}

export interface SetErrorPayload {
  message: string
  code?: string
}

export interface ProcessFilePayload {
  file: File
  options?: {
    chunkDuration?: number
    outputFormat?: 'wav' | 'webm'
  }
}

export interface ProcessRecordingPayload {
  duration: number
  options?: {
    chunkDuration?: number
    outputFormat?: 'wav' | 'webm'
  }
}

// UI action payloads
export interface AddNotificationPayload {
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export interface SetThemePayload {
  theme: 'light' | 'dark' | 'auto'
}

// Action type constants
export const AUDIO_ACTIONS = {
  SET_ENGINE_INITIALIZED: 'audio/setEngineInitialized',
  SET_PROCESSING: 'audio/setProcessing',
  SET_RECORDING: 'audio/setRecording',
  SET_CHUNK_DURATION: 'audio/setChunkDuration',
  SET_ENABLE_AGC: 'audio/setEnableAGC',
  SET_PROCESSING_RESULTS: 'audio/setProcessingResults',
  ADD_CHUNK: 'audio/addChunk',
  CLEAR_CHUNKS: 'audio/clearChunks',
  SET_CURRENT_STREAM_ID: 'audio/setCurrentStreamId',
  SET_ERROR: 'audio/setError',
  CLEAR_ERROR: 'audio/clearError'
} as const

export const UI_ACTIONS = {
  TOGGLE_AUDIO_DEMO: 'ui/toggleAudioDemo',
  TOGGLE_ADVANCED_METRICS: 'ui/toggleAdvancedMetrics',
  TOGGLE_SETTINGS: 'ui/toggleSettings',
  TOGGLE_COPILOT: 'ui/toggleCopilot',
  ADD_NOTIFICATION: 'ui/addNotification',
  REMOVE_NOTIFICATION: 'ui/removeNotification',
  SET_THEME: 'ui/setTheme',
  TOGGLE_SIDEBAR: 'ui/toggleSidebar',
  SET_UI_ERROR: 'ui/setUIError',
  CLEAR_UI_ERROR: 'ui/clearUIError'
} as const