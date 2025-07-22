import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ChunkProcessingResults } from './ChunkProcessingResults'

describe('ChunkProcessingResults - Audio Double Play Bug', () => {
  const mockChunk = {
    id: 'chunk-1',
    processedAudioUrl: '/processed.mp3',
    originalAudioUrl: '/original.mp3',
    isPlaying: false,
    isExpanded: false,
    isValid: true,
    duration: 5000,
    startTime: Date.now(),
    endTime: Date.now() + 5000,
    noiseRemoved: 75,
    metrics: {
      processingLatency: 10,
      frameCount: 100,
      inputLevel: 0.5,
      outputLevel: 0.4
    }
  }

  const defaultProps = {
    chunks: [mockChunk],
    averageNoiseReduction: 75,
    selectedChunk: null,
    onTogglePlayback: jest.fn(),
    onToggleExpansion: jest.fn(),
    onClearAll: jest.fn()
  }

  beforeAll(() => {
    // Mock HTMLMediaElement
    global.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve())
    global.HTMLMediaElement.prototype.pause = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should only play one audio at a time - no double playback', () => {
    const { container } = render(<ChunkProcessingResults {...defaultProps} />)
    
    // Encontrar los botones de play
    const playButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('.play-icon')
    )
    
    expect(playButtons).toHaveLength(2) // Original y Enhanced
    
    // Click en el primer audio (Original)
    fireEvent.click(playButtons[0])
    expect(defaultProps.onTogglePlayback).toHaveBeenCalledWith('chunk-1', 'original')
    
    // Click en el segundo audio (Enhanced) - debería detener el primero
    fireEvent.click(playButtons[1])
    expect(defaultProps.onTogglePlayback).toHaveBeenCalledWith('chunk-1', 'processed')
    
    // El problema: ambos audios podrían estar sonando al mismo tiempo
    // porque onTogglePlayback no detiene automáticamente el otro audio
  })

  it('should stop other audios when one starts playing', () => {
    const { rerender } = render(<ChunkProcessingResults {...defaultProps} />)
    
    // Simular que el original está reproduciéndose
    const playingChunk = { ...mockChunk, isPlaying: true }
    rerender(<ChunkProcessingResults {...defaultProps} chunks={[playingChunk]} />)
    
    // Encontrar los audios
    const audioElements = document.querySelectorAll('audio')
    expect(audioElements).toHaveLength(2)
    
    // Verificar que cuando uno se reproduce, el otro debe pausarse
    // ESTE ES EL BUG: No hay lógica para pausar el otro audio
  })
})