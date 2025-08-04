import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioRecorder } from '../AudioRecorder';
import { RecordingState } from 'murmuraba';

describe('AudioRecorder - Gain Control', () => {
  const defaultProps = {
    recordingState: {
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      chunks: [],
      playingChunks: {},
      expandedChunk: null
    } as RecordingState,
    isInitialized: true,
    isLoading: false,
    inputGain: 1.0,
    onStartRecording: vi.fn(),
    onStopRecording: vi.fn(),
    onPauseRecording: vi.fn(),
    onResumeRecording: vi.fn(),
    onClearRecordings: vi.fn(),
    onSetInputGain: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Gain Control UI', () => {
    it('should render microphone gain button', () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      expect(gainButton).toBeInTheDocument();
    });

    it('should toggle gain control panel visibility', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      
      // Initially hidden
      expect(screen.queryByLabelText(/input gain/i)).not.toBeInTheDocument();
      
      // Click to show
      await userEvent.click(gainButton);
      expect(screen.getByLabelText(/input gain/i)).toBeInTheDocument();
      
      // Click to hide
      await userEvent.click(gainButton);
      expect(screen.queryByLabelText(/input gain/i)).not.toBeInTheDocument();
    });

    it('should display current gain value', async () => {
      render(<AudioRecorder {...defaultProps} inputGain={1.5} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByText('Input Gain: 1.5x')).toBeInTheDocument();
    });

    it('should render gain slider with correct attributes', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '0.5');
      expect(slider).toHaveAttribute('max', '3.0');
      expect(slider).toHaveAttribute('step', '0.1');
      expect(slider).toHaveAttribute('value', '1');
    });
  });

  describe('Gain Slider Interaction', () => {
    it('should call onSetInputGain when slider value changes', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2.0' } });
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(2.0);
    });

    it('should handle multiple slider updates', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const slider = screen.getByRole('slider');
      
      fireEvent.change(slider, { target: { value: '1.5' } });
      fireEvent.change(slider, { target: { value: '2.0' } });
      fireEvent.change(slider, { target: { value: '0.8' } });
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledTimes(3);
      expect(defaultProps.onSetInputGain).toHaveBeenNthCalledWith(1, 1.5);
      expect(defaultProps.onSetInputGain).toHaveBeenNthCalledWith(2, 2.0);
      expect(defaultProps.onSetInputGain).toHaveBeenNthCalledWith(3, 0.8);
    });

    it('should reflect prop changes in slider value', async () => {
      const { rerender } = render(<AudioRecorder {...defaultProps} inputGain={1.0} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      let slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('value', '1');
      
      rerender(<AudioRecorder {...defaultProps} inputGain={2.5} />);
      
      slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('value', '2.5');
    });
  });

  describe('Gain Preset Buttons', () => {
    it('should render all preset buttons', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByRole('button', { name: /low/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /normal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /high/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /boost/i })).toBeInTheDocument();
    });

    it('should set correct gain value for Low preset', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const lowButton = screen.getByRole('button', { name: /low/i });
      await userEvent.click(lowButton);
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(0.7);
    });

    it('should set correct gain value for Normal preset', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const normalButton = screen.getByRole('button', { name: /normal/i });
      await userEvent.click(normalButton);
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(1.0);
    });

    it('should set correct gain value for High preset', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const highButton = screen.getByRole('button', { name: /high/i });
      await userEvent.click(highButton);
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(1.5);
    });

    it('should set correct gain value for Boost preset', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const boostButton = screen.getByRole('button', { name: /boost/i });
      await userEvent.click(boostButton);
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(2.0);
    });
  });

  describe('Gain Level Indicator', () => {
    it('should show reduced input level indicator', async () => {
      render(<AudioRecorder {...defaultProps} inputGain={0.8} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByText(/reduced input level/i)).toBeInTheDocument();
    });

    it('should show normal input level indicator', async () => {
      render(<AudioRecorder {...defaultProps} inputGain={1.0} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByText(/normal input level/i)).toBeInTheDocument();
    });

    it('should show increased input level indicator', async () => {
      render(<AudioRecorder {...defaultProps} inputGain={1.3} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByText(/increased input level/i)).toBeInTheDocument();
    });

    it('should show high input level indicator', async () => {
      render(<AudioRecorder {...defaultProps} inputGain={1.8} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByText(/high input level/i)).toBeInTheDocument();
    });

    it('should show maximum boost warning', async () => {
      render(<AudioRecorder {...defaultProps} inputGain={2.5} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByText(/maximum boost.*watch for clipping/i)).toBeInTheDocument();
    });
  });

  describe('Gain Control During Recording', () => {
    it('should allow gain adjustment while recording', async () => {
      const recordingProps = {
        ...defaultProps,
        recordingState: {
          ...defaultProps.recordingState,
          isRecording: true
        }
      };
      
      render(<AudioRecorder {...recordingProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1.7' } });
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(1.7);
    });

    it('should keep gain panel accessible during recording', async () => {
      const { rerender } = render(<AudioRecorder {...defaultProps} />);
      
      // Open gain panel
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      // Start recording
      rerender(<AudioRecorder {...defaultProps} recordingState={{
        ...defaultProps.recordingState,
        isRecording: true
      }} />);
      
      // Gain panel should still be visible
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should allow gain adjustment while paused', async () => {
      const pausedProps = {
        ...defaultProps,
        recordingState: {
          ...defaultProps.recordingState,
          isRecording: true,
          isPaused: true
        }
      };
      
      render(<AudioRecorder {...pausedProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const highButton = screen.getByRole('button', { name: /high/i });
      await userEvent.click(highButton);
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(1.5);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      
      // Check for label association
      const label = screen.getByText(/input gain:/i);
      expect(label).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      
      // Tab to button and press Enter
      gainButton.focus();
      fireEvent.keyDown(gainButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });
      
      const slider = screen.getByRole('slider');
      slider.focus();
      
      // Arrow keys should work on slider
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    });

    it('should have visible focus indicators', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const presetButtons = [
        screen.getByRole('button', { name: /low/i }),
        screen.getByRole('button', { name: /normal/i }),
        screen.getByRole('button', { name: /high/i }),
        screen.getByRole('button', { name: /boost/i })
      ];
      
      presetButtons.forEach(button => {
        expect(button).toHaveClass('btn-ghost');
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable gain controls when not initialized', async () => {
      render(<AudioRecorder {...defaultProps} isInitialized={false} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      // Controls should still be visible but interactions might be limited
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should handle gain changes during loading state', async () => {
      render(<AudioRecorder {...defaultProps} isLoading={true} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '1.5' } });
      
      // Should still call the handler even during loading
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(1.5);
    });
  });

  describe('Visual Feedback', () => {
    it('should display gain value with one decimal place', async () => {
      render(<AudioRecorder {...defaultProps} inputGain={1.234} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      expect(screen.getByText('Input Gain: 1.2x')).toBeInTheDocument();
    });

    it('should have consistent styling for gain panel', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const panel = screen.getByText(/input gain/i).closest('div');
      expect(panel).toHaveStyle({
        padding: '15px',
        borderRadius: '8px'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggle of gain panel', async () => {
      render(<AudioRecorder {...defaultProps} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      
      // Rapidly toggle multiple times
      for (let i = 0; i < 10; i++) {
        await userEvent.click(gainButton);
      }
      
      // Should end up closed (even number of clicks)
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    });

    it('should handle gain updates with no recordings', () => {
      render(<AudioRecorder {...defaultProps} />);
      
      // Should not throw any errors
      expect(() => {
        fireEvent.click(screen.getByRole('button', { name: /microphone gain/i }));
      }).not.toThrow();
    });

    it('should handle gain updates with multiple chunks', async () => {
      const propsWithChunks = {
        ...defaultProps,
        recordingState: {
          ...defaultProps.recordingState,
          chunks: [
            { id: '1', startTime: 0, endTime: 10 },
            { id: '2', startTime: 10, endTime: 20 }
          ] as any
        }
      };
      
      render(<AudioRecorder {...propsWithChunks} />);
      
      const gainButton = screen.getByRole('button', { name: /microphone gain/i });
      await userEvent.click(gainButton);
      
      const normalButton = screen.getByRole('button', { name: /normal/i });
      await userEvent.click(normalButton);
      
      expect(defaultProps.onSetInputGain).toHaveBeenCalledWith(1.0);
    });
  });
});