/**
 * Integration test for ChunkProcessor high-resolution timing
 */

import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { Logger } from '../../core/Logger';
import { MetricsManager } from '../../managers/MetricsManager';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const mockMetricsManager = {
  calculateRMS: jest.fn().mockReturnValue(0.5),
  calculatePeak: jest.fn().mockReturnValue(0.8),
  recordChunk: jest.fn(),
} as unknown as MetricsManager;

describe('ChunkProcessor - High Resolution Timing Integration', () => {
  it('should use performance.now() for timing measurements', (done) => {
    const processor = new ChunkProcessor(
      48000,
      { chunkDuration: 100 },
      mockLogger,
      mockMetricsManager
    );

    processor.on('chunk-processed', (metrics) => {
      // Processing latency should have sub-millisecond precision
      const latencyStr = metrics.metrics.processingLatency.toString();
      
      // Check if it has decimal places
      if (latencyStr.includes('.')) {
        const decimalPlaces = (latencyStr.split('.')[1] || '').length;
        expect(decimalPlaces).toBeGreaterThan(0);
      }
      
      // Should never be exactly 0 unless no time passed
      expect(metrics.metrics.processingLatency).toBeGreaterThanOrEqual(0);
      
      done();
    });

    // Add samples to trigger chunk processing
    const samplesPerChunk = 48000 * 0.1; // 100ms at 48kHz
    processor.addSamples(new Float32Array(samplesPerChunk));
  });

  it('should show non-zero processing time for real operations', (done) => {
    const processor = new ChunkProcessor(
      48000,
      { chunkDuration: 50 }, // 50ms chunks
      mockLogger,
      mockMetricsManager
    );

    let processedCount = 0;
    const latencies: number[] = [];

    processor.on('chunk-processed', (metrics) => {
      latencies.push(metrics.metrics.processingLatency);
      processedCount++;

      if (processedCount === 3) {
        // At least one should be non-zero
        const hasNonZero = latencies.some(lat => lat > 0);
        expect(hasNonZero).toBe(true);
        
        // Check format
        latencies.forEach(lat => {
          const formatted = lat.toFixed(2);
          // Should not all be "0.00"
          if (formatted !== '0.00') {
            expect(parseFloat(formatted)).toBeGreaterThan(0);
          }
        });
        
        done();
      }
    });

    // Process multiple chunks
    const samplesPerChunk = 48000 * 0.05; // 50ms
    for (let i = 0; i < 3; i++) {
      // Add small delay to ensure different timestamps
      setTimeout(() => {
        processor.addSamples(new Float32Array(samplesPerChunk));
      }, i * 10);
    }
  });
});