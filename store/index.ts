import { configureStore } from '@reduxjs/toolkit'
import audioReducer from './slices/audioSlice'
import uiReducer from './slices/uiSlice'
import { murmurabaSuiteMiddleware } from './middleware/murmurabaSuiteMiddleware'

export const store = configureStore({
  reducer: {
    audio: audioReducer,
    ui: uiReducer
  },
  // Middleware configuration for non-serializable values
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Only ignore specific non-serializable fields
        ignoredActions: [
          'murmuraba/SET_CONTAINER', // DI Container only
          'audio/addChunk', // Chunks contain Blobs
          'audio/setProcessingResults' // Results contain ArrayBuffers
        ],
        ignoredActionPaths: [
          'payload.container', // DI Container
          'payload.blob', // Blob in chunks
          'payload.chunks.*.blob' // Blobs in chunk arrays
        ],
        ignoredPaths: [
          'audio.processingResults.processedBuffer', // ArrayBuffer in state
          'audio.processingResults.chunks', // All chunks with blobs
          'audio.chunks.*.blob', // Blobs in chunks
          'audio.chunks' // All chunks array
        ]
      }
    }).concat(murmurabaSuiteMiddleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch