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
      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await processFileWithMetrics(arrayBuffer, onProgress);

      // Assert
      expect(result).toHaveProperty('processedBuffer');
      expect(result).toHaveProperty('averageVad');
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
        onFrameProcessed: vi.fn(),
      };

      // Act
      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await processFileWithMetrics(arrayBuffer, options);

      // Assert
      expect(result).toHaveProperty('chunks');
      expect(Array.isArray(result.chunks)).toBe(true);
      expect(options.onFrameProcessed).toHaveBeenCalled();
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
      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await processFileWithMetrics(arrayBuffer, options);

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
          outputFormat: outputFormat as 'wav' | 'webm' | 'raw',
        },
      };

      // Act
      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await processFileWithMetrics(arrayBuffer, options);

      // Assert
      if (result.chunks) {
        result.chunks.forEach(chunk => {
          expect(chunk.blob).toBeDefined();
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
      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await processFileWithMetrics(arrayBuffer, options);

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
      const arrayBuffer = await mockFile.arrayBuffer();
      await processFileWithMetrics(arrayBuffer, onProgress);

      // Assert
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        vad: expect.any(Number),
        frame: expect.any(Number),
        timestamp: expect.any(Number),
        rms: expect.any(Number),
      }));
      
      // Verify VAD values are between 0 and 1
      onProgress.mock.calls.forEach(call => {
        const vad = call[0].vad;
        expect(vad).toBeGreaterThanOrEqual(0);
        expect(vad).toBeLessThanOrEqual(1);
      });
    });

    it('should report different stages during processing', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const onProgress = vi.fn();
      const frames = new Set<number>();

      // Act
      const arrayBuffer = await mockFile.arrayBuffer();
      await processFileWithMetrics(arrayBuffer, onProgress);

      // Assert
      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid file types', async () => {
      // Arrange
      const mockFile = new File(['not audio'], 'test.txt', { type: 'text/plain' });

      // Act & Assert
      const arrayBuffer = await mockFile.arrayBuffer();
      await expect(processFileWithMetrics(arrayBuffer, {})).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      // Arrange
      const mockFile = new File([], 'empty.wav', { type: 'audio/wav' });

      // Act & Assert
      const arrayBuffer = await mockFile.arrayBuffer();
      await expect(processFileWithMetrics(arrayBuffer, {})).rejects.toThrow();
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
      const arrayBuffer = await mockFile.arrayBuffer();
      await expect(processFileWithMetrics(arrayBuffer, options)).rejects.toThrow();
    });
  });

  describe('Backward compatibility', () => {
    it('should support legacy function signature', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const onProgress = vi.fn();

      // Act - Using old signature
      const arrayBuffer = await mockFile.arrayBuffer();
      const result = await processFileWithMetrics(arrayBuffer, onProgress);

      // Assert - Should return old format
      expect(result).toHaveProperty('processedBuffer');
      expect(result).toHaveProperty('averageVad');
      expect(result).toHaveProperty('metrics');
    });

    it('should handle both function signatures correctly', async () => {
      // Arrange
      const mockFile = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      
      // Act - Test both signatures
      const arrayBuffer1 = await mockFile.arrayBuffer();
      // Clone for second use
      const arrayBuffer2 = arrayBuffer1.slice(0);
      const legacyResult = await processFileWithMetrics(arrayBuffer1, vi.fn());
      const newResult = await processFileWithMetrics(arrayBuffer2, { 
        chunkOptions: { chunkDuration: 5, outputFormat: 'wav' },
        onFrameProcessed: vi.fn(),
      });

      // Assert
      expect(legacyResult).toHaveProperty('processedBuffer');
      expect(newResult).toHaveProperty('chunks');
    });
  });
});