import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChunkProcessingResults } from '../ChunkProcessingResults';
import { ProcessedChunk } from '../../hooks/murmuraba-engine/types';

// Mock data for testing
const createMockChunk = (id: string, overrides: Partial<ProcessedChunk> = {}): ProcessedChunk => ({
  id,
  originalSize: 1024,
  processedSize: 768,
  noiseRemoved: 256,
  duration: 8.5,
  startTime: 0,
  endTime: 8.5,
  processedAudioUrl: `https://example.com/processed-${id}.webm`,
  originalAudioUrl: `https://example.com/original-${id}.webm`,
  isPlaying: false,
  isExpanded: false,
  isValid: true,
  metrics: {
    noiseReductionLevel: 75.5,
    processingLatency: 12.3,
    inputLevel: 0.8,
    outputLevel: 0.6,
    timestamp: Date.now(),
    frameCount: 1000,
    droppedFrames: 0,
  },
  ...overrides,
});

describe('ChunkProcessingResults TDD', () => {
  const mockOnTogglePlayback = vi.fn();
  const mockOnToggleExpansion = vi.fn();
  const mockOnClearAll = vi.fn();
  const mockOnExportWav = vi.fn();
  const mockOnExportMp3 = vi.fn();
  const mockOnDownloadChunk = vi.fn();

  const defaultProps = {
    chunks: [],
    averageNoiseReduction: 0,
    selectedChunk: null,
    onTogglePlayback: mockOnTogglePlayback,
    onToggleExpansion: mockOnToggleExpansion,
    onClearAll: mockOnClearAll,
    onExportWav: mockOnExportWav,
    onExportMp3: mockOnExportMp3,
    onDownloadChunk: mockOnDownloadChunk,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render empty state when no chunks provided', () => {
      render(<ChunkProcessingResults {...defaultProps} />);
      
      expect(screen.getByText(/No recordings yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Start recording to see processed chunks here/i)).toBeInTheDocument();
    });

    it('should render with provided chunks', () => {
      const chunks = [createMockChunk('chunk-1'), createMockChunk('chunk-2')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      expect(screen.getByText(/Processing Results/i)).toBeInTheDocument();
      expect(screen.getByText('Chunk 1')).toBeInTheDocument();
      expect(screen.getByText('Chunk 2')).toBeInTheDocument();
    });

    it('should display average noise reduction correctly', () => {
      const chunks = [createMockChunk('chunk-1')];
      
      render(
        <ChunkProcessingResults 
          {...defaultProps} 
          chunks={chunks} 
          averageNoiseReduction={82.5} 
        />
      );
      
      expect(screen.getByText(/82\.5%/)).toBeInTheDocument();
    });
  });

  describe('Chunk Display and Information', () => {
    it('should display chunk information correctly', () => {
      const chunks = [createMockChunk('chunk-1', { 
        duration: 10.5,
        metrics: {
          noiseReductionLevel: 78.3,
          processingLatency: 15.2,
          inputLevel: 0.7,
          outputLevel: 0.5,
          timestamp: Date.now(),
          frameCount: 1200,
          droppedFrames: 2,
        }
      })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Check for duration in the chunk meta (not header)
      const chunkElement = screen.getByTestId('chunk-chunk-1');
      expect(chunkElement).toHaveTextContent(/0:10/); // 10.5 seconds formatted as 0:10
      expect(screen.getByText(/78\.3%/)).toBeInTheDocument();
    });

    it('should handle chunks with missing audio URLs gracefully', () => {
      const chunks = [createMockChunk('chunk-1', { 
        processedAudioUrl: undefined,
        originalAudioUrl: undefined
      })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Should render without crashing
      expect(screen.getByText(/Processing Results/i)).toBeInTheDocument();
    });

    it('should display invalid chunk error message', () => {
      const chunks = [createMockChunk('chunk-1', { 
        isValid: false,
        errorMessage: 'Processing failed'
      })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      expect(screen.getByText(/Processing failed/i)).toBeInTheDocument();
    });
  });

  describe('Chunk Expansion Functionality', () => {
    it('should toggle chunk expansion when expansion button is clicked', () => {
      const chunks = [createMockChunk('chunk-1')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const expandButton = screen.getByLabelText(/expand details/i);
      fireEvent.click(expandButton);
      
      expect(mockOnToggleExpansion).toHaveBeenCalledWith('chunk-1');
    });

    it('should show expanded view when chunk is expanded', () => {
      const chunks = [createMockChunk('chunk-1', { isExpanded: true })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      expect(screen.getByText(/Processing Metrics/i)).toBeInTheDocument();
      expect(screen.getByText(/Input Level/i)).toBeInTheDocument();
      expect(screen.getByText(/Output Level/i)).toBeInTheDocument();
      expect(screen.getByText(/Latency/i)).toBeInTheDocument();
    });

    it('should hide expanded view when chunk is collapsed', () => {
      const chunks = [createMockChunk('chunk-1', { isExpanded: false })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      expect(screen.queryByText(/Processing Metrics/i)).not.toBeInTheDocument();
    });

    it('should highlight selected chunk', () => {
      const chunks = [createMockChunk('chunk-1'), createMockChunk('chunk-2')];
      
      render(
        <ChunkProcessingResults 
          {...defaultProps} 
          chunks={chunks} 
          selectedChunk="chunk-1"
        />
      );
      
      // The selected chunk should have a different visual state
      const selectedChunkElement = screen.getByTestId('chunk-chunk-1');
      expect(selectedChunkElement).toHaveClass('chunk--selected');
    });
  });

  describe('Audio Playback Controls', () => {
    it('should call onTogglePlayback when play button is clicked', async () => {
      const chunks = [createMockChunk('chunk-1')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const playButton = screen.getByLabelText(/play processed chunk/i);
      fireEvent.click(playButton);
      
      expect(mockOnTogglePlayback).toHaveBeenCalledWith('chunk-1', 'processed');
    });

    it('should show playing state when chunk is playing', () => {
      const chunks = [createMockChunk('chunk-1', { isPlaying: true })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      expect(screen.getByLabelText(/pause processed chunk/i)).toBeInTheDocument();
    });

    it('should show play button when chunk is not playing', () => {
      const chunks = [createMockChunk('chunk-1', { isPlaying: false })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      expect(screen.getByLabelText(/play processed chunk/i)).toBeInTheDocument();
    });

    it('should disable playback when no audio URL is available', () => {
      const chunks = [createMockChunk('chunk-1', { processedAudioUrl: undefined })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const playButton = screen.getByLabelText(/play processed chunk/i);
      expect(playButton).toBeDisabled();
    });
  });

  describe('Export Functionality', () => {
    it('should call onExportWav when WAV export button is clicked', async () => {
      mockOnExportWav.mockResolvedValue(new Blob());
      const chunks = [createMockChunk('chunk-1', { isExpanded: true })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const wavButton = screen.getByLabelText(/Export processed audio as WAV/i);
      fireEvent.click(wavButton);
      
      expect(mockOnExportWav).toHaveBeenCalledWith('chunk-1', 'processed');
    });

    it('should call onExportMp3 when MP3 export button is clicked', async () => {
      mockOnExportMp3.mockResolvedValue(new Blob());
      const chunks = [createMockChunk('chunk-1', { isExpanded: true })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const mp3Button = screen.getByLabelText(/Export processed audio as MP3/i);
      fireEvent.click(mp3Button);
      
      expect(mockOnExportMp3).toHaveBeenCalledWith('chunk-1', 'processed');
    });

    it('should call onDownloadChunk when download button is clicked', async () => {
      const chunks = [createMockChunk('chunk-1', { isExpanded: true })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const downloadButton = screen.getByLabelText(/Download processed audio/i);
      fireEvent.click(downloadButton);
      
      expect(mockOnDownloadChunk).toHaveBeenCalledWith('chunk-1', 'webm', 'processed');
    });

    it('should disable export buttons when chunk is invalid', () => {
      const chunks = [createMockChunk('chunk-1', { 
        isValid: false, 
        isExpanded: true 
      })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Check that export buttons are disabled by looking for them individually
      expect(screen.getByLabelText(/Export processed audio as WAV/i)).toBeDisabled();
      expect(screen.getByLabelText(/Export processed audio as MP3/i)).toBeDisabled();
      expect(screen.getByLabelText(/Download processed audio/i)).toBeDisabled();
    });
  });

  describe('Clear All Functionality', () => {
    it('should call onClearAll when clear all button is clicked', () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);
      
      const chunks = [createMockChunk('chunk-1'), createMockChunk('chunk-2')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const clearButton = screen.getByLabelText(/clear all.*chunks/i);
      fireEvent.click(clearButton);
      
      expect(mockOnClearAll).toHaveBeenCalled();
      
      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it('should not show clear all button when no chunks exist', () => {
      render(<ChunkProcessingResults {...defaultProps} />);
      
      expect(screen.queryByLabelText(/clear all.*chunks/i)).not.toBeInTheDocument();
    });

    it('should show confirmation before clearing all chunks', async () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);
      
      const chunks = [createMockChunk('chunk-1')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const clearButton = screen.getByLabelText(/clear all.*chunks/i);
      fireEvent.click(clearButton);
      
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('delete all'));
      expect(mockOnClearAll).toHaveBeenCalled();
      
      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it('should not clear when confirmation is cancelled', () => {
      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);
      
      const chunks = [createMockChunk('chunk-1')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const clearButton = screen.getByLabelText(/clear all.*chunks/i);
      fireEvent.click(clearButton);
      
      expect(mockOnClearAll).not.toHaveBeenCalled();
      
      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });

  describe('Original vs Processed Audio', () => {
    it('should toggle between original and processed audio when toggle button is clicked', () => {
      const chunks = [createMockChunk('chunk-1', { isExpanded: true })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Should find toggle buttons for original vs processed audio
      const originalPlayButton = screen.getByLabelText(/play original audio/i);
      fireEvent.click(originalPlayButton);
      
      expect(mockOnTogglePlayback).toHaveBeenCalledWith('chunk-1', 'original');
    });

    it('should export original audio when original export is selected', async () => {
      const chunks = [createMockChunk('chunk-1', { isExpanded: true })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Find and click original audio export
      const originalWavButton = screen.getByLabelText(/Export original audio as WAV/i);
      fireEvent.click(originalWavButton);
      
      expect(mockOnExportWav).toHaveBeenCalledWith('chunk-1', 'original');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all interactive elements', () => {
      const chunks = [createMockChunk('chunk-1', { isExpanded: false })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Check that buttons have accessible names
      expect(screen.getByLabelText(/play processed chunk/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expand details/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const chunks = [createMockChunk('chunk-1')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const playButton = screen.getByLabelText(/play processed chunk/i);
      playButton.focus();
      
      fireEvent.keyDown(playButton, { key: 'Enter' });
      expect(mockOnTogglePlayback).toHaveBeenCalled();
      
      fireEvent.keyDown(playButton, { key: ' ' });
      expect(mockOnTogglePlayback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid clicks without breaking', () => {
      const chunks = [createMockChunk('chunk-1')];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      const playButton = screen.getByLabelText(/play processed chunk/i);
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(playButton);
      }
      
      // Should handle gracefully
      expect(mockOnTogglePlayback).toHaveBeenCalledTimes(10);
    });

    it('should render large number of chunks efficiently', () => {
      const chunks = Array.from({ length: 100 }, (_, i) => createMockChunk(`chunk-${i}`));
      
      const { container } = render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Should render without performance issues
      expect(container.querySelectorAll('[data-chunk-id]')).toHaveLength(100);
    });

    it('should handle chunks with extreme metric values', () => {
      const chunks = [createMockChunk('chunk-1', {
        metrics: {
          noiseReductionLevel: 999.99,
          processingLatency: -1,
          inputLevel: 10,
          outputLevel: -5,
          timestamp: Date.now(),
          frameCount: 0,
          droppedFrames: 1000000,
        }
      })];
      
      render(<ChunkProcessingResults {...defaultProps} chunks={chunks} />);
      
      // Should handle extreme values gracefully
      expect(screen.getByText(/Processing Results/i)).toBeInTheDocument();
    });
  });
});