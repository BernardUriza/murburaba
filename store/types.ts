// Redux store types
import type { ProcessedChunk } from 'murmuraba'

// Processing results with proper typing
export interface ProcessingResults {
  chunks: ProcessedChunk[]
  processedBuffer: ArrayBuffer
  averageVad: number
  totalDuration: number
  metadata: {
    sampleRate: number
    channels: number
    originalDuration: number
  }
}

// Notification types
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: number
}

// Error states
export interface ErrorState {
  hasError: boolean
  errorMessage: string | null
  errorCode?: string
  errorTimestamp?: number
}