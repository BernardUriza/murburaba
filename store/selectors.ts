import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from './index'

// Re-export shallowEqual for component usage
export { shallowEqual } from 'react-redux'

// Base selectors
const selectAudioState = (state: RootState) => state.audio
const selectUIState = (state: RootState) => state.ui
const selectChunks = (state: RootState) => state.audio.chunks
const selectProcessingResults = (state: RootState) => state.audio.processingResults

// Memoized selectors for computed values
export const selectAverageNoiseReduction = createSelector(
  [selectChunks],
  (chunks) => {
    if (chunks.length === 0) return 0
    const totalReduction = chunks.reduce((sum, chunk) => sum + (chunk.noiseRemoved || 0), 0)
    return totalReduction / chunks.length
  }
)

export const selectTotalDuration = createSelector(
  [selectChunks],
  (chunks) => chunks.reduce((sum, chunk) => sum + chunk.duration, 0)
)

export const selectEngineStatus = createSelector(
  [selectAudioState],
  (audio) => ({
    isInitialized: audio.isEngineInitialized,
    isProcessing: audio.isProcessing,
    isRecording: audio.isRecording,
    hasError: audio.hasError,
    errorMessage: audio.errorMessage
  })
)

export const selectAudioConfig = createSelector(
  [selectAudioState],
  (audio) => ({
    chunkDuration: audio.chunkDuration,
    enableAGC: audio.enableAGC
  })
)

export const selectSelectedChunk = createSelector(
  [selectChunks, (state: RootState) => state.audio.selectedChunkId],
  (chunks, selectedId) => {
    if (!selectedId) return null
    return chunks.find(chunk => chunk.id === selectedId) || null
  }
)

export const selectProcessingMetrics = createSelector(
  [selectProcessingResults, selectAverageNoiseReduction, selectTotalDuration],
  (results, avgReduction, totalDuration) => ({
    hasResults: !!results,
    chunkCount: results?.chunks?.length || 0,
    averageVad: results?.averageVad || 0,
    averageNoiseReduction: avgReduction,
    totalDuration: totalDuration,
    metadata: results?.metadata || null
  })
)

// UI selectors
export const selectActiveNotifications = createSelector(
  [selectUIState],
  (ui) => ui.notifications.filter(n => 
    // Remove notifications older than 5 seconds
    Date.now() - n.timestamp < 5000
  )
)

export const selectUIFlags = createSelector(
  [selectUIState],
  (ui) => ({
    showAudioDemo: ui.showAudioDemo,
    showAdvancedMetrics: ui.showAdvancedMetrics,
    showSettings: ui.showSettings,
    showCopilot: ui.showCopilot,
    theme: ui.theme,
    sidebarCollapsed: ui.sidebarCollapsed
  })
)

// Combined selectors for components
export const selectAudioDemoState = createSelector(
  [selectEngineStatus, selectAudioConfig, selectProcessingMetrics],
  (engine, config, metrics) => ({
    ...engine,
    ...config,
    ...metrics
  })
)