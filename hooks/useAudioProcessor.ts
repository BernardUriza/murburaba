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
  clearError,
  updateMetrics
} from '../store/slices/audioSlice'
import { addNotification } from '../store/slices/uiSlice'
import { useMediaStream } from '../context/MediaStreamContext'
import type { IAudioProcessor, AudioProcessingOptions } from 'murmuraba'

export function useAudioProcessor() {
  const dispatch = useAppDispatch()
  const { container, isReady, reinitializeEngine } = useMurmurabaSuite()
  const { setStream } = useMediaStream()
  const isProcessing = useAppSelector(state => state.audio.isProcessing)
  const isRecording = useAppSelector(state => state.audio.isRecording)

  const processFile = useCallback(async (
    file: File,
    options?: AudioProcessingOptions
  ) => {
    
    if (!isReady || !container) {
      const errorMsg = `MurmurabaSuite not ready - isReady: ${isReady}, hasContainer: ${!!container}`
      dispatch(setError({
        message: errorMsg,
        code: 'SUITE_NOT_READY'
      }))
      return null
    }

    try {
      dispatch(setProcessing(true))
      dispatch(clearError())
      dispatch(clearChunks())

      try {
        const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
        
        if (!processor) {
          throw new Error('AudioProcessor not found in container')
        }
        
        
        // Check if it's the right type
        
        // Check engine initialization status before processing
        try {
          const { engineRegistry } = await import('murmuraba')
          if (engineRegistry && engineRegistry.hasEngine()) {
            const engine = engineRegistry.getEngine()
            
            // If engine exists but is not initialized, try to initialize it
            if (engine && !engine.isInitialized) {
              try {
                await engine.initialize()
              } catch {
                await reinitializeEngine()
              }
            }
          } else {
            await reinitializeEngine()
          }
        } catch (engineError) {
          throw new Error(`Engine initialization failed: ${engineError instanceof Error ? engineError.message : String(engineError)}`)
        }
        
        // Set up chunk tracking
        const unsubscribeChunk = processor.onChunk((chunk) => {
          dispatch(addChunk(chunk))
        })

        const result = await processor.processFile(file, options)
        
        dispatch(setProcessingResults(result))
        dispatch(addNotification({
          type: 'success',
          message: `Successfully processed ${file.name}`
        }))

        unsubscribeChunk()
        return result
      } catch (processingError) {
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
  }, [container, isReady, dispatch, reinitializeEngine])

  const processRecording = useCallback(async (
    duration: number,
    options?: AudioProcessingOptions & { stream?: MediaStream }
  ) => {
    
    if (!isReady || !container) {
      const errorMsg = `MurmurabaSuite not ready for recording - isReady: ${isReady}, hasContainer: ${!!container}`
      dispatch(setError({
        message: errorMsg,
        code: 'SUITE_NOT_READY'
      }))
      return null
    }

    // Define cleanup function and timeoutId outside try/catch
    let timeoutId: NodeJS.Timeout | null = null
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    try {
      dispatch(setProcessing(true))
      dispatch(setRecording(true))
      dispatch(clearError())
      dispatch(clearChunks())

      const processor = container.get<IAudioProcessor>(SUITE_TOKENS.AudioProcessor)
      
      if (!processor) {
        throw new Error('AudioProcessor not found in container')
      }
      
      // Check engine initialization status before recording
      try {
        const { engineRegistry } = await import('murmuraba')
        if (engineRegistry && engineRegistry.hasEngine()) {
          const engine = engineRegistry.getEngine()
          
          // If engine exists but is not initialized, try to initialize it
          if (engine && !engine.isInitialized) {
            try {
              await engine.initialize()
            } catch {
              await reinitializeEngine()
            }
          }
        } else {
          await reinitializeEngine()
        }
      } catch (engineError) {
        throw new Error(`Recording engine initialization failed: ${engineError instanceof Error ? engineError.message : String(engineError)}`)
      }
      
      // Set up chunk tracking
      const unsubscribeChunk = processor.onChunk((chunk) => {
        dispatch(addChunk(chunk))
      })
      
      // NUCLEAR FIX: Subscribe to metrics updates during recording
      const unsubscribeMetrics = processor.onMetrics((metrics) => {
        // Removed log to reduce noise - metrics are working
        dispatch(updateMetrics({
          inputLevel: metrics.inputLevel,
          outputLevel: metrics.outputLevel,
          vad: metrics.vadProbability,
          noiseReduction: metrics.noiseReductionLevel
        }))
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
          if (stream) {
            setStream(stream)
            return true
          }
        }
        
        // Continue checking if we haven't exceeded max attempts
        if (streamCheckCount < maxChecks) {
          timeoutId = setTimeout(checkForStream, 200) // Check every 200ms
        }
        return false
      }
      
      // Start checking after a small delay to let async operations complete
      timeoutId = setTimeout(checkForStream, 300)
      
      // Wait for recording to complete
      const result = await recordingPromise
      
      // Clear any pending timeouts
      cleanup()
      
      dispatch(setProcessingResults(result))
      dispatch(addNotification({
        type: 'success',
        message: 'Recording processed successfully'
      }))

      unsubscribeChunk()
      unsubscribeMetrics()
      return result

    } catch (error) {
      // Clear any pending timeouts on error
      cleanup()
      
      const errorMessage = error instanceof Error ? error.message : 'Recording failed'
      
      // Check if it's the specific state error
      if (errorMessage.includes('Operation requires state to be one of: ready, processing')) {
        const stateErrorMsg = 'Engine is in error state and needs to be reset. Please try resetting the engine.'
        dispatch(setError({
          message: stateErrorMsg,
          code: 'ENGINE_ERROR_STATE'
        }))
        dispatch(addNotification({
          type: 'error',
          message: stateErrorMsg
        }))
      } else {
        dispatch(setError({
          message: errorMessage,
          code: 'RECORDING_ERROR'
        }))
        dispatch(addNotification({
          type: 'error',
          message: errorMessage
        }))
      }
      return null
    } finally {
      dispatch(setProcessing(false))
      dispatch(setRecording(false))
      // Don't clear stream immediately - let it be cleared when unmounting or starting new recording
      // setStream(null)
    }
  }, [container, isReady, dispatch, setStream, reinitializeEngine])

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

  const resetEngine = useCallback(async () => {
    try {
      await reinitializeEngine()
      return true
    } catch {
      return false
    }
  }, [reinitializeEngine])

  return {
    isReady,
    isProcessing,
    isRecording,
    processFile,
    processRecording,
    cancelProcessing,
    resetEngine
  }
}