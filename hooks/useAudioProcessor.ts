import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { 
  setProcessing, 
  setProcessingResults,
  clearChunks,
  setEnableAGC
} from '../store/slices/audioSlice'
import { addNotification } from '../store/slices/uiSlice'
import { 
  processFileWithMetrics,
  initializeAudioEngine,
  destroyEngine,
  processFile
} from 'murmuraba'

export function useAudioProcessor() {
  const dispatch = useAppDispatch()
  const { 
    isProcessing, 
    chunkDuration, 
    enableAGC,
    processingResults 
  } = useAppSelector(state => state.audio)

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      dispatch(setProcessing(true))
      dispatch(clearChunks())
      
      const arrayBuffer = await file.arrayBuffer()
      
      // Process with chunking
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: chunkDuration * 1000,
          outputFormat: 'wav'
        }
      })
      
      dispatch(setProcessingResults(result))
      dispatch(addNotification({
        type: 'success',
        message: `Successfully processed ${file.name}`
      }))
      
    } catch (error) {
      console.error('Processing error:', error)
      dispatch(addNotification({
        type: 'error',
        message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
    } finally {
      dispatch(setProcessing(false))
    }
  }, [dispatch, chunkDuration])

  const processWithoutChunks = useCallback(async (file: File) => {
    try {
      dispatch(setProcessing(true))
      
      const arrayBuffer = await file.arrayBuffer()
      const processedBuffer = await processFile(arrayBuffer)
      
      // Create download link
      const processedBlob = new Blob([processedBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(processedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `processed_${file.name}`
      a.click()
      URL.revokeObjectURL(url)
      
      dispatch(addNotification({
        type: 'success',
        message: 'File processed and downloaded successfully!'
      }))
      
    } catch (error) {
      console.error('Processing error:', error)
      dispatch(addNotification({
        type: 'error',
        message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
    } finally {
      dispatch(setProcessing(false))
    }
  }, [dispatch])

  const toggleAGC = useCallback((value: boolean) => {
    dispatch(setEnableAGC(value))
  }, [dispatch])

  return {
    isProcessing,
    processingResults,
    enableAGC,
    handleFileUpload,
    processWithoutChunks,
    toggleAGC
  }
}