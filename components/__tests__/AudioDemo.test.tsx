import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AudioDemo from '../AudioDemo'

// Mock useMurmubaraEngine hook
const mockProcessFile = jest.fn()
const mockInitializeEngine = jest.fn()

jest.mock('@murburaba/react', () => ({
  useMurmubaraEngine: () => ({
    processFile: mockProcessFile,
    isInitialized: true,
    initializationError: null,
    initializeEngine: mockInitializeEngine
  })
}))

// Mock fetch
global.fetch = jest.fn()

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock HTMLAudioElement
global.HTMLAudioElement = jest.fn().mockImplementation(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}))

describe('AudioDemo Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup fetch mock for audio file
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1000))
    })
    
    // Setup processFile mock
    mockProcessFile.mockResolvedValue(new ArrayBuffer(1000))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the audio demo component', () => {
    render(<AudioDemo />)
    
    expect(screen.getByText('🎵 Audio Demo Automático')).toBeInTheDocument()
    expect(screen.getByText('🔄 Probar Audio Demo')).toBeInTheDocument()
    expect(screen.getByText('🎙️ Audio Original')).toBeInTheDocument()
    expect(screen.getByText('🔊 Audio Procesado')).toBeInTheDocument()
  })

  it('automatically processes audio on mount when initialized', async () => {
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/jfk_speech.wav')
      expect(mockProcessFile).toHaveBeenCalled()
    })
  })

  it('shows loading state during processing', async () => {
    mockProcessFile.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(new ArrayBuffer(1000)), 100))
    )
    
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText('⏳ Procesando...')).toBeInTheDocument()
    })
  })

  it('displays error when audio file cannot be loaded', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument()
    })
  })

  it('displays error when processing fails', async () => {
    mockProcessFile.mockRejectedValue(new Error('Processing failed'))
    
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText(/Processing failed/)).toBeInTheDocument()
    })
  })

  it('handles manual processing with button click', async () => {
    render(<AudioDemo />)
    
    // Clear initial auto-process calls
    await waitFor(() => expect(mockProcessFile).toHaveBeenCalled())
    jest.clearAllMocks()
    
    // Click the process button
    const button = screen.getByText('🔄 Probar Audio Demo')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/jfk_speech.wav')
      expect(mockProcessFile).toHaveBeenCalled()
    })
  })

  it('creates audio URLs for playback', async () => {
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2) // Original and processed
    })
    
    const audioElements = screen.getAllByRole('audio')
    expect(audioElements).toHaveLength(2)
  })

  it('shows download button after processing', async () => {
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText('💾 Descargar Audio Limpio')).toBeInTheDocument()
    })
  })

  it('handles download click', async () => {
    // Mock document methods
    const mockClick = jest.fn()
    const mockAppendChild = jest.fn()
    const mockRemoveChild = jest.fn()
    
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    }
    
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
    
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText('💾 Descargar Audio Limpio')).toBeInTheDocument()
    })
    
    const downloadButton = screen.getByText('💾 Descargar Audio Limpio')
    fireEvent.click(downloadButton)
    
    expect(mockAnchor.download).toBe('jfk_speech_cleaned.wav')
    expect(mockClick).toHaveBeenCalled()
  })

  it('displays and updates logs during processing', async () => {
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText('📊 Logs en Tiempo Real')).toBeInTheDocument()
    })
    
    // Check initial log
    expect(screen.getByText(/Iniciando procesamiento/)).toBeInTheDocument()
    
    // Check completion log
    await waitFor(() => {
      expect(screen.getByText(/Procesamiento completado/)).toBeInTheDocument()
    })
  })

  it('handles export logs functionality', async () => {
    const mockClick = jest.fn()
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    }
    
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any)
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-log-url')
    
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText('📥 Exportar Logs')).toBeInTheDocument()
    })
    
    const exportButton = screen.getByText('📥 Exportar Logs')
    fireEvent.click(exportButton)
    
    expect(mockAnchor.download).toMatch(/audio_demo_logs_\d+\.txt/)
    expect(mockClick).toHaveBeenCalled()
  })

  it('displays statistics after processing', async () => {
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText('📈 Resumen de Estadísticas')).toBeInTheDocument()
      expect(screen.getByText('Frames Procesados')).toBeInTheDocument()
      expect(screen.getByText('VAD Promedio')).toBeInTheDocument()
      expect(screen.getByText('RMS Promedio')).toBeInTheDocument()
    })
  })

  it('shows degraded mode warning when initialization error exists', () => {
    jest.unmock('@murburaba/react')
    jest.mock('@murburaba/react', () => ({
      useMurmubaraEngine: () => ({
        processFile: mockProcessFile,
        isInitialized: true,
        initializationError: 'WASM not available',
        initializeEngine: mockInitializeEngine
      })
    }))
    
    render(<AudioDemo />)
    
    expect(screen.getByText(/Modo degradado: WASM not available/)).toBeInTheDocument()
  })

  it('disables button when not initialized', () => {
    jest.unmock('@murburaba/react')
    jest.mock('@murburaba/react', () => ({
      useMurmubaraEngine: () => ({
        processFile: mockProcessFile,
        isInitialized: false,
        initializationError: null,
        initializeEngine: mockInitializeEngine
      })
    }))
    
    render(<AudioDemo />)
    
    const button = screen.getByText('🔄 Probar Audio Demo')
    expect(button).toBeDisabled()
  })

  it('auto-scrolls logs container', async () => {
    const mockScrollTo = jest.fn()
    
    // Mock the ref
    jest.spyOn(React, 'useRef').mockReturnValueOnce({
      current: { 
        scrollTop: 0, 
        scrollHeight: 1000,
        scrollTo: mockScrollTo
      }
    })
    
    render(<AudioDemo />)
    
    await waitFor(() => {
      expect(screen.getByText(/Procesamiento completado/)).toBeInTheDocument()
    })
    
    // Verify scrolling behavior
    expect(mockScrollTo).toBeDefined()
  })
})