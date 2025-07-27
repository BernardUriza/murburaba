import { useCallback, useEffect } from 'react'
import { useMurmurabaSuite } from 'murmuraba'
import { SUITE_TOKENS } from 'murmuraba'
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
import { useMediaStream } from '../context/MediaStreamContext'
import type { IAudioProcessor, AudioProcessingOptions } from 'murmuraba'

export function useAudioProcessor() {
  const dispatch = useAppDispatch()
  const { container, isReady } = useMurmurabaSuite()
  const { setStream } = useMediaStream()
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

      const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
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
    options?: AudioProcessingOptions & { stream?: MediaStream }
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

      const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
      
      // Set up chunk tracking
      const unsubscribeChunk = processor.onChunk((chunk) => {
        dispatch(addChunk(chunk))
      })

      // Start recording - this is async but we check for stream immediately
      const recordingPromise = processor.processRecording(duration, options)
      
      // Get the stream right after starting recording
      // Check multiple times to ensure we catch the stream
      const checkForStream = () => {
        if (processor.getCurrentStream) {
          const stream = processor.getCurrentStream()
          if (stream) {
            console.log('🎤 Setting MediaStream during recording:', stream)
            setStream(stream)
            return true
          }
        }
        return false
      }
      
      // Try immediately
      if (!checkForStream()) {
        // Try again after 50ms
        setTimeout(() => {
          if (!checkForStream()) {
            // Final try after 150ms
            setTimeout(checkForStream, 100)
          }
        }, 50)
      }
      
      // Wait for recording to complete
      const result = await recordingPromise
      
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
      // Clean up stream when recording stops
      setStream(null)
    }
  }, [container, isReady, dispatch, setStream])

  const cancelProcessing = useCallback(() => {
    if (!container || !isReady) return

    try {
      const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
      processor.cancel()
      dispatch(setProcessing(false))
      dispatch(setRecording(false))
      dispatch(addNotification({
        type: 'info',
        message: 'Processing cancelled'
      }))
      // Clean up stream when cancelled
      setStream(null)
    } catch (error) {
      console.error('Failed to cancel processing:', error)
    }
  }, [container, isReady, dispatch, setStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (container && isReady) {
        try {
          const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor) as any
          if (processor.cleanup) {
            processor.cleanup()
          }
        } catch (error) {
          console.error('Failed to cleanup processor:', error)
        }
      }
    }
  }, [container, isReady])

  return {
    isReady,
    isProcessing,
    isRecording,
    processFile,
    processRecording,
    cancelProcessing
  }
}