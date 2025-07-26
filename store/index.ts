import { configureStore } from '@reduxjs/toolkit'
import audioReducer from './slices/audioSlice'
import uiReducer from './slices/uiSlice'

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
        ignoredActions: [],
        ignoredActionPaths: [
          'payload.processedBuffer', // ArrayBuffer
          'payload.blob' // Blob
        ],
        ignoredPaths: [
          'audio.processingResults.processedBuffer', // ArrayBuffer in state
          'audio.chunks.*.blob' // Blobs in chunks
        ]
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch