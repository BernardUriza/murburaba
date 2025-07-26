import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ProcessedChunk } from 'murmuraba'
import type { ProcessingResults, ErrorState } from '../types'

interface AudioState extends ErrorState {
  // Engine state
  isEngineInitialized: boolean
  isProcessing: boolean
  isRecording: boolean
  
  // Configuration
  chunkDuration: number
  enableAGC: boolean
  
  // Processing results
  processingResults: ProcessingResults | null
  chunks: ProcessedChunk[]
  selectedChunkId: string | null
  
  // Stream management
  currentStreamId: string | null
  
  // Metrics (computed via selectors, not stored)
  averageNoiseReduction: number
  totalDuration: number
  
  // Audio URLs for cleanup
  audioUrls: string[]
}

const initialState: AudioState = {
  isEngineInitialized: false,
  isProcessing: false,
  isRecording: false,
  chunkDuration: 8,
  enableAGC: false,
  processingResults: null,
  chunks: [],
  selectedChunkId: null,
  currentStreamId: null,
  averageNoiseReduction: 0,
  totalDuration: 0,
  audioUrls: [],
  hasError: false,
  errorMessage: null
}

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setEngineInitialized: (state, action: PayloadAction<boolean>) => {
      state.isEngineInitialized = action.payload
    },
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload
    },
    setChunkDuration: (state, action: PayloadAction<number>) => {
      state.chunkDuration = action.payload
    },
    setEnableAGC: (state, action: PayloadAction<boolean>) => {
      state.enableAGC = action.payload
    },
    setProcessingResults: (state, action: PayloadAction<ProcessingResults | null>) => {
      state.processingResults = action.payload
      state.hasError = false
      state.errorMessage = null
      
      // Don't calculate metrics here - use selectors instead
      if (action.payload) {
        state.chunks = action.payload.chunks || []
      }
    },
    addChunk: (state, action: PayloadAction<ProcessedChunk>) => {
      state.chunks.push(action.payload)
    },
    updateChunk: (state, action: PayloadAction<{ id: string; updates: Partial<ProcessedChunk> }>) => {
      const index = state.chunks.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.chunks[index] = { ...state.chunks[index], ...action.payload.updates }
      }
    },
    removeChunk: (state, action: PayloadAction<string>) => {
      state.chunks = state.chunks.filter(c => c.id !== action.payload)
    },
    clearChunks: (state) => {
      state.chunks = []
      state.processingResults = null
      state.averageNoiseReduction = 0
      state.totalDuration = 0
    },
    setSelectedChunk: (state, action: PayloadAction<string | null>) => {
      state.selectedChunkId = action.payload
    },
    setCurrentStreamId: (state, action: PayloadAction<string | null>) => {
      state.currentStreamId = action.payload
    },
    // Error handling
    setError: (state, action: PayloadAction<{ message: string; code?: string }>) => {
      state.hasError = true
      state.errorMessage = action.payload.message
      state.errorCode = action.payload.code
      state.errorTimestamp = Date.now()
    },
    clearError: (state) => {
      state.hasError = false
      state.errorMessage = null
      state.errorCode = undefined
      state.errorTimestamp = undefined
    },
    // Audio URL management
    addAudioUrl: (state, action: PayloadAction<string>) => {
      state.audioUrls.push(action.payload)
    },
    removeAudioUrl: (state, action: PayloadAction<string>) => {
      state.audioUrls = state.audioUrls.filter(url => url !== action.payload)
      // Revoke the URL to free memory
      URL.revokeObjectURL(action.payload)
    },
    clearAudioUrls: (state) => {
      // Revoke all URLs before clearing
      state.audioUrls.forEach(url => URL.revokeObjectURL(url))
      state.audioUrls = []
    }
  }
})

export const {
  setEngineInitialized,
  setProcessing,
  setRecording,
  setChunkDuration,
  setEnableAGC,
  setProcessingResults,
  addChunk,
  updateChunk,
  removeChunk,
  clearChunks,
  setSelectedChunk,
  setCurrentStreamId,
  setError,
  clearError,
  addAudioUrl,
  removeAudioUrl,
  clearAudioUrls
} = audioSlice.actions

export default audioSlice.reducer