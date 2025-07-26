import { useCallback } from 'react'
import { useMurmurabaSuite } from 'murmuraba'
import { TOKENS } from '../packages/murmuraba/src/core/DIContainer'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  setProcessing,
  setRecording,
  setProcessingResults,
  addChunk,
  clearChunks,
  setError,
  clearError
} from '../store/slices/audioSlice'
import { addNotification } from '../store/slices/uiSlice'
import type { IAudioProcessor, AudioProcessingOptions } from 'murmuraba'

export function useAudioProcessor() {
  const dispatch = useAppDispatch()
  const { container, isReady } = useMurmurabaSuite()
  const isProcessing = useAppSelector(state => state.audio.isProcessing)
  const isRecording = useAppSelector(state => state.audio.isRecording)

  const processFile = useCallback(async (
    file: File,
    options?: AudioProcessingOptions
  ) => {
    if (!isReady || !container) {
      dispatch(setError({
        message: 'MurmurabaSuite not ready',
        code: 'SUITE_NOT_READY'
      }))
      return null
    }

    try {
      console.log('[useAudioProcessor] Starting processFile for:', file.name)
      dispatch(setProcessing(true))
      dispatch(clearError())
      dispatch(clearChunks())

      const processor = container.get<IAudioProcessor>(TOKENS.AudioProcessor)
      console.log('[useAudioProcessor] Got processor:', !!processor)
      
      if (!processor) {
        throw new Error('AudioProcessor not found in container')
      }
      
      // Set up chunk tracking
      const unsubscribeChunk = processor.onChunk((chunk) => {
        console.log('[useAudioProcessor] Chunk received:', chunk)
        dispatch(addChunk(chunk))
      })

      console.log('[useAudioProcessor] Calling processor.processFile...')
      const result = await processor.processFile(file, options)
      console.log('[useAudioProcessor] Process result:', result)
      console.log('[useAudioProcessor] Result chunks:', result?.chunks?.length)
      console.log('[useAudioProcessor] Result buffer:', !!result?.processedBuffer)
      
      dispatch(setProcessingResults(result))
      dispatch(addNotification({
        type: 'success',
        message: `Successfully processed ${file.name}`
      }))

      unsubscribeChunk()
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'
      dispatch(setError({
        message: errorMessage,
        code: 'PROCESSING_ERROR'
      }))
      dispatch(addNotification({
        type: 'error',
        message: errorMessage
      }))
      return null
    } finally {
      dispatch(setProcessing(false))
    }
  }, [container, isReady, dispatch])

  const processRecording = useCallback(async (
    duration: number,
    options?: AudioProcessingOptions
  ) => {
    if (!isReady || !container) {
      dispatch(setError({
        message: 'MurmurabaSuite not ready',
        code: 'SUITE_NOT_READY'
      }))
      return null
    }

    try {
      dispatch(setProcessing(true))
      dispatch(setRecording(true))
      dispatch(clearError())
      dispatch(clearChunks())

      const processor = container.get<IAudioProcessor>(TOKENS.AudioProcessor)
      
      // Set up chunk tracking
      const unsubscribeChunk = processor.onChunk((chunk) => {
        dispatch(addChunk(chunk))
      })

      const result = await processor.processRecording(duration, options)
      
      dispatch(setProcessingResults(result))
      dispatch(addNotification({
        type: 'success',
        message: 'Recording processed successfully'
      }))

      unsubscribeChunk()
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recording failed'
      dispatch(setError({
        message: errorMessage,
        code: 'RECORDING_ERROR'
      }))
      dispatch(addNotification({
        type: 'error',
        message: errorMessage
      }))
      return null
    } finally {
      dispatch(setProcessing(false))
      dispatch(setRecording(false))
    }
  }, [container, isReady, dispatch])

  const cancelProcessing = useCallback(() => {
    if (!container || !isReady) return

    try {
      const processor = container.get<IAudioProcessor>(TOKENS.AudioProcessor)
      processor.cancel()
      dispatch(setProcessing(false))
      dispatch(setRecording(false))
      dispatch(addNotification({
        type: 'info',
        message: 'Processing cancelled'
      }))
    } catch (error) {
      console.error('Failed to cancel processing:', error)
    }
  }, [container, isReady, dispatch])

  return {
    isReady,
    isProcessing,
    isRecording,
    processFile,
    processRecording,
    cancelProcessing
  }
}