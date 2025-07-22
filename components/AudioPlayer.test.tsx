import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AudioPlayer from './AudioPlayer'

describe('AudioPlayer', () => {
  // Mock HTMLMediaElement porque jsdom no lo soporta completamente
  beforeAll(() => {
    global.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve())
    global.HTMLMediaElement.prototype.pause = jest.fn()
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      writable: true,
      value: 60
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Sin audio source', () => {
    it('debe mostrar estado deshabilitado cuando no hay src', () => {
      render(<AudioPlayer label="Test Audio" />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(screen.getByText('Test Audio - No audio')).toBeInTheDocument()
      expect(screen.getByText('▶️')).toBeInTheDocument()
    })
  })

  describe('Con audio source', () => {
    it('debe renderizar correctamente con src', () => {
      render(<AudioPlayer src="/test.mp3" label="Test Audio" />)
      
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
      expect(screen.getByText('Test Audio')).toBeInTheDocument()
      expect(screen.getByText('▶️')).toBeInTheDocument()
    })

    it('debe cambiar entre play y pause al hacer click', async () => {
      const onPlayStateChange = jest.fn()
      render(
        <AudioPlayer 
          src="/test.mp3" 
          label="Test Audio" 
          onPlayStateChange={onPlayStateChange}
        />
      )
      
      const button = screen.getByRole('button')
      
      // Click para reproducir
      fireEvent.click(button)
      expect(screen.getByText('⏸️')).toBeInTheDocument()
      expect(onPlayStateChange).toHaveBeenCalledWith(true)
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
      
      // Click para pausar
      fireEvent.click(button)
      expect(screen.getByText('▶️')).toBeInTheDocument()
      expect(onPlayStateChange).toHaveBeenCalledWith(false)
      expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    })

    it('debe formatear el tiempo correctamente', () => {
      render(<AudioPlayer src="/test.mp3" label="Test Audio" />)
      
      // El tiempo inicial debe ser 0:00
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })

    it('debe manejar errores de reproducción', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      HTMLMediaElement.prototype.play = jest.fn(() => Promise.reject(new Error('Playback failed')))
      
      render(<AudioPlayer src="/test.mp3" label="Test Audio" />)
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Playback failed:', expect.any(Error))
        expect(screen.getByText('▶️')).toBeInTheDocument() // Debe volver al estado de play
      })
      
      consoleError.mockRestore()
    })

    it('debe manejar el seek correctamente', () => {
      render(<AudioPlayer src="/test.mp3" label="Test Audio" />)
      
      const audioElement = document.querySelector('audio') as HTMLAudioElement
      Object.defineProperty(audioElement, 'duration', { value: 100, writable: true })
      
      // Simular loadedmetadata para establecer duración
      fireEvent.loadedMetadata(audioElement)
      
      const progressContainer = screen.getByText('0:00').parentElement
      
      // Simular click en el 50% de la barra
      const rect = { left: 0, width: 200 }
      progressContainer!.getBoundingClientRect = jest.fn(() => rect as DOMRect)
      
      fireEvent.click(progressContainer!, {
        clientX: 100 // 50% de 200
      })
      
      expect(audioElement.currentTime).toBe(50) // 50% de 100s
    })

    it('debe mostrar loading cuando está cargando', () => {
      render(<AudioPlayer src="/test.mp3" label="Test Audio" />)
      
      const audioElement = document.querySelector('audio') as HTMLAudioElement
      
      // Simular inicio de carga
      fireEvent.loadStart(audioElement)
      expect(screen.getByText('⏳')).toBeInTheDocument()
      
      // Simular metadata cargada
      fireEvent.loadedMetadata(audioElement)
      expect(screen.getByText('▶️')).toBeInTheDocument()
    })

    it('debe aplicar clases CSS personalizadas', () => {
      const { container } = render(
        <AudioPlayer 
          src="/test.mp3" 
          label="Test Audio" 
          className="custom-class"
        />
      )
      
      const audioPlayer = container.querySelector('.audio-player')
      expect(audioPlayer).toHaveClass('custom-class')
    })

    it('debe manejar valores Infinity/NaN en duration', () => {
      render(<AudioPlayer src="/test.mp3" label="Test Audio" />)
      
      const audioElement = document.querySelector('audio') as HTMLAudioElement
      
      // Simular duration como Infinity
      Object.defineProperty(audioElement, 'duration', { value: Infinity, writable: true })
      fireEvent.loadedMetadata(audioElement)
      
      // Debe mostrar 0:00 en lugar de NaN o Infinity
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })
  })

  describe('Force Stop functionality', () => {
    it('debe detener la reproducción cuando forceStop es true', async () => {
      const onPlayStateChange = jest.fn()
      const { rerender } = render(
        <AudioPlayer 
          src="/test.mp3" 
          label="Test Audio" 
          onPlayStateChange={onPlayStateChange}
          forceStop={false}
        />
      )
      
      const button = screen.getByRole('button')
      
      // Iniciar reproducción
      fireEvent.click(button)
      expect(screen.getByText('⏸️')).toBeInTheDocument()
      expect(onPlayStateChange).toHaveBeenCalledWith(true)
      
      // Forzar detención
      rerender(
        <AudioPlayer 
          src="/test.mp3" 
          label="Test Audio" 
          onPlayStateChange={onPlayStateChange}
          forceStop={true}
        />
      )
      
      // Debe volver al estado detenido
      expect(screen.getByText('▶️')).toBeInTheDocument()
      expect(onPlayStateChange).toHaveBeenCalledWith(false)
      expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    })
  })
})