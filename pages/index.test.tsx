import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Home from './index'
import { useMurmubaraEngine } from 'murmuraba'

// Mock del hook useMurmubaraEngine
jest.mock('murmuraba', () => ({
  useMurmubaraEngine: jest.fn()
}))

describe('Advanced Metrics Button', () => {
  const mockUseMurmubaraEngine = useMurmubaraEngine as jest.MockedFunction<typeof useMurmubaraEngine>

  beforeEach(() => {
    // Reset mocks antes de cada test
    jest.clearAllMocks()
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    }
    global.localStorage = localStorageMock as any
  })

  it('should fail when diagnostics is null and button is clicked', () => {
    // Configurar el mock con diagnostics null
    mockUseMurmubaraEngine.mockReturnValue({
      isInitialized: true,
      isLoading: false,
      error: null,
      engineState: 'ready',
      metrics: null,
      diagnostics: null, // Esto es lo que causa el problema
      recordingState: {
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        chunks: []
      },
      currentStream: null,
      initialize: jest.fn(),
      destroy: jest.fn(),
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      pauseRecording: jest.fn(),
      resumeRecording: jest.fn(),
      clearRecordings: jest.fn(),
      toggleChunkPlayback: jest.fn(),
      toggleChunkExpansion: jest.fn(),
      exportChunkAsWav: jest.fn(),
      exportChunkAsMp3: jest.fn(),
      downloadChunk: jest.fn(),
      resetError: jest.fn(),
      formatTime: jest.fn((time) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`),
      getAverageNoiseReduction: jest.fn(() => 0)
    })

    render(<Home />)

    // Buscar el botón de Advanced Metrics
    const advancedMetricsButton = screen.getByTitle('Show Advanced Metrics')
    
    // Click en el botón
    fireEvent.click(advancedMetricsButton)

    // El panel no debería mostrarse cuando diagnostics es null
    expect(screen.queryByText('🔬 Engine Diagnostics')).not.toBeInTheDocument()
  })

  it('should show Advanced Metrics panel when diagnostics is available', () => {
    // Configurar el mock con diagnostics válido
    const mockDiagnostics = {
      engineVersion: '1.0.0',
      wasmLoaded: true,
      activeProcessors: 2,
      memoryUsage: 1024 * 1024 * 10, // 10MB
      processingTime: 5.2,
      engineState: 'ready',
      browserInfo: {
        name: 'Chrome',
        audioAPIsSupported: true
      }
    }

    mockUseMurmubaraEngine.mockReturnValue({
      isInitialized: true,
      isLoading: false,
      error: null,
      engineState: 'ready',
      metrics: null,
      diagnostics: mockDiagnostics,
      recordingState: {
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        chunks: []
      },
      currentStream: null,
      initialize: jest.fn(),
      destroy: jest.fn(),
      startRecording: jest.fn(),
      stopRecording: jest.fn(),
      pauseRecording: jest.fn(),
      resumeRecording: jest.fn(),
      clearRecordings: jest.fn(),
      toggleChunkPlayback: jest.fn(),
      toggleChunkExpansion: jest.fn(),
      exportChunkAsWav: jest.fn(),
      exportChunkAsMp3: jest.fn(),
      downloadChunk: jest.fn(),
      resetError: jest.fn(),
      formatTime: jest.fn((time) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`),
      getAverageNoiseReduction: jest.fn(() => 0)
    })

    render(<Home />)

    // Buscar el botón de Advanced Metrics
    const advancedMetricsButton = screen.getByTitle('Show Advanced Metrics')
    
    // Click en el botón
    fireEvent.click(advancedMetricsButton)

    // El panel debería mostrarse
    expect(screen.getByText('🔬 Engine Diagnostics')).toBeInTheDocument()
    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    expect(screen.getByText('✅ Loaded')).toBeInTheDocument()
  })
})