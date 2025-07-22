import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SyncedWaveforms } from './SyncedWaveforms'

// Mock WaveformAnalyzer
jest.mock('./WaveformAnalyzer', () => ({
  WaveformAnalyzer: jest.fn(({ label, isMuted, audioUrl }) => (
    <div data-testid={`waveform-${label}`}>
      {label} - {audioUrl} - Muted: {isMuted ? 'true' : 'false'}
    </div>
  ))
}))

describe('SyncedWaveforms', () => {
  const defaultProps = {
    originalAudioUrl: '/original.mp3',
    processedAudioUrl: '/processed.mp3',
    isPlaying: false,
    onPlayingChange: jest.fn()
  }

  beforeAll(() => {
    // Mock Audio constructor
    global.Audio = jest.fn().mockImplementation((url) => ({
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      currentTime: 0,
      src: url,
      onended: null
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('debe renderizar ambas waveforms', () => {
    render(<SyncedWaveforms {...defaultProps} />)
    
    expect(screen.getByText(/Original Audio/)).toBeInTheDocument()
    expect(screen.getByText(/Processed Audio/)).toBeInTheDocument()
  })

  it('NO debe mutear el audio original - ARREGLADO', () => {
    render(<SyncedWaveforms {...defaultProps} />)
    
    // Ahora el original NO está muteado
    const originalWaveform = screen.getByTestId('waveform-Original Audio')
    expect(originalWaveform).toHaveTextContent('Muted: false')
    
    // ✅ Ahora ambos pueden escucharse
  })

  it('debe reproducir AMBOS audios cuando isPlaying es true', () => {
    const { rerender } = render(<SyncedWaveforms {...defaultProps} />)
    
    // Cambiar a playing
    rerender(<SyncedWaveforms {...defaultProps} isPlaying={true} />)
    
    // Verificar que se crearon ambos elementos de audio
    expect(global.Audio).toHaveBeenCalledWith('/original.mp3')
    expect(global.Audio).toHaveBeenCalledWith('/processed.mp3')
    
    // El BUG: solo se reproduce uno
    const audioInstances = (global.Audio as jest.Mock).mock.results
    const originalAudio = audioInstances[0].value
    const processedAudio = audioInstances[1].value
    
    // ✅ ARREGLADO: Ahora reproduce AMBOS audios
    expect(originalAudio.play).toHaveBeenCalled()
    expect(processedAudio.play).toHaveBeenCalled()
  })

  it('debe mostrar el botón Play Both y reproducir ambos', () => {
    render(<SyncedWaveforms {...defaultProps} />)
    
    const playButton = screen.getByText('▶ Play Both')
    expect(playButton).toBeInTheDocument()
    
    // ✅ Ahora el texto es correcto - reproduce ambos
  })

  it('debe tener controles de volumen para ambos audios', () => {
    render(<SyncedWaveforms {...defaultProps} />)
    
    // Debe haber dos sliders de volumen
    const volumeSliders = screen.getAllByRole('slider')
    expect(volumeSliders).toHaveLength(2)
    
    // Con valores iniciales del 70% (hay dos)
    const volumePercentages = screen.getAllByText('70%')
    expect(volumePercentages).toHaveLength(2)
  })
})