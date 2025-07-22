/**
 * TDD Test for ChunkProcessor timing precision
 * Tests the actual ChunkProcessor API
 */

import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { vi } from 'vitest';
import { Logger } from '../../core/Logger';
import { MetricsManager } from '../../managers/MetricsManager';
import { ChunkConfig } from '../../types';

// Mock dependencies
vi.mock('../../core/Logger');
vi.mock('../../managers/MetricsManager');

describe('ChunkProcessor - High Resolution Timing', () => {
  let processor: ChunkProcessor;
  let mockLogger: vi.Mocked<Logger>;
  let mockMetricsManager: vi.Mocked<MetricsManager>;
  let config: ChunkConfig;
  let chunkProcessedCallback: vi.Mock;

  beforeEach(() => {
    // Create mocks
    mockLogger = new Logger('test') as vi.Mocked<Logger>;
    mockMetricsManager = new MetricsManager(mockLogger) as vi.Mocked<MetricsManager>;
    
    // Mock metrics calculations
    mockMetricsManager.calculateRMS = vi.fn().mockReturnValue(0.5);
    mockMetricsManager.calculatePeak = vi.fn().mockReturnValue(0.8);
    mockMetricsManager.recordChunk = vi.fn();

    chunkProcessedCallback = vi.fn();
    config = {
      chunkDuration: 100, // 100ms chunks
      onChunkProcessed: chunkProcessedCallback,
      overlap: 0
    };

    processor = new ChunkProcessor(
      48000, // sample rate
      config,
      mockLogger,
      mockMetricsManager
    );
  });

  describe('Processing Latency Precision', () => {
    it('should never show 0.00ms for actual processing', (done) => {
      // Listen for chunk-processed event
      processor.on('chunk-processed', (metrics) => {
        // The latency should be greater than 0
        expect(metrics.metrics.processingLatency).toBeGreaterThan(0);
        expect(metrics.metrics.processingLatency.toFixed(2)).not.toBe('0.00');
        done();
      });

      // Process some audio data
      const audioData = new Float32Array(480); // 10ms of audio at 48kHz
      
      // Process multiple times to fill a chunk
      for (let i = 0; i < 10; i++) {
        processor.processAudio(audioData);
      }
    });

    it('should use high-resolution timing if available', (done) => {
      // Track processing latencies
      const latencies: number[] = [];
      
      processor.on('chunk-processed', (metrics) => {
        latencies.push(metrics.metrics.processingLatency);
        
        if (latencies.length === 3) {
          // Check that we have different latency values (not all the same)
          const uniqueLatencies = new Set(latencies);
          expect(uniqueLatencies.size).toBeGreaterThan(1);
          
          // All should be greater than 0
          latencies.forEach(latency => {
            expect(latency).toBeGreaterThan(0);
          });
          
          done();
        }
      });

      // Process multiple chunks
      const audioData = new Float32Array(4800); // 100ms at 48kHz
      processor.processAudio(audioData);
      
      setTimeout(() => {
        processor.processAudio(audioData);
      }, 10);
      
      setTimeout(() => {
        processor.processAudio(audioData);
      }, 20);
    });

    it('should show microsecond precision when using performance.now()', (done) => {
      // Mock performance.now to return precise values
      const originalPerformanceNow = global.performance.now;
      let callCount = 0;
      
      global.performance.now = vi.fn(() => {
        // Return incrementing microsecond values
        return 1000 + (callCount++ * 0.123);
      });

      processor.on('chunk-processed', (metrics) => {
        // Should have sub-millisecond precision
        const latencyStr = metrics.metrics.processingLatency.toString();
        const decimalPlaces = (latencyStr.split('.')[1] || '').length;
        
        // Should have decimal values (not just whole milliseconds)
        expect(decimalPlaces).toBeGreaterThan(0);
        
        // Restore original
        global.performance.now = originalPerformanceNow;
        done();
      });

      const audioData = new Float32Array(4800);
      processor.processAudio(audioData);
    });
  });

  describe('Real-world Timing Validation', () => {
    it('should show realistic processing times for audio chunks', (done) => {
      const processingTimes: number[] = [];
      
      processor.on('chunk-processed', (metrics) => {
        processingTimes.push(metrics.metrics.processingLatency);
        
        if (processingTimes.length === 5) {
          // All processing times should be realistic (0.001ms to 1000ms)
          processingTimes.forEach(time => {
            expect(time).toBeGreaterThan(0.001);
            expect(time).toBeLessThan(1000);
          });
          
          done();
        }
      });

      // Process 5 chunks
      const audioData = new Float32Array(4800);
      for (let i = 0; i < 5; i++) {
        processor.processAudio(audioData);
      }
    });
  });
});