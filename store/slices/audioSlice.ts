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
  
  // Live metrics
  currentInputLevel: number
  currentVadLevel: number
  currentOutputLevel: number
  vadLevel: number
  noiseReductionLevel: number
  
}

const initialState: AudioState = {
  isEngineInitialized: false,
  isProcessing: false,
  isRecording: false,
  chunkDuration: 8,
  enableAGC: true,
  processingResults: null,
  chunks: [],
  selectedChunkId: null,
  currentStreamId: null,
  currentInputLevel: 0,
  currentVadLevel: 0,
  currentOutputLevel: 0,
  vadLevel: 0,
  noiseReductionLevel: 0,
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
    clearChunks: (state) => {
      state.chunks = []
      state.processingResults = null
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
    setInputLevel: (state, action: PayloadAction<number>) => {
      state.currentInputLevel = Math.max(0, Math.min(1, action.payload))
    },
    setVadLevel: (state, action: PayloadAction<number>) => {
      state.currentVadLevel = Math.max(0, Math.min(1, action.payload))
    },
    updateMetrics: (state, action: PayloadAction<{ inputLevel?: number; outputLevel?: number; vad?: number; noiseReduction?: number }>) => {
      if (action.payload.inputLevel !== undefined) {
        state.currentInputLevel = Math.max(0, Math.min(1, action.payload.inputLevel))
      }
      if (action.payload.outputLevel !== undefined) {
        state.currentOutputLevel = Math.max(0, Math.min(1, action.payload.outputLevel))
      }
      if (action.payload.vad !== undefined) {
        state.vadLevel = Math.max(0, Math.min(1, action.payload.vad))
      }
      if (action.payload.noiseReduction !== undefined) {
        state.noiseReductionLevel = Math.max(0, Math.min(1, action.payload.noiseReduction))
      }
    },
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
  clearChunks,
  setCurrentStreamId,
  setError,
  clearError,
  setInputLevel,
  setVadLevel,
  updateMetrics
} = audioSlice.actions

export default audioSlice.reducer