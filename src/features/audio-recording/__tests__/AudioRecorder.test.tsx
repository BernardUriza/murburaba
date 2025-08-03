import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioRecorder } from '../AudioRecorder';
import { RecordingState } from 'murmuraba';

describe('AudioRecorder', () => {
  const mockRecordingState: RecordingState = {
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    chunks: [],
    playingChunks: {},
    expandedChunk: null
  };

  const mockProps = {
    recordingState: mockRecordingState,
    isInitialized: true,
    isLoading: false,
    onStartRecording: vi.fn().mockResolvedValue(undefined),
    onStopRecording: vi.fn().mockResolvedValue(undefined),
    onPauseRecording: vi.fn(),
    onResumeRecording: vi.fn(),
    onClearRecordings: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when not recording', () => {
    render(<AudioRecorder {...mockProps} />);
    
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
    expect(screen.getByText('🎙️')).toBeInTheDocument();
    expect(screen.queryByText('Stop Recording')).not.toBeInTheDocument();
  });

  it('renders correctly when recording', () => {
    const recordingProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        isRecording: true,
        duration: 10
      }
    };
    
    render(<AudioRecorder {...recordingProps} />);
    
    expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    expect(screen.getByText('⏹')).toBeInTheDocument();
    expect(screen.getByText('Recording...')).toBeInTheDocument();
    expect(screen.getByText('Duration: 10s')).toBeInTheDocument();
  });

  it('shows pause button when recording', () => {
    const recordingProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        isRecording: true
      }
    };
    
    render(<AudioRecorder {...recordingProps} />);
    
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('⏸️')).toBeInTheDocument();
  });

  it('shows resume button when paused', () => {
    const pausedProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        isRecording: true,
        isPaused: true
      }
    };
    
    render(<AudioRecorder {...pausedProps} />);
    
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('▶️')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('shows clear button when there are recordings', () => {
    const withChunksProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        chunks: [{ id: '1', index: 0, duration: 1000 } as any]
      }
    };
    
    render(<AudioRecorder {...withChunksProps} />);
    
    expect(screen.getByText('Clear Recordings')).toBeInTheDocument();
    expect(screen.getByText('🗑️')).toBeInTheDocument();
  });

  it('disables record button when not initialized', () => {
    const notInitializedProps = {
      ...mockProps,
      isInitialized: false
    };
    
    render(<AudioRecorder {...notInitializedProps} />);
    
    const recordButton = screen.getByText('Start Recording').closest('button');
    expect(recordButton).toBeDisabled();
  });

  it('disables record button when loading', () => {
    const loadingProps = {
      ...mockProps,
      isLoading: true
    };
    
    render(<AudioRecorder {...loadingProps} />);
    
    const recordButton = screen.getByText('Start Recording').closest('button');
    expect(recordButton).toBeDisabled();
  });

  it('calls onStartRecording when record button clicked', async () => {
    render(<AudioRecorder {...mockProps} />);
    
    const recordButton = screen.getByText('Start Recording').closest('button')!;
    fireEvent.click(recordButton);
    
    await waitFor(() => {
      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onStopRecording when stop button clicked', async () => {
    const recordingProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        isRecording: true
      }
    };
    
    render(<AudioRecorder {...recordingProps} />);
    
    const stopButton = screen.getByText('Stop Recording').closest('button')!;
    fireEvent.click(stopButton);
    
    await waitFor(() => {
      expect(mockProps.onStopRecording).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onPauseRecording when pause button clicked', () => {
    const recordingProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        isRecording: true
      }
    };
    
    render(<AudioRecorder {...recordingProps} />);
    
    const pauseButton = screen.getByText('Pause').closest('button')!;
    fireEvent.click(pauseButton);
    
    expect(mockProps.onPauseRecording).toHaveBeenCalledTimes(1);
  });

  it('calls onResumeRecording when resume button clicked', () => {
    const pausedProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        isRecording: true,
        isPaused: true
      }
    };
    
    render(<AudioRecorder {...pausedProps} />);
    
    const resumeButton = screen.getByText('Resume').closest('button')!;
    fireEvent.click(resumeButton);
    
    expect(mockProps.onResumeRecording).toHaveBeenCalledTimes(1);
  });

  it('calls onClearRecordings when clear button clicked', () => {
    const withChunksProps = {
      ...mockProps,
      recordingState: {
        ...mockRecordingState,
        chunks: [{ id: '1', index: 0, duration: 1000 } as any]
      }
    };
    
    render(<AudioRecorder {...withChunksProps} />);
    
    const clearButton = screen.getByText('Clear Recordings').closest('button')!;
    fireEvent.click(clearButton);
    
    expect(mockProps.onClearRecordings).toHaveBeenCalledTimes(1);
  });
});