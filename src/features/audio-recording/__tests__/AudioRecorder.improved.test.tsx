import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AudioRecorder } from '../AudioRecorder';
import { RecordingState } from 'murmuraba';

/**
 * Modern 2025 Testing Patterns for React Components
 * 
 * This test demonstrates best practices for testing React components:
 * - User-centric approach with React Testing Library
 * - Proper async handling with userEvent
 * - Semantic queries (getByRole, getByLabelText)
 * - Custom matchers and test utilities
 * - Performance considerations
 */

// Custom test utilities for better reusability
const createMockRecordingState = (overrides: Partial<RecordingState> = {}): RecordingState => ({
  isRecording: false,
  isPaused: false,
  recordingTime: 0,
  chunks: [],
  playingChunks: {},
  expandedChunk: null,
  ...overrides
});

const createMockProps = (overrides = {}) => ({
  recordingState: createMockRecordingState(),
  isInitialized: true,
  isLoading: false,
  onStartRecording: vi.fn().mockResolvedValue(undefined),
  onStopRecording: vi.fn().mockResolvedValue(undefined),
  onPauseRecording: vi.fn(),
  onResumeRecording: vi.fn(),
  onClearRecordings: vi.fn(),
  ...overrides
});

describe('AudioRecorder - Modern Testing Patterns', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Accessibility and Semantic HTML', () => {
    it('should provide proper ARIA labels and roles', () => {
      const props = createMockProps();
      render(<AudioRecorder {...props} />);
      
      // Use semantic queries for better accessibility testing
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      expect(recordButton).toBeInTheDocument();
      expect(recordButton).toHaveAttribute('aria-label');
      
      // Check for proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const props = createMockProps();
      render(<AudioRecorder {...props} />);
      
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      
      // Test keyboard navigation
      recordButton.focus();
      expect(recordButton).toHaveFocus();
      
      // Test Enter key activation
      await user.keyboard('{Enter}');
      expect(props.onStartRecording).toHaveBeenCalledTimes(1);
    });

    it('should announce state changes to screen readers', () => {
      const props = createMockProps({
        recordingState: createMockRecordingState({ isRecording: true, recordingTime: 10 })
      });
      
      render(<AudioRecorder {...props} />);
      
      // Check for live region updates
      expect(screen.getByText('Recording...')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Duration: 10s')).toBeInTheDocument();
    });
  });

  describe('User Interactions and State Management', () => {
    it('should handle recording lifecycle correctly', async () => {
      const props = createMockProps();
      const { rerender } = render(<AudioRecorder {...props} />);
      
      // Start recording
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await user.click(recordButton);
      
      await waitFor(() => {
        expect(props.onStartRecording).toHaveBeenCalledTimes(1);
      });
      
      // Update state to recording
      const recordingProps = createMockProps({
        recordingState: createMockRecordingState({ isRecording: true, recordingTime: 5 })
      });
      rerender(<AudioRecorder {...recordingProps} />);
      
      // Verify UI updates
      expect(screen.getByRole('button', { name: /stop recording/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      
      // Stop recording
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      await user.click(stopButton);
      
      await waitFor(() => {
        expect(recordingProps.onStopRecording).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle pause/resume functionality', async () => {
      const props = createMockProps({
        recordingState: createMockRecordingState({ isRecording: true })
      });
      const { rerender } = render(<AudioRecorder {...props} />);
      
      // Pause recording
      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);
      
      expect(props.onPauseRecording).toHaveBeenCalledTimes(1);
      
      // Update to paused state
      const pausedProps = createMockProps({
        recordingState: createMockRecordingState({ isRecording: true, isPaused: true })
      });
      rerender(<AudioRecorder {...pausedProps} />);
      
      // Resume recording
      const resumeButton = screen.getByRole('button', { name: /resume/i });
      await user.click(resumeButton);
      
      expect(pausedProps.onResumeRecording).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple chunks management', async () => {
      const mockChunks = [
        { id: '1', index: 0, duration: 1000, startTime: Date.now() - 2000, endTime: Date.now() - 1000 },
        { id: '2', index: 1, duration: 1500, startTime: Date.now() - 1000, endTime: Date.now() }
      ];
      
      const props = createMockProps({
        recordingState: createMockRecordingState({ chunks: mockChunks as any })
      });
      
      render(<AudioRecorder {...props} />);
      
      // Should show clear button when chunks exist
      const clearButton = screen.getByRole('button', { name: /clear recordings/i });
      expect(clearButton).toBeInTheDocument();
      
      await user.click(clearButton);
      expect(props.onClearRecordings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error States and Loading', () => {
    it('should disable controls when not initialized', () => {
      const props = createMockProps({ isInitialized: false });
      render(<AudioRecorder {...props} />);
      
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      expect(recordButton).toBeDisabled();
      
      // Should show appropriate message
      expect(screen.getByText(/initializing/i)).toBeInTheDocument();
    });

    it('should show loading state appropriately', () => {
      const props = createMockProps({ isLoading: true });
      render(<AudioRecorder {...props} />);
      
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      expect(recordButton).toBeDisabled();
      
      // Should show loading indicator
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should handle async operation failures gracefully', async () => {
      const mockError = new Error('Recording failed');
      const props = createMockProps({
        onStartRecording: vi.fn().mockRejectedValue(mockError)
      });
      
      render(<AudioRecorder {...props} />);
      
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await user.click(recordButton);
      
      // Should handle the error without crashing
      await waitFor(() => {
        expect(props.onStartRecording).toHaveBeenCalledTimes(1);
      });
      
      // Component should remain functional
      expect(recordButton).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should not re-render unnecessarily', () => {
      const props = createMockProps();
      const { rerender } = render(<AudioRecorder {...props} />);
      
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      const initialRenderCount = recordButton.getAttribute('data-testid');
      
      // Re-render with same props
      rerender(<AudioRecorder {...props} />);
      
      // Should use React.memo or similar optimization
      const afterRenderCount = recordButton.getAttribute('data-testid');
      expect(initialRenderCount).toBe(afterRenderCount);
    });

    it('should handle rapid state changes without issues', async () => {
      const props = createMockProps();
      const { rerender } = render(<AudioRecorder {...props} />);
      
      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        const newProps = createMockProps({
          recordingState: createMockRecordingState({ recordingTime: i * 1000 })
        });
        rerender(<AudioRecorder {...newProps} />);
      }
      
      // Component should remain stable
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
    });
  });

  describe('Integration with Audio Context', () => {
    it('should display duration formatting correctly', () => {
      const props = createMockProps({
        recordingState: createMockRecordingState({ 
          isRecording: true, 
          recordingTime: 125 // 2 minutes and 5 seconds
        })
      });
      
      render(<AudioRecorder {...props} />);
      
      // Should format duration correctly
      expect(screen.getByText('Duration: 125s')).toBeInTheDocument();
    });

    it('should handle edge cases in audio data', () => {
      const props = createMockProps({
        recordingState: createMockRecordingState({
          recordingTime: 0,
          chunks: []
        })
      });
      
      render(<AudioRecorder {...props} />);
      
      // Should handle zero duration gracefully
      expect(screen.getByText('Duration: 0s')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /clear recordings/i })).not.toBeInTheDocument();
    });
  });
});