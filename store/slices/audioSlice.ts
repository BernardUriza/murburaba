import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ProcessedChunk } from 'murmuraba'

interface AudioState {
  // Engine state
  isEngineInitialized: boolean
  isProcessing: boolean
  isRecording: boolean
  
  // Configuration
  chunkDuration: number
  enableAGC: boolean
  
  // Processing results
  processingResults: any | null
  chunks: ProcessedChunk[]
  selectedChunkId: string | null
  
  // Stream management
  currentStreamId: string | null
  
  // Metrics
  averageNoiseReduction: number
  totalDuration: number
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
  totalDuration: 0
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
    setProcessingResults: (state, action: PayloadAction<any>) => {
      state.processingResults = action.payload
      
      // Calculate metrics from chunks
      if (action.payload?.chunks) {
        const chunks = action.payload.chunks
        const totalReduction = chunks.reduce((sum: number, chunk: ProcessedChunk) => 
          sum + (chunk.noiseRemoved || 0), 0
        )
        state.averageNoiseReduction = chunks.length > 0 ? totalReduction / chunks.length : 0
        state.totalDuration = chunks.reduce((sum: number, chunk: ProcessedChunk) => 
          sum + chunk.duration, 0
        )
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
  setCurrentStreamId
} = audioSlice.actions

export default audioSlice.reducer