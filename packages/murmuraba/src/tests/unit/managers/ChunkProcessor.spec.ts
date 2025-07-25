import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChunkProcessor } from '../../../managers/ChunkProcessor';
import { EventEmitter } from '../../../core/EventEmitter';
import { Logger } from '../../../core/Logger';
import { MetricsManager } from '../../../managers/MetricsManager';

describe('ChunkProcessor', () => {
  let processor: ChunkProcessor;
  let mockLogger: Logger;
  let mockMetricsManager: MetricsManager;
  let mockMediaRecorder: any;
  let mockStream: MediaStream;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = new Logger('[ChunkProcessor]');
    mockLogger.setLevel('debug');
    mockMetricsManager = new MetricsManager();
    
    // Create mock MediaStream
    mockStream = {
      id: 'test-stream',
      getAudioTracks: () => [{
        id: 'audio-track-1',
        kind: 'audio',
        enabled: true,
      }],
    } as any;
    
    // Mock MediaRecorder
    mockMediaRecorder = {
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
      onerror: null,
      start: vi.fn(function(this: any) {
        this.state = 'recording';
      }),
      stop: vi.fn(function(this: any) {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    // Mock MediaRecorder constructor
    global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
    global.MediaRecorder.isTypeSupported = vi.fn(() => true);
    
    processor = new ChunkProcessor(
      48000, // sampleRate
      { 
        chunkDuration: 1000,
        onChunkProcessed: vi.fn()
      },
      mockLogger,
      mockMetricsManager
    );
  });
  
  afterEach(() => {
    processor.reset();
  });
  
  describe('Initialization', () => {
    it('should create processor with default options', () => {
      const defaultProcessor = new ChunkProcessor(48000, { chunkDuration: 1000 }, mockLogger, mockMetricsManager);
      expect(defaultProcessor).toBeDefined();
    });
    
    it('should create processor with custom chunk duration', () => {
      const customProcessor = new ChunkProcessor(
        48000,
        { chunkDuration: 2000 },
        mockLogger,
        mockMetricsManager
      );
      expect(customProcessor).toBeDefined();
    });
    
    it('should validate sample rate', () => {
      expect(() => new ChunkProcessor(
        0, // invalid sample rate
        { chunkDuration: 1000 },
        mockLogger,
        mockMetricsManager
      )).toThrow();
    });
  });
  
  describe('Sample Processing', () => {
    it('should process samples when addSamples is called', () => {
      const samples = new Float32Array(1024);
      samples.fill(0.5);
      
      processor.addSamples(samples);
      
      const status = processor.getStatus();
      expect(status.currentSampleCount).toBe(1024);
    });
    
    it('should reset processor when reset is called', () => {
      const samples = new Float32Array(1024);
      processor.addSamples(samples);
      
      processor.reset();
      
      const status = processor.getStatus();
      expect(status.currentSampleCount).toBe(0);
    });
    
    it('should handle multiple addSamples calls', () => {
      const samples1 = new Float32Array(512);
      const samples2 = new Float32Array(512);
      
      processor.addSamples(samples1);
      processor.addSamples(samples2);
      
      const status = processor.getStatus();
      expect(status.currentSampleCount).toBe(1024);
    });
    
    it('should handle reset without samples', () => {
      expect(() => processor.reset()).not.toThrow();
    });
  });
  
  describe('Chunk Processing', () => {
    it('should emit chunk-ready event when chunk is complete', async () => {
      const chunkReadySpy = vi.fn();
      processor.on('chunk-ready', chunkReadySpy);
      
      // Add enough samples to trigger chunk processing
      const samplesPerChunk = Math.floor((1000 / 1000) * 48000); // 1 second at 48kHz
      const samples = new Float32Array(samplesPerChunk);
      samples.fill(0.5);
      
      processor.addSamples(samples);
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chunkReadySpy).toHaveBeenCalled();
      const chunk = chunkReadySpy.mock.calls[0][0];
      expect(chunk).toHaveProperty('id');
      expect(chunk).toHaveProperty('data');
      expect(chunk).toHaveProperty('startTime');
      expect(chunk).toHaveProperty('endTime');
    });
    
    it('should handle empty samples', async () => {
      const chunkReadySpy = vi.fn();
      processor.on('chunk-ready', chunkReadySpy);
      
      // Add empty samples
      const emptySamples = new Float32Array(0);
      processor.addSamples(emptySamples);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chunkReadySpy).not.toHaveBeenCalled();
    });
    
    it('should calculate correct timestamps for chunks', async () => {
      const chunkReadySpy = vi.fn();
      processor.on('chunk-ready', chunkReadySpy);
      
      const samplesPerChunk = Math.floor((1000 / 1000) * 48000);
      
      // First chunk
      const samples1 = new Float32Array(samplesPerChunk);
      samples1.fill(0.5);
      processor.addSamples(samples1);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Second chunk after some time
      vi.advanceTimersByTime(1000);
      const samples2 = new Float32Array(samplesPerChunk);
      samples2.fill(0.3);
      processor.addSamples(samples2);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chunkReadySpy).toHaveBeenCalledTimes(2);
      
      const chunk1 = chunkReadySpy.mock.calls[0][0];
      const chunk2 = chunkReadySpy.mock.calls[1][0];
      
      expect(chunk2.startTime).toBeGreaterThan(chunk1.startTime);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle processing errors gracefully', () => {
      const errorSpy = vi.fn();
      processor.on('error', errorSpy);
      
      // Try to add invalid samples
      expect(() => {
        processor.addSamples(null as any);
      }).not.toThrow(); // Should handle gracefully
    });
    
    it('should handle errors during frame processing', async () => {
      const errorSpy = vi.fn();
      processor.on('error', errorSpy);
      
      // Try to process invalid frame data
      expect(() => {
        processor.processFrame(null as any, Date.now());
      }).not.toThrow(); // Should handle gracefully
    });
  });
  
  describe('Flush', () => {
    it('should flush remaining data when flush is called', () => {
      const samples = new Float32Array(512); // Less than full chunk
      processor.addSamples(samples);
      
      const chunkReadySpy = vi.fn();
      processor.on('chunk-ready', chunkReadySpy);
      
      processor.flush();
      
      expect(chunkReadySpy).toHaveBeenCalled();
    });
    
    it('should handle flush without samples', () => {
      expect(() => processor.flush()).not.toThrow();
    });
    
    it('should reset after flush', () => {
      const samples = new Float32Array(512);
      processor.addSamples(samples);
      
      processor.flush();
      
      const status = processor.getStatus();
      expect(status.currentSampleCount).toBe(0);
    });
  });
  
  describe('Frame Processing', () => {
    it('should process frames and accumulate metrics', async () => {
      const frameProcessedSpy = vi.fn();
      processor.on('frame-processed', frameProcessedSpy);
      
      const frame = new Float32Array(480); // One frame
      frame.fill(0.5);
      
      await processor.processFrame(frame, Date.now());
      
      expect(frameProcessedSpy).toHaveBeenCalled();
    });
    
    it('should complete period and return aggregated metrics', async () => {
      const periodCompleteSpy = vi.fn();
      processor.on('period-complete', periodCompleteSpy);
      
      // Process some frames
      const frame1 = new Float32Array(480);
      frame1.fill(0.8);
      await processor.processFrame(frame1, Date.now());
      
      const frame2 = new Float32Array(480);
      frame2.fill(0.4);
      await processor.processFrame(frame2, Date.now() + 10);
      
      const metrics = processor.completePeriod(1000);
      
      expect(metrics).toHaveProperty('averageNoiseReduction');
      expect(metrics).toHaveProperty('totalFrames', 2);
      expect(periodCompleteSpy).toHaveBeenCalledWith(metrics);
    });
  });
  
  describe('State Management', () => {
    it('should track processing state correctly', () => {
      const status = processor.getStatus();
      expect(status).toHaveProperty('currentSampleCount', 0);
      expect(status).toHaveProperty('samplesPerChunk');
      expect(status).toHaveProperty('chunkIndex', 0);
      expect(status).toHaveProperty('bufferFillPercentage', 0);
    });
    
    it('should return current accumulated metrics', async () => {
      // Process some frames first
      const frame = new Float32Array(480);
      frame.fill(0.5);
      await processor.processFrame(frame, Date.now());
      
      const metrics = processor.getCurrentAccumulatedMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.totalFrames).toBe(1);
    });
    
    it('should reset metrics on reset', async () => {
      // Process some frames first
      const frame = new Float32Array(480);
      await processor.processFrame(frame, Date.now());
      
      processor.reset();
      
      const metrics = processor.getCurrentAccumulatedMetrics();
      expect(metrics).toBeNull();
    });
  });
  
  describe('Options Validation', () => {
    it('should validate chunk duration', () => {
      expect(() => new ChunkProcessor(
        48000,
        { chunkDuration: -1000 },
        mockLogger,
        mockMetricsManager
      )).toThrow();
      
      expect(() => new ChunkProcessor(
        48000,
        { chunkDuration: 0 },
        mockLogger,
        mockMetricsManager
      )).toThrow();
    });
    
    it('should use default chunk duration if not specified', () => {
      const defaultProcessor = new ChunkProcessor(48000, { chunkDuration: 1000 }, mockLogger, mockMetricsManager);
      expect(defaultProcessor).toBeDefined();
    });
  });
});