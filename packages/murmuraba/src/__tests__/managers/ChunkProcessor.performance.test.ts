/**
 * TDD Tests for ChunkProcessor Performance Timing
 * Problem: Processing time shows 0.00ms due to Date.now() low resolution
 * Solution: Use performance.now() for microsecond precision
 */

import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { vi } from 'vitest';
import { ChunkMetrics } from '../../types';

// Mock performance.now for predictable tests
const mockPerformanceNow = vi.fn();
global.performance.now = mockPerformanceNow;

// Mock api
vi.mock('../../api', () => ({
  getEngine: vi.fn(),
}));

describe('ChunkProcessor - Performance Timing TDD', () => {
  let processor: ChunkProcessor;
  
  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ChunkProcessor();
    
    // Reset performance.now mock
    mockPerformanceNow.mockReset();
  });

  describe('Processing Time Measurement', () => {
    it('should capture processing time with microsecond precision', () => {
      // Setup performance.now to return predictable values
      mockPerformanceNow
        .mockReturnValueOnce(1000.123) // Start time
        .mockReturnValueOnce(1002.456); // End time
      
      processor.start();
      const chunk = processor.end();
      
      // Should have ~2.333ms processing time
      expect(chunk.metrics.processingLatency).toBeCloseTo(2.333, 2);
      expect(chunk.metrics.processingLatency).not.toBe(0);
    });

    it('should handle sub-millisecond processing times', () => {
      // Simulate very fast processing (0.1ms)
      mockPerformanceNow
        .mockReturnValueOnce(5000.000)
        .mockReturnValueOnce(5000.100);
      
      processor.start();
      const chunk = processor.end();
      
      // Should capture 0.1ms, not round to 0
      expect(chunk.metrics.processingLatency).toBe(0.1);
      expect(chunk.metrics.processingLatency).toBeGreaterThan(0);
    });

    it('should never show 0.00ms for non-zero processing time', () => {
      // Even the smallest measurable time
      mockPerformanceNow
        .mockReturnValueOnce(1000.000)
        .mockReturnValueOnce(1000.001); // 1 microsecond
      
      processor.start();
      const chunk = processor.end();
      
      expect(chunk.metrics.processingLatency).toBeGreaterThan(0);
      expect(chunk.metrics.processingLatency.toFixed(2)).not.toBe('0.00');
    });

    it('should maintain backward compatibility with existing metrics', () => {
      mockPerformanceNow
        .mockReturnValueOnce(2000.500)
        .mockReturnValueOnce(2010.750);
      
      processor.start();
      processor.process(new Float32Array(100));
      const chunk = processor.end();
      
      // Should have all expected metrics
      expect(chunk.metrics).toMatchObject({
        processingLatency: expect.any(Number),
        frameCount: expect.any(Number),
        inputLevel: expect.any(Number),
        outputLevel: expect.any(Number),
        noiseReductionLevel: expect.any(Number),
        timestamp: expect.any(Number),
        droppedFrames: expect.any(Number),
      });
      
      // Processing latency should be ~10.25ms
      expect(chunk.metrics.processingLatency).toBeCloseTo(10.25, 2);
    });

    it('should handle performance.now() wrap-around gracefully', () => {
      // performance.now() can theoretically wrap around
      mockPerformanceNow
        .mockReturnValueOnce(Number.MAX_SAFE_INTEGER - 1)
        .mockReturnValueOnce(10); // Wrapped around
      
      processor.start();
      const chunk = processor.end();
      
      // Should handle gracefully, not show negative time
      expect(chunk.metrics.processingLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Real-world Timing Scenarios', () => {
    it('should accurately measure typical audio processing times', () => {
      // Simulate realistic processing times (5-50ms range)
      const testCases = [
        { start: 1000, end: 1005.5, expected: 5.5 },    // 5.5ms
        { start: 2000, end: 2015.25, expected: 15.25 }, // 15.25ms
        { start: 3000, end: 3032.8, expected: 32.8 },   // 32.8ms
        { start: 4000, end: 4048.123, expected: 48.123 } // 48.123ms
      ];
      
      testCases.forEach(({ start, end, expected }) => {
        mockPerformanceNow
          .mockReturnValueOnce(start)
          .mockReturnValueOnce(end);
        
        processor.start();
        const chunk = processor.end();
        
        expect(chunk.metrics.processingLatency).toBeCloseTo(expected, 3);
      });
    });

    it('should show realistic times for chunked audio processing', () => {
      // Mock a series of process() calls
      mockPerformanceNow
        .mockReturnValueOnce(0)      // start
        .mockReturnValueOnce(0.5)    // first process
        .mockReturnValueOnce(1.2)    // second process
        .mockReturnValueOnce(2.1)    // third process
        .mockReturnValueOnce(3.7);   // end
      
      processor.start();
      
      // Simulate multiple audio chunks
      processor.process(new Float32Array(1024));
      processor.process(new Float32Array(1024));
      processor.process(new Float32Array(1024));
      
      const chunk = processor.end();
      
      // Total time should be 3.7ms
      expect(chunk.metrics.processingLatency).toBe(3.7);
    });
  });

  describe('Display Formatting', () => {
    it('should format sub-millisecond times correctly', () => {
      const testCases = [
        { latency: 0.001, display: '0.00' },   // 1 microsecond -> 0.00ms
        { latency: 0.01, display: '0.01' },    // 10 microseconds
        { latency: 0.1, display: '0.10' },     // 100 microseconds
        { latency: 0.123, display: '0.12' },   // 123 microseconds
        { latency: 1.567, display: '1.57' },   // 1.567ms
        { latency: 10.999, display: '11.00' }, // Rounds up
      ];
      
      testCases.forEach(({ latency, display }) => {
        const formatted = latency.toFixed(2);
        expect(formatted).toBe(display);
      });
    });
  });
});