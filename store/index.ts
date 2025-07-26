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
          'murmuraba/SET_CONTAINER' // DI Container only
        ],
        ignoredActionPaths: [
          'payload.container' // DI Container
        ],
        ignoredPaths: [
          'audio.processingResults.processedBuffer', // ArrayBuffer in state
          'audio.chunks.*.blob' // Blobs in chunks
        ]
      }
    }).concat(murmurabaSuiteMiddleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch