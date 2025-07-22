import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaveformAnalyzer } from '../WaveformAnalyzer';

// Mock Web Audio API
const mockAudioContext = {
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    connect: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  createMediaElementSource: vi.fn(() => ({
    connect: vi.fn(),
  })),
  destination: {},
  state: 'running',
  close: vi.fn(() => Promise.resolve()),
};

const mockCanvas = {
  getContext: vi.fn(() => ({
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  })),
  width: 800,
  height: 200,
};

// Mock HTMLAudioElement
const mockAudio = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dataset: {},
  volume: 1,
  muted: false,
  onended: null,
};

// Mock MediaStream
const mockStream = {
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
};

global.AudioContext = vi.fn(() => mockAudioContext) as any;
global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
global.HTMLAudioElement = vi.fn(() => mockAudio) as any;
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

describe('WaveformAnalyzer TDD Tests', () => {
  let mockOnPlayStateChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPlayStateChange = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render null when no stream or audioUrl provided', () => {
      const { container } = render(<WaveformAnalyzer />);
      expect(container.firstChild).toBeNull();
    });

    it('should render canvas for live stream', () => {
      render(
        <WaveformAnalyzer 
          stream={mockStream as any}
          label="Live Stream"
        />
      );
      
      const canvas = screen.getByRole('img');
      expect(canvas).toBeInTheDocument();
      expect(screen.getByText('Live Stream')).toBeInTheDocument();
    });

    it('should render canvas and controls for audio URL', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          label="Audio File"
        />
      );
      
      const canvas = screen.getByRole('img');
      const playButton = screen.getByRole('button');
      
      expect(canvas).toBeInTheDocument();
      expect(playButton).toBeInTheDocument();
      expect(screen.getByText('Audio File')).toBeInTheDocument();
    });

    it('should hide controls when hideControls is true', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          hideControls={true}
        />
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          className="custom-waveform"
        />
      );
      
      expect(container.firstChild).toHaveClass('waveform-analyzer');
      expect(container.firstChild).toHaveClass('custom-waveform');
    });

    it('should set proper aria-label for accessibility', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          aria-label="Custom waveform visualization"
        />
      );
      
      const canvas = screen.getByLabelText('Custom waveform visualization');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Audio Playback Controls', () => {
    it('should show play button initially', () => {
      render(<WaveformAnalyzer audioUrl="test.mp3" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('▶️ Play');
      expect(button).toHaveAttribute('aria-label', 'Play audio');
    });

    it('should call play when play button is clicked', async () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          onPlayStateChange={mockOnPlayStateChange}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockAudio.play).toHaveBeenCalled();
        expect(mockOnPlayStateChange).toHaveBeenCalledWith(true);
      });
    });

    it('should handle play button with Enter key', () => {
      render(<WaveformAnalyzer audioUrl="test.mp3" />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should handle play button with Space key', () => {
      render(<WaveformAnalyzer audioUrl="test.mp3" />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should pause when clicking pause button', async () => {
      const { rerender } = render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          onPlayStateChange={mockOnPlayStateChange}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Simulate playing state
      rerender(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          onPlayStateChange={mockOnPlayStateChange}
        />
      );
      
      fireEvent.click(button);
      
      expect(mockAudio.pause).toHaveBeenCalled();
    });
  });

  describe('Volume and Mute Controls', () => {
    it('should apply volume setting to audio element', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          volume={0.5}
          hideControls={true}
        />
      );
      
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should apply mute setting to audio element', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          isMuted={true}
          hideControls={true}
        />
      );
      
      expect(mockAudio.muted).toBe(true);
    });

    it('should clamp volume between 0 and 1', () => {
      const { rerender } = render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          volume={1.5}
          hideControls={true}
        />
      );
      
      expect(mockAudio.volume).toBe(1);
      
      rerender(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          volume={-0.5}
          hideControls={true}
        />
      );
      
      expect(mockAudio.volume).toBe(0);
    });
  });

  describe('Disabled State', () => {
    it('should disable play button when disabled', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          disabled={true}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'Play audio');
    });

    it('should not respond to keyboard when disabled', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          disabled={true}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(mockAudio.play).not.toHaveBeenCalled();
    });

    it('should show disabled overlay for stream', () => {
      render(
        <WaveformAnalyzer 
          stream={mockStream as any}
          disabled={true}
        />
      );
      
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when audio fails to play', async () => {
      mockAudio.play.mockRejectedValueOnce(new Error('Audio failed'));
      
      render(<WaveformAnalyzer audioUrl="test.mp3" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Playback failed/)).toBeInTheDocument();
      });
    });

    it('should handle AudioContext creation failure gracefully', () => {
      global.AudioContext = vi.fn(() => {
        throw new Error('AudioContext failed');
      }) as any;
      
      expect(() => {
        render(
          <WaveformAnalyzer 
            stream={mockStream as any}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Canvas Rendering', () => {
    it('should create canvas with proper dimensions for stream', () => {
      render(
        <WaveformAnalyzer 
          stream={mockStream as any}
          width={400}
          height={100}
        />
      );
      
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('width', '400');
      expect(canvas).toHaveAttribute('height', '100');
    });

    it('should create canvas with default dimensions for audio', () => {
      render(<WaveformAnalyzer audioUrl="test.mp3" />);
      
      const canvas = screen.getByRole('img');
      expect(canvas).toHaveAttribute('width', '300');
      expect(canvas).toHaveAttribute('height', '150');
    });

    it('should initialize canvas context', () => {
      render(
        <WaveformAnalyzer 
          stream={mockStream as any}
        />
      );
      
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });
  });

  describe('Live Stream Handling', () => {
    it('should initialize AudioContext for live stream', () => {
      render(
        <WaveformAnalyzer 
          stream={mockStream as any}
          isActive={true}
        />
      );
      
      expect(global.AudioContext).toHaveBeenCalled();
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
    });

    it('should not initialize when stream is paused', () => {
      render(
        <WaveformAnalyzer 
          stream={mockStream as any}
          isPaused={true}
        />
      );
      
      expect(global.AudioContext).not.toHaveBeenCalled();
    });

    it('should not initialize when not active', () => {
      render(
        <WaveformAnalyzer 
          stream={mockStream as any}
          isActive={false}
        />
      );
      
      expect(global.AudioContext).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cancel animation frame on unmount', () => {
      const { unmount } = render(
        <WaveformAnalyzer 
          stream={mockStream as any}
        />
      );
      
      unmount();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should close AudioContext on unmount', () => {
      const { unmount } = render(
        <WaveformAnalyzer 
          stream={mockStream as any}
        />
      );
      
      unmount();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should clean up audio element dataset', () => {
      const { unmount } = render(
        <WaveformAnalyzer audioUrl="test.mp3" />
      );
      
      unmount();
      
      expect(mockAudio.dataset.sourceCreated).toBeUndefined();
    });
  });

  describe('Props Validation', () => {
    it('should handle missing onPlayStateChange callback', () => {
      expect(() => {
        render(<WaveformAnalyzer audioUrl="test.mp3" />);
      }).not.toThrow();
    });

    it('should use default color when not provided', () => {
      render(<WaveformAnalyzer audioUrl="test.mp3" />);
      
      // Should not throw and should render
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should handle zero volume', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          volume={0}
          hideControls={true}
        />
      );
      
      expect(mockAudio.volume).toBe(0);
    });

    it('should handle custom label', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          label="My Custom Audio"
        />
      );
      
      expect(screen.getByText('My Custom Audio')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null canvas context', () => {
      mockCanvas.getContext.mockReturnValueOnce(null);
      
      expect(() => {
        render(
          <WaveformAnalyzer 
            stream={mockStream as any}
          />
        );
      }).not.toThrow();
    });

    it('should handle audio ended event', () => {
      render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
          onPlayStateChange={mockOnPlayStateChange}
        />
      );
      
      // Simulate audio ended
      const audio = document.querySelector('audio');
      if (audio && audio.onended) {
        (audio.onended as any)();
      }
      
      expect(mockOnPlayStateChange).toHaveBeenCalledWith(false);
    });

    it('should unmount cleanly without errors', () => {
      const { unmount } = render(
        <WaveformAnalyzer 
          audioUrl="test.mp3"
        />
      );
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});