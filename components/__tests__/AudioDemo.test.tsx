import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AudioDemo, { AudioDemoProps } from '../AudioDemo'

// Mock functions
const mockGetEngineStatus = jest.fn()
const mockProcessFile = jest.fn()
const mockOnProcessComplete = jest.fn()
const mockOnError = jest.fn()
const mockOnLog = jest.fn()

// Default props for tests
const defaultProps: AudioDemoProps = {
  getEngineStatus: mockGetEngineStatus,
  processFile: mockProcessFile,
  autoProcess: true,
  onProcessComplete: mockOnProcessComplete,
  onError: mockOnError,
  onLog: mockOnLog
}

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
    
    // Setup default engine status
    mockGetEngineStatus.mockReturnValue('ready')
    
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
    render(<AudioDemo {...defaultProps} />)
    
    expect(screen.getByText('🎵 Audio Demo Automático')).toBeInTheDocument()
    expect(screen.getByText('🔄 Probar Audio Demo')).toBeInTheDocument()
    expect(screen.getByText('📊 Logs en Tiempo Real')).toBeInTheDocument()
  })

  it('shows engine status', () => {
    render(<AudioDemo {...defaultProps} />)
    
    expect(screen.getByTestId('engine-status')).toHaveTextContent('ready')
  })

  it('disables button when engine is not ready', () => {
    mockGetEngineStatus.mockReturnValue('initializing')
    
    render(<AudioDemo {...defaultProps} />)
    
    const button = screen.getByText('🔄 Probar Audio Demo')
    expect(button).toBeDisabled()
  })

  it('automatically processes audio on mount when autoProcess is true', async () => {
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockProcessFile).toHaveBeenCalled()
    }, { timeout: 3000 })
    
    expect(mockOnProcessComplete).toHaveBeenCalledWith(expect.any(ArrayBuffer))
  })

  it('does not auto-process when autoProcess is false', async () => {
    render(<AudioDemo {...defaultProps} autoProcess={false} />)
    
    // Wait a bit to ensure no processing happens
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    expect(mockProcessFile).not.toHaveBeenCalled()
  })

  it('handles audio processing errors', async () => {
    const error = new Error('Processing failed')
    mockProcessFile.mockRejectedValue(error)
    
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(error)
    })
    
    expect(screen.getByText(/Processing failed/)).toBeInTheDocument()
  })

  it('handles fetch errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Network error'
      }))
    })
  })

  it('prevents processing when engine is not ready', async () => {
    mockGetEngineStatus.mockReturnValue('initializing')
    
    render(<AudioDemo {...defaultProps} />)
    
    const button = screen.getByText('🔄 Probar Audio Demo')
    fireEvent.click(button)
    
    expect(mockProcessFile).not.toHaveBeenCalled()
    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Engine is in 'initializing' state")
      })
    )
  })

  it('handles manual processing with button click', async () => {
    render(<AudioDemo {...defaultProps} autoProcess={false} />)
    
    const button = screen.getByText('🔄 Probar Audio Demo')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockProcessFile).toHaveBeenCalled()
    })
    
    expect(mockOnProcessComplete).toHaveBeenCalledWith(expect.any(ArrayBuffer))
  })

  it('creates audio URLs for playback', async () => {
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2) // Original and processed
    })
  })

  it('shows download button after processing', async () => {
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('💾 Descargar Audio Limpio')).toBeInTheDocument()
    })
  })

  it('handles download action', async () => {
    const mockClick = jest.fn()
    const mockAppendChild = jest.fn()
    const mockRemoveChild = jest.fn()
    
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return {
          click: mockClick,
          setAttribute: jest.fn(),
          href: '',
          download: ''
        } as any
      }
      return document.createElement(tagName)
    })
    
    jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
    jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
    
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('💾 Descargar Audio Limpio')).toBeInTheDocument()
    })
    
    const downloadButton = screen.getByText('💾 Descargar Audio Limpio')
    fireEvent.click(downloadButton)
    
    expect(mockClick).toHaveBeenCalled()
    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockRemoveChild).toHaveBeenCalled()
  })

  it('displays and updates logs during processing', async () => {
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Iniciando procesamiento/)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.getByText(/Procesamiento completado/)).toBeInTheDocument()
    })
  })

  it('exports logs when export button is clicked', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _mockClick = jest.fn()
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-log-url')
    
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Procesamiento completado/)).toBeInTheDocument()
    })
    
    const exportButton = screen.getByText('📥 Exportar Logs')
    fireEvent.click(exportButton)
    
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
  })

  it('displays statistics after processing', async () => {
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('📈 Resumen de Estadísticas')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Frames Procesados')).toBeInTheDocument()
    expect(screen.getByText('VAD Promedio')).toBeInTheDocument()
    expect(screen.getByText('RMS Promedio')).toBeInTheDocument()
  })

  it('calls onLog callback when logs are added', async () => {
    render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockOnLog).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Iniciando procesamiento')
        })
      )
    })
  })

  it('updates engine status periodically', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rerender: _rerender } = render(<AudioDemo {...defaultProps} />)
    
    // Change engine status
    mockGetEngineStatus.mockReturnValue('processing')
    
    // Wait for periodic update
    await waitFor(() => {
      expect(screen.getByTestId('engine-status')).toHaveTextContent('processing')
    }, { timeout: 1000 })
  })

  it('cleans up URLs on unmount', async () => {
    const { unmount } = render(<AudioDemo {...defaultProps} />)
    
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled()
    })
    
    unmount()
    
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })
})