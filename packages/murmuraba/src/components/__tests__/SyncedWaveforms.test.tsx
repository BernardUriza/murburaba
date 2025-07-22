import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncedWaveforms } from '../SyncedWaveforms';

// Mock WaveformAnalyzer component
vi.mock('../WaveformAnalyzer', () => ({
  WaveformAnalyzer: vi.fn(({ label, color, volume, isActive, isPaused, disabled, 'aria-label': ariaLabel }) => (
    <div 
      data-testid={`waveform-${label?.toLowerCase().replace(/\s+/g, '-')}`}
      data-color={color}
      data-volume={volume}
      data-active={isActive}
      data-paused={isPaused}
      data-disabled={disabled}
      aria-label={ariaLabel}
      role="img"
    >
      {label} - Volume: {Math.round((volume || 0) * 100)}%
    </div>
  ))
}));

describe('SyncedWaveforms TDD Tests', () => {
  let mockOnPlayingChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPlayingChange = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render both waveform components', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          onPlayingChange={mockOnPlayingChange}
        />
      );

      expect(screen.getByTestId('waveform-original-audio')).toBeInTheDocument();
      expect(screen.getByTestId('waveform-processed-audio-(noise-reduced)')).toBeInTheDocument();
    });

    it('should apply proper accessibility labels', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          aria-label="Custom waveform comparison"
        />
      );

      const container = screen.getByRole('region');
      expect(container).toHaveAttribute('aria-label', 'Custom waveform comparison');
    });

    it('should use default aria-label when not provided', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      const container = screen.getByRole('region');
      expect(container).toHaveAttribute('aria-label', 'Synchronized audio waveform comparison');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          className="custom-synced-waveforms"
        />
      );

      expect(container.firstChild).toHaveClass('synced-waveforms');
      expect(container.firstChild).toHaveClass('custom-synced-waveforms');
    });
  });

  describe('Waveform Configuration', () => {
    it('should pass correct props to original waveform', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={true}
          originalColor="#ff0000"
          originalLabel="My Original"
        />
      );

      const originalWaveform = screen.getByTestId('waveform-my-original');
      expect(originalWaveform).toHaveAttribute('data-color', '#ff0000');
      expect(originalWaveform).toHaveAttribute('data-active', 'true');
      expect(originalWaveform).toHaveAttribute('data-paused', 'false');
      expect(originalWaveform).toHaveAttribute('data-volume', '0.5'); // Default volume
    });

    it('should pass correct props to processed waveform', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={false}
          processedColor="#00ff00"
          processedLabel="My Processed"
        />
      );

      const processedWaveform = screen.getByTestId('waveform-my-processed');
      expect(processedWaveform).toHaveAttribute('data-color', '#00ff00');
      expect(processedWaveform).toHaveAttribute('data-active', 'true');
      expect(processedWaveform).toHaveAttribute('data-paused', 'true');
      expect(processedWaveform).toHaveAttribute('data-volume', '0.8'); // Default volume
    });

    it('should use default colors when not provided', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      const originalWaveform = screen.getByTestId('waveform-original-audio');
      const processedWaveform = screen.getByTestId('waveform-processed-audio-(noise-reduced)');
      
      expect(originalWaveform).toHaveAttribute('data-color', '#ef4444');
      expect(processedWaveform).toHaveAttribute('data-color', '#10b981');
    });

    it('should use default labels when not provided', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      expect(screen.getByText(/Original Audio - Volume:/)).toBeInTheDocument();
      expect(screen.getByText(/Processed Audio \(Noise Reduced\) - Volume:/)).toBeInTheDocument();
    });
  });

  describe('Volume Controls', () => {
    it('should render volume controls by default', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      const volumeControls = screen.getByRole('group', { name: 'Volume controls' });
      expect(volumeControls).toBeInTheDocument();
      
      expect(screen.getByLabelText('Original audio volume')).toBeInTheDocument();
      expect(screen.getByLabelText('Enhanced audio volume')).toBeInTheDocument();
    });

    it('should hide volume controls when showVolumeControls is false', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          showVolumeControls={false}
        />
      );

      expect(screen.queryByRole('group', { name: 'Volume controls' })).not.toBeInTheDocument();
    });

    it('should update original volume when slider changes', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      const originalSlider = screen.getByLabelText('Original audio volume');
      fireEvent.change(originalSlider, { target: { value: '0.7' } });

      expect(screen.getByText(/Original Audio - Volume: 70%/)).toBeInTheDocument();
    });

    it('should update processed volume when slider changes', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      const processedSlider = screen.getByLabelText('Enhanced audio volume');
      fireEvent.change(processedSlider, { target: { value: '0.3' } });

      expect(screen.getByText(/Processed Audio \(Noise Reduced\) - Volume: 30%/)).toBeInTheDocument();
    });

    it('should clamp volume values between 0 and 1', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      const originalSlider = screen.getByLabelText('Original audio volume');
      
      // Test upper bound
      fireEvent.change(originalSlider, { target: { value: '1.5' } });
      expect(screen.getByText(/Original Audio - Volume: 100%/)).toBeInTheDocument();
      
      // Test lower bound
      fireEvent.change(originalSlider, { target: { value: '-0.5' } });
      expect(screen.getByText(/Original Audio - Volume: 0%/)).toBeInTheDocument();
    });

    it('should display volume percentages correctly', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument(); // Original default
      expect(screen.getByText('80%')).toBeInTheDocument(); // Processed default
    });
  });

  describe('Playback Controls', () => {
    it('should render playback controls by default', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      expect(playButton).toBeInTheDocument();
      expect(playButton).toHaveTextContent('▶ Play Both');
    });

    it('should hide playback controls when showPlaybackControls is false', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          showPlaybackControls={false}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should show pause button when playing', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={true}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const pauseButton = screen.getByRole('button');
      expect(pauseButton).toHaveTextContent('⏸ Pause');
      expect(pauseButton).toHaveAttribute('aria-label', 'Pause synchronized playback');
    });

    it('should show play button when not playing', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={false}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      expect(playButton).toHaveTextContent('▶ Play Both');
      expect(playButton).toHaveAttribute('aria-label', 'Play synchronized playback');
    });

    it('should call onPlayingChange when button is clicked', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={false}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      fireEvent.click(playButton);

      expect(mockOnPlayingChange).toHaveBeenCalledWith(true);
    });

    it('should toggle playing state on button click', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={true}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const pauseButton = screen.getByRole('button');
      fireEvent.click(pauseButton);

      expect(mockOnPlayingChange).toHaveBeenCalledWith(false);
    });

    it('should handle keyboard navigation with Enter key', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={false}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      fireEvent.keyDown(playButton, { key: 'Enter' });

      expect(mockOnPlayingChange).toHaveBeenCalledWith(true);
    });

    it('should handle keyboard navigation with Space key', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={false}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      fireEvent.keyDown(playButton, { key: ' ' });

      expect(mockOnPlayingChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Disabled State', () => {
    it('should disable all controls when disabled prop is true', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          disabled={true}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      const originalSlider = screen.getByLabelText('Original audio volume');
      const processedSlider = screen.getByLabelText('Enhanced audio volume');

      expect(playButton).toBeDisabled();
      expect(originalSlider).toBeDisabled();
      expect(processedSlider).toBeDisabled();
    });

    it('should pass disabled state to waveform components', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          disabled={true}
        />
      );

      const originalWaveform = screen.getByTestId('waveform-original-audio');
      const processedWaveform = screen.getByTestId('waveform-processed-audio-(noise-reduced)');

      expect(originalWaveform).toHaveAttribute('data-disabled', 'true');
      expect(processedWaveform).toHaveAttribute('data-disabled', 'true');
    });

    it('should not call onPlayingChange when disabled', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          disabled={true}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      fireEvent.click(playButton);

      expect(mockOnPlayingChange).not.toHaveBeenCalled();
    });

    it('should not respond to keyboard when disabled', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          disabled={true}
          onPlayingChange={mockOnPlayingChange}
        />
      );

      const playButton = screen.getByRole('button');
      fireEvent.keyDown(playButton, { key: 'Enter' });

      expect(mockOnPlayingChange).not.toHaveBeenCalled();
    });

    it('should apply visual disabled styling', () => {
      const { container } = render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          disabled={true}
        />
      );

      const syncedWaveforms = container.firstChild as HTMLElement;
      expect(syncedWaveforms.style.opacity).toBe('0.6');
      expect(syncedWaveforms.style.pointerEvents).toBe('none');
    });
  });

  describe('Error States and Edge Cases', () => {
    it('should show message when no audio URLs provided', () => {
      render(<SyncedWaveforms />);

      expect(screen.getByText('No audio files provided for comparison')).toBeInTheDocument();
    });

    it('should handle missing onPlayingChange callback gracefully', () => {
      expect(() => {
        render(
          <SyncedWaveforms
            originalAudioUrl="original.mp3"
            processedAudioUrl="processed.mp3"
          />
        );
      }).not.toThrow();
    });

    it('should work with only original audio URL', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
        />
      );

      expect(screen.getByTestId('waveform-original-audio')).toBeInTheDocument();
      expect(screen.queryByText('No audio files provided for comparison')).not.toBeInTheDocument();
    });

    it('should work with only processed audio URL', () => {
      render(
        <SyncedWaveforms
          processedAudioUrl="processed.mp3"
        />
      );

      expect(screen.getByTestId('waveform-processed-audio-(noise-reduced)')).toBeInTheDocument();
      expect(screen.queryByText('No audio files provided for comparison')).not.toBeInTheDocument();
    });
  });

  describe('Information Display', () => {
    it('should display comparison information', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      const infoSection = screen.getByRole('note', { name: 'Comparison information' });
      expect(infoSection).toBeInTheDocument();
      expect(screen.getByText('🔴 Original audio | 🟢 Noise-reduced audio')).toBeInTheDocument();
      expect(screen.getByText('Watch how the waveforms change to see the noise reduction in action')).toBeInTheDocument();
    });

    it('should display volume labels with correct colors', () => {
      render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          originalColor="#ff0000"
          processedColor="#00ff00"
        />
      );

      const originalLabel = screen.getByText('🔴 Original:');
      const processedLabel = screen.getByText('🟢 Enhanced:');

      expect(originalLabel).toHaveStyle('color: #ff0000');
      expect(processedLabel).toHaveStyle('color: #00ff00');
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount cleanly without errors', () => {
      const { unmount } = render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
        />
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle prop changes without errors', () => {
      const { rerender } = render(
        <SyncedWaveforms
          originalAudioUrl="original.mp3"
          processedAudioUrl="processed.mp3"
          isPlaying={false}
        />
      );

      expect(() => {
        rerender(
          <SyncedWaveforms
            originalAudioUrl="new-original.mp3"
            processedAudioUrl="new-processed.mp3"
            isPlaying={true}
            disabled={true}
          />
        );
      }).not.toThrow();
    });
  });
});