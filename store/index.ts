import { configureStore } from '@reduxjs/toolkit'
import audioReducer from './slices/audioSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    audio: audioReducer,
    ui: uiReducer
  },
  // Middleware configuration for non-serializable values (like MediaStream)
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['audio/setProcessingResults', 'audio/addChunk'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.blob', 'payload.stream'],
        // Ignore these paths in the state
        ignoredPaths: ['audio.processingResults', 'audio.chunks']
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch