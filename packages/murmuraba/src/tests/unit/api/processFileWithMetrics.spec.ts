/**
 * Unit tests for processFileWithMetrics API
 * Following TDD approach - tests written first
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processFileWithMetrics } from '../../../api/processFileWithMetrics';
import { ProcessedChunkBuilder } from '../../utils/test-builders';

describe('processFileWithMetrics', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should exist and be a function', () => {
      expect(processFileWithMetrics).toBeDefined();
      expect(typeof processFileWithMetrics).toBe('function');
    });

    it('should process a file without chunking options (legacy mode)', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const onProgress = vi.fn();

      // Act
      const result = await processFileWithMetrics(mockFile, onProgress);

      // Assert
      expect(result).toHaveProperty('originalBlob');
      expect(result).toHaveProperty('processedBlob');
      expect(result).toHaveProperty('metrics');
      expect(onProgress).toHaveBeenCalled();
    });

    it('should process a file with chunking options', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const options = {
        chunkOptions: {
          chunkDuration: 5,
          outputFormat: 'webm' as const,
        },
        onProgress: vi.fn(),
      };

      // Act
      const result = await processFileWithMetrics(mockFile, options);

      // Assert
      expect(result).toHaveProperty('chunks');
      expect(Array.isArray(result.chunks)).toBe(true);
      expect(options.onProgress).toHaveBeenCalled();
    });
  });

  describe('Chunk processing', () => {
    it('should create chunks of specified duration', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const chunkDuration = 5; // seconds
      const options = {
        chunkOptions: {
          chunkDuration,
          outputFormat: 'wav' as const,
        },
      };

      // Act
      const result = await processFileWithMetrics(mockFile, options);

      // Assert
      if (result.chunks) {
        result.chunks.forEach(chunk => {
          expect(chunk.duration).toBeLessThanOrEqual(chunkDuration);
          expect(chunk.endTime - chunk.startTime).toBeCloseTo(chunk.duration);
        });
      }
    });

    it('should convert chunks to specified format', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const outputFormat = 'webm';
      const options = {
        chunkOptions: {
          chunkDuration: 10,
          outputFormat: outputFormat as const,
        },
      };

      // Act
      const result = await processFileWithMetrics(mockFile, options);

      // Assert
      if (result.chunks) {
        result.chunks.forEach(chunk => {
          expect(chunk.blob.type).toContain(outputFormat);
        });
      }
    });

    it('should calculate VAD metrics for each chunk', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const options = {
        chunkOptions: {
          chunkDuration: 5,
          outputFormat: 'wav' as const,
        },
      };

      // Act
      const result = await processFileWithMetrics(mockFile, options);

      // Assert
      if (result.chunks) {
        result.chunks.forEach(chunk => {
          expect(chunk.vadScore).toBeGreaterThanOrEqual(0);
          expect(chunk.vadScore).toBeLessThanOrEqual(1);
          expect(chunk.metrics).toHaveProperty('vad');
          expect(chunk.metrics).toHaveProperty('noiseRemoved');
          expect(chunk.metrics).toHaveProperty('averageLevel');
        });
      }
    });
  });

  describe('Progress reporting', () => {
    it('should report progress during processing', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const onProgress = vi.fn();

      // Act
      await processFileWithMetrics(mockFile, onProgress);

      // Assert
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        stage: expect.any(String),
        progress: expect.any(Number),
      }));
      
      // Verify progress values are between 0 and 1
      onProgress.mock.calls.forEach(call => {
        const progress = call[0].progress;
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      });
    });

    it('should report different stages during processing', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const onProgress = vi.fn();
      const stages = new Set<string>();

      // Act
      await processFileWithMetrics(mockFile, onProgress);

      // Assert
      onProgress.mock.calls.forEach(call => {
        stages.add(call[0].stage);
      });
      
      expect(stages.size).toBeGreaterThan(1); // Should have multiple stages
      expect(stages.has('decoding')).toBe(true);
      expect(stages.has('processing')).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid file types', async () => {
      // Arrange
      const mockFile = new File(['not audio'], 'test.txt', { type: 'text/plain' });

      // Act & Assert
      await expect(processFileWithMetrics(mockFile)).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      // Arrange
      const mockFile = new File([], 'empty.wav', { type: 'audio/wav' });

      // Act & Assert
      await expect(processFileWithMetrics(mockFile)).rejects.toThrow();
    });

    it('should handle invalid chunk duration', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const options = {
        chunkOptions: {
          chunkDuration: -1, // Invalid
          outputFormat: 'wav' as const,
        },
      };

      // Act & Assert
      await expect(processFileWithMetrics(mockFile, options)).rejects.toThrow();
    });
  });

  describe('Backward compatibility', () => {
    it('should support legacy function signature', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const onProgress = vi.fn();

      // Act - Using old signature
      const result = await processFileWithMetrics(mockFile, onProgress);

      // Assert - Should return old format
      expect(result).not.toHaveProperty('chunks');
      expect(result).toHaveProperty('originalBlob');
      expect(result).toHaveProperty('processedBlob');
    });

    it('should handle both function signatures correctly', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      
      // Act - Test both signatures
      const legacyResult = await processFileWithMetrics(mockFile, vi.fn());
      const newResult = await processFileWithMetrics(mockFile, { 
        chunkOptions: { chunkDuration: 5, outputFormat: 'wav' },
        onProgress: vi.fn(),
      });

      // Assert
      expect(legacyResult).not.toHaveProperty('chunks');
      expect(newResult).toHaveProperty('chunks');
    });
  });
});