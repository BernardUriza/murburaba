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
    console.log('[useAudioProcessor] processFile called with:', { 
      isReady, 
      hasContainer: !!container,
      fileName: file.name 
    })
    
    if (!isReady || !container) {
      const errorMsg = `MurmurabaSuite not ready - isReady: ${isReady}, hasContainer: ${!!container}`
      console.error('[useAudioProcessor]', errorMsg)
      dispatch(setError({
        message: errorMsg,
        code: 'SUITE_NOT_READY'
      }))
      return null
    }

    try {
      console.log('[useAudioProcessor] Starting processFile for:', file.name)
      dispatch(setProcessing(true))
      dispatch(clearError())
      dispatch(clearChunks())

      try {
        const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
        console.log('[useAudioProcessor] Got processor:', !!processor)
        
        if (!processor) {
          throw new Error('AudioProcessor not found in container')
        }
        
        console.log('[useAudioProcessor] Processor methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(processor)))
        
        // Check if it's the right type
        console.log('[useAudioProcessor] Processor has processFile:', typeof processor.processFile)
        console.log('[useAudioProcessor] Processor isProcessing:', typeof processor.isProcessing)
        
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
      } catch (processingError) {
        console.error('[useAudioProcessor] Processing error details:', processingError)
        throw processingError
      }

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
      console.log('🎯 useAudioProcessor: Starting recording process')
      dispatch(setProcessing(true))
      dispatch(setRecording(true))
      dispatch(clearError())
      dispatch(clearChunks())
      console.log('✅ useAudioProcessor: Redux states updated - recording should be true')

      const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
      console.log('🔍 Processor obtained:', !!processor, 'has getCurrentStream:', !!processor.getCurrentStream)
      
      // Set up chunk tracking
      const unsubscribeChunk = processor.onChunk((chunk) => {
        dispatch(addChunk(chunk))
      })

      // Start recording - this is async but we need to wait for stream creation
      const recordingPromise = processor.processRecording(duration, options)
      
      // Get the stream after a delay to ensure it's created
      // The stream is created asynchronously after getUserMedia completes
      let streamCheckCount = 0
      const maxChecks = 10
      
      const checkForStream = () => {
        streamCheckCount++
        if (processor.getCurrentStream) {
          const stream = processor.getCurrentStream()
          console.log(`🎤 Stream check #${streamCheckCount}:`, {
            hasGetCurrentStream: true,
            stream: !!stream,
            streamId: stream?.id,
            trackCount: stream?.getTracks()?.length || 0
          })
          if (stream) {
            console.log('🎤 Setting MediaStream during recording:', stream)
            setStream(stream)
            return true
          }
        } else {
          console.log(`🎤 Stream check #${streamCheckCount}: getCurrentStream method not available`)
        }
        
        // Continue checking if we haven't exceeded max attempts
        if (streamCheckCount < maxChecks) {
          setTimeout(checkForStream, 200) // Check every 200ms
        } else {
          console.error('❌ Failed to get stream after', maxChecks, 'attempts')
        }
        return false
      }
      
      // Start checking after a small delay to let async operations complete
      setTimeout(checkForStream, 300)
      
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
      console.error('❌ useAudioProcessor: Recording failed', error)
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
      console.log('🏁 useAudioProcessor: Recording finished, resetting states')
      dispatch(setProcessing(false))
      dispatch(setRecording(false))
      // Don't clear stream immediately - let it be cleared when unmounting or starting new recording
      // setStream(null)
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
      // Only clear stream when explicitly cancelled
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