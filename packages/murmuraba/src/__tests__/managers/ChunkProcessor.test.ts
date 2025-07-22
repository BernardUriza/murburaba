import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { Logger } from '../../core/Logger';
import { MetricsManager } from '../../managers/MetricsManager';
import { ChunkConfig } from '../../types';

describe('ChunkProcessor', () => {
  let chunkProcessor: ChunkProcessor;
  let mockLogger: jest.Mocked<Logger>;
  let mockMetricsManager: jest.Mocked<MetricsManager>;
  const sampleRate = 48000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
      setLogHandler: jest.fn()
    } as any;
    
    // Create mock metrics manager
    mockMetricsManager = {
      recordChunk: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({
        noiseReductionLevel: 0,
        processingLatency: 0,
        inputLevel: 0,
        outputLevel: 0,
        timestamp: Date.now(),
        frameCount: 0,
        droppedFrames: 0
      }),
      calculateRMS: jest.fn().mockImplementation((samples: Float32Array) => {
        // Simple RMS calculation
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
      }),
      calculatePeak: jest.fn().mockImplementation((samples: Float32Array) => {
        let peak = 0;
        for (let i = 0; i < samples.length; i++) {
          peak = Math.max(peak, Math.abs(samples[i]));
        }
        return peak;
      })
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with basic config', () => {
      const config: ChunkConfig = {
        chunkDuration: 5000, // 5 seconds
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ChunkProcessor initialized:',
        expect.objectContaining({
          sampleRate: 48000,
          chunkDuration: 5000,
          samplesPerChunk: 240000, // 5s * 48000
          overlap: 0
        })
      );
    });

    it('should initialize with overlap', () => {
      const config: ChunkConfig = {
        chunkDuration: 1000,
        overlap: 0.1 // 10% overlap
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ChunkProcessor initialized:',
        expect.objectContaining({
          overlap: 0.1
        })
      );
    });
  });

  describe('addSamples()', () => {
    let chunkCallback: jest.Mock;

    beforeEach(() => {
      chunkCallback = jest.fn();
      const config: ChunkConfig = {
        chunkDuration: 1000, // 1 second = 48000 samples
        onChunkProcessed: chunkCallback
      };
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
    });

    it('should accumulate samples', () => {
      const samples = new Float32Array(1000);
      chunkProcessor.addSamples(samples);
      
      // Should not emit chunk yet
      expect(chunkCallback).not.toHaveBeenCalled();
    });

    it('should initialize start time on first sample', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      // Force chunkStartTime to be 0
      chunkProcessor['chunkStartTime'] = 0;
      
      const samples = new Float32Array(100);
      chunkProcessor.addSamples(samples);
      
      // Should set start time
      expect(chunkProcessor['chunkStartTime']).toBeGreaterThan(0);
      expect(chunkProcessor['chunkStartTime']).toBeCloseTo(now, -2); // Within 100ms
    });

    it('should emit chunk when threshold reached', () => {
      const samplesPerChunk = 48000; // 1 second
      const samples = new Float32Array(samplesPerChunk);
      
      let chunkEmitted = false;
      chunkProcessor.on('chunk-ready', () => {
        chunkEmitted = true;
      });
      
      chunkProcessor.addSamples(samples);
      
      expect(chunkEmitted).toBe(true);
      expect(chunkCallback).toHaveBeenCalled();
    });

    it('should handle multiple chunks in one call', () => {
      const samplesPerChunk = 48000;
      const samples = new Float32Array(samplesPerChunk * 2.5); // 2.5 chunks
      
      chunkProcessor.addSamples(samples);
      
      // Should emit 2 chunks, keep 0.5 for next
      expect(chunkCallback).toHaveBeenCalledTimes(2);
    });

    it('should accumulate across multiple calls', () => {
      const samples1 = new Float32Array(20000);
      const samples2 = new Float32Array(20000);
      const samples3 = new Float32Array(10000); // Total: 50000 > 48000
      
      chunkProcessor.addSamples(samples1);
      chunkProcessor.addSamples(samples2);
      expect(chunkCallback).not.toHaveBeenCalled();
      
      chunkProcessor.addSamples(samples3);
      expect(chunkCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overlap handling', () => {
    it('should apply overlap between chunks', () => {
      const config: ChunkConfig = {
        chunkDuration: 100, // 100ms = 4800 samples
        overlap: 0.1, // 10% = 480 samples
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      let emittedChunks: any[] = [];
      chunkProcessor.on('chunk-ready', (chunk) => {
        emittedChunks.push(chunk);
      });
      
      // Add enough for 2 chunks
      const samples = new Float32Array(10000);
      chunkProcessor.addSamples(samples);
      
      expect(emittedChunks.length).toBe(2);
      
      // Second chunk should include overlap from first
      expect(emittedChunks[1].data.length).toBeGreaterThan(0);
    });
  });

  describe('flush()', () => {
    it('should flush partial chunk', () => {
      const config: ChunkConfig = {
        chunkDuration: 1000,
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      // Add partial chunk
      const samples = new Float32Array(10000); // Less than 48000
      chunkProcessor.addSamples(samples);
      
      expect(config.onChunkProcessed).not.toHaveBeenCalled();
      
      // Force flush
      chunkProcessor.flush();
      
      // flush() pads with silence to complete the chunk size
      expect(config.onChunkProcessed).toHaveBeenCalledWith(
        expect.objectContaining({
          originalSize: 48000 * 4, // Full chunk size after padding
          duration: 1000
        })
      );
    });

    it('should handle empty flush', () => {
      const config: ChunkConfig = {
        chunkDuration: 1000,
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      chunkProcessor.flush();
      
      expect(config.onChunkProcessed).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('ChunkProcessor reset');
    });
  });

  describe('reset()', () => {
    it('should clear all buffers', () => {
      const config: ChunkConfig = {
        chunkDuration: 1000,
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      // Add some samples
      const samples = new Float32Array(10000);
      chunkProcessor.addSamples(samples);
      
      // Reset
      chunkProcessor.reset();
      
      // Force flush should do nothing
      chunkProcessor.flush();
      expect(config.onChunkProcessed).not.toHaveBeenCalled();
    });
  });

  describe('Metrics tracking', () => {
    it('should record chunk metrics', () => {
      const config: ChunkConfig = {
        chunkDuration: 1000,
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      const samples = new Float32Array(48000);
      chunkProcessor.addSamples(samples);
      
      expect(mockMetricsManager.recordChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          originalSize: 48000 * 4,
          duration: 1000,
          startTime: expect.any(Number),
          endTime: expect.any(Number)
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle errors in onChunkProcessed callback', () => {
      const config: ChunkConfig = {
        chunkDuration: 100, // 4800 samples
        onChunkProcessed: jest.fn().mockImplementation(() => {
          throw new Error('Callback error');
        })
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      const samples = new Float32Array(5000);
      
      // Should not throw, just log error
      expect(() => chunkProcessor.addSamples(samples)).not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in chunk processed callback:',
        expect.any(Error)
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle very small chunks', () => {
      const config: ChunkConfig = {
        chunkDuration: 10, // 10ms = 480 samples
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      const samples = new Float32Array(500);
      chunkProcessor.addSamples(samples);
      
      expect(config.onChunkProcessed).toHaveBeenCalledTimes(1);
    });

    it('should handle fractional sample calculations', () => {
      const config: ChunkConfig = {
        chunkDuration: 33, // 33ms = 1584 samples
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(44100, config, mockLogger, mockMetricsManager);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ChunkProcessor initialized:',
        expect.objectContaining({
          samplesPerChunk: 1455 // Math.floor(33/1000 * 44100)
        })
      );
    });
  });

  describe('Stream processing', () => {
    it('should process continuous stream', () => {
      const config: ChunkConfig = {
        chunkDuration: 100,
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      // Simulate continuous stream
      for (let i = 0; i < 10; i++) {
        const samples = new Float32Array(1000);
        chunkProcessor.addSamples(samples);
        jest.advanceTimersByTime(20);
      }
      
      // Should have processed 2 chunks (10000 samples / 4800 samples per chunk)
      expect(config.onChunkProcessed).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStatus()', () => {
    it('should return current status', () => {
      const config: ChunkConfig = {
        chunkDuration: 1000, // 48000 samples
        onChunkProcessed: jest.fn()
      };
      
      chunkProcessor = new ChunkProcessor(sampleRate, config, mockLogger, mockMetricsManager);
      
      // Initial status
      let status = chunkProcessor.getStatus();
      expect(status).toEqual({
        currentSampleCount: 0,
        samplesPerChunk: 48000,
        chunkIndex: 0,
        bufferFillPercentage: 0
      });
      
      // Add some samples
      const samples = new Float32Array(24000); // 50%
      chunkProcessor.addSamples(samples);
      
      status = chunkProcessor.getStatus();
      expect(status.currentSampleCount).toBe(24000);
      expect(status.bufferFillPercentage).toBe(50);
      
      // Add more to trigger chunk
      chunkProcessor.addSamples(samples); // Now 100%
      
      status = chunkProcessor.getStatus();
      expect(status.currentSampleCount).toBe(0); // Reset after chunk
      expect(status.chunkIndex).toBe(1);
    });
  });
});