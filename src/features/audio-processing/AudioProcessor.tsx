import React, { useCallback, useMemo } from 'react';
import { ChunkData } from 'murmuraba';
import type { IChunkProcessingResultsProps } from 'murmuraba';

interface AudioProcessorProps {
  chunks: ChunkData[];
  isPlaying: { [key: string]: boolean };
  expandedChunk: string | null;
  onTogglePlayback: (chunkId: string, audioType?: 'processed' | 'original') => Promise<void>;
  onToggleExpansion: (chunkId: string) => void;
  onExportWav: (chunkId: string) => Promise<void>;
  onExportMp3: (chunkId: string) => Promise<void>;
  // onDownloadAll: () => Promise<void>; // Unused, commented for future use
  onClearChunks?: () => void; // Optional clear handler from parent
  ChunkProcessingResults: React.ComponentType<IChunkProcessingResultsProps>;
}

/**
 * AudioProcessor Component
 * 
 * Bridges the application's audio processing state with the ChunkProcessingResults
 * presentation component from the murmuraba package.
 * 
 * Responsibilities:
 * - Transform ChunkData to ProcessedChunk format
 * - Handle export operations (WAV, MP3, WebM)
 * - Calculate aggregate metrics
 * - Manage chunk interactions
 */
export const AudioProcessor: React.FC<AudioProcessorProps> = ({
  chunks,
  isPlaying,
  expandedChunk,
  onTogglePlayback,
  onToggleExpansion,
  onExportWav,
  onExportMp3,
  // onDownloadAll, // Unused, commented for future use
  onClearChunks,
  ChunkProcessingResults
}) => {
  // Transform chunks to match ProcessedChunk interface expected by ChunkProcessingResults
  // Optimized to minimize recalculation
  const processedChunks = useMemo(() => {
    return chunks.map(chunk => {
      // Only include dynamic properties that actually change
      const isChunkPlaying = isPlaying[chunk.id] || false;
      const isChunkExpanded = expandedChunk === chunk.id;
      
      return {
        // Core chunk properties
        id: chunk.id,
        index: chunk.index, // Add missing index property
        duration: chunk.duration / 1000, // Convert ms to seconds for display
        
        // Audio URLs
        originalAudioUrl: chunk.originalAudioUrl,
        processedAudioUrl: chunk.processedAudioUrl,
        
        // Size metrics
        originalSize: chunk.originalSize || 0,
        processedSize: chunk.processedSize || 0,
        noiseRemoved: chunk.noiseRemoved || 0,
        
        // State flags
        isPlaying: isChunkPlaying,
        isExpanded: isChunkExpanded,
        isValid: chunk.isValid !== false,
        errorMessage: chunk.errorMessage,
        currentlyPlayingType: chunk.currentlyPlayingType || 'processed',
        
        // Processing metrics with defaults
        metrics: {
          noiseReductionLevel: chunk.metrics?.noiseReductionLevel || 0,
          processingLatency: chunk.metrics?.processingLatency || 0,
          inputLevel: chunk.metrics?.inputLevel || 0,
          outputLevel: chunk.metrics?.outputLevel || 0,
          frameCount: chunk.metrics?.frameCount || 0,
          droppedFrames: chunk.metrics?.droppedFrames || 0,
          timestamp: chunk.metrics?.timestamp || Date.now()
        },
        
        // VAD (Voice Activity Detection) data
        averageVad: chunk.averageVad,
        vadData: chunk.vadData || [],
        
        // Timing information (from ChunkMetrics)
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        timestamp: chunk.startTime // Use startTime as the chunk timestamp
      };
    });
  }, [chunks, isPlaying, expandedChunk]);

  // Calculate average noise reduction across all valid chunks
  const averageNoiseReduction = useMemo(() => {
    const validChunks = chunks.filter(chunk => chunk.isValid !== false);
    if (validChunks.length === 0) return 0;
    
    const totalReduction = validChunks.reduce((sum, chunk) => 
      sum + (chunk.metrics?.noiseReductionLevel || 0), 0
    );
    return totalReduction / validChunks.length;
  }, [chunks]);

  // Handle download with format conversion and error handling
  const handleDownloadChunk = useCallback(async (
    chunkId: string, 
    format: 'webm' | 'wav' | 'mp3',
    audioType: 'processed' | 'original'
  ) => {
    try {
      // Route to appropriate export function based on format
      switch (format) {
        case 'wav':
          await onExportWav(chunkId);
          break;
          
        case 'mp3':
          await onExportMp3(chunkId);
          break;
          
        case 'webm': {
          // For WebM, use the existing blob URL directly
          const chunk = chunks.find(c => c.id === chunkId);
          if (!chunk) {
            throw new Error(`Chunk ${chunkId} not found`);
          }
          
          const url = audioType === 'original' 
            ? chunk.originalAudioUrl 
            : chunk.processedAudioUrl;
            
          if (!url) {
            throw new Error(`No ${audioType} audio available for chunk ${chunkId}`);
          }
          
          // Create download link
          const link = document.createElement('a');
          link.href = url;
          link.download = `chunk-${chunk.index + 1}-${audioType}.webm`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          break;
        }
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`Failed to download chunk ${chunkId} as ${format}:`, error);
      // Could trigger a toast notification here
      throw error; // Re-throw to let ChunkProcessingResults handle it
    }
  }, [chunks, onExportWav, onExportMp3]);

  // Handle clear all recordings with proper delegation
  const handleClearAll = useCallback(() => {
    if (onClearChunks) {
      onClearChunks();
    } else {
      console.warn('Clear chunks handler not provided to AudioProcessor');
    }
  }, [onClearChunks]);

  // Handle playback with error recovery
  const handleTogglePlayback = useCallback(async (
    chunkId: string, 
    audioType: 'processed' | 'original' = 'processed'
  ) => {
    try {
      await onTogglePlayback(chunkId, audioType);
    } catch (error) {
      console.error(`Failed to toggle playback for chunk ${chunkId}:`, error);
      // Could implement fallback behavior here
      throw error;
    }
  }, [onTogglePlayback]);

  // Render the ChunkProcessingResults component with proper props
  return (
    <div className="audio-processor-wrapper" role="region" aria-label="Audio Processing Results">
      <ChunkProcessingResults
        chunks={processedChunks}
        averageNoiseReduction={averageNoiseReduction}
        selectedChunk={expandedChunk}
        onTogglePlayback={handleTogglePlayback}
        onToggleExpansion={onToggleExpansion}
        onClearAll={handleClearAll}
        onDownloadChunk={handleDownloadChunk}
        className="audio-processor-results"
      />
    </div>
  );
};

// Add display name for better debugging
AudioProcessor.displayName = 'AudioProcessor';