import { MetricsManager } from '../../managers/MetricsManager';
import { ProcessingMetrics, ChunkMetrics } from '../../types';

describe('MetricsManager', () => {
  let metricsManager: MetricsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    metricsManager = new MetricsManager();
  });

  afterEach(() => {
    metricsManager.stopAutoUpdate();
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('should start with default metrics', () => {
      const metrics = metricsManager.getMetrics();
      
      expect(metrics).toMatchObject({
        noiseReductionLevel: 0,
        processingLatency: 0,
        inputLevel: 0,
        outputLevel: 0,
        frameCount: 0,
        droppedFrames: 0
      });
      expect(metrics.timestamp).toBeGreaterThan(0);
    });
  });

  describe('startAutoUpdate() / stopAutoUpdate()', () => {
    it('should emit metrics updates at intervals', () => {
      const callback = jest.fn();
      metricsManager.on('metrics-update', callback);
      
      metricsManager.startAutoUpdate(100);
      
      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        noiseReductionLevel: 0,
        processingLatency: 0
      }));
      
      jest.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should stop auto updates', () => {
      const callback = jest.fn();
      metricsManager.on('metrics-update', callback);
      
      metricsManager.startAutoUpdate(100);
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      
      metricsManager.stopAutoUpdate();
      jest.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1); // No more calls
    });

    it('should handle multiple start calls', () => {
      const callback = jest.fn();
      metricsManager.on('metrics-update', callback);
      
      metricsManager.startAutoUpdate(100);
      metricsManager.startAutoUpdate(50); // Should clear previous interval
      
      jest.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should use default interval', () => {
      const callback = jest.fn();
      metricsManager.on('metrics-update', callback);
      
      metricsManager.startAutoUpdate(); // Default 100ms
      
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Level updates', () => {
    it('should update input level with clamping', () => {
      metricsManager.updateInputLevel(0.5);
      expect(metricsManager.getMetrics().inputLevel).toBe(0.5);
      
      metricsManager.updateInputLevel(1.5);
      expect(metricsManager.getMetrics().inputLevel).toBe(1);
      
      metricsManager.updateInputLevel(-0.5);
      expect(metricsManager.getMetrics().inputLevel).toBe(0);
    });

    it('should update output level with clamping', () => {
      metricsManager.updateOutputLevel(0.75);
      expect(metricsManager.getMetrics().outputLevel).toBe(0.75);
      
      metricsManager.updateOutputLevel(2);
      expect(metricsManager.getMetrics().outputLevel).toBe(1);
      
      metricsManager.updateOutputLevel(-1);
      expect(metricsManager.getMetrics().outputLevel).toBe(0);
    });

    it('should update noise reduction level with clamping', () => {
      metricsManager.updateNoiseReduction(50);
      expect(metricsManager.getMetrics().noiseReductionLevel).toBe(50);
      
      metricsManager.updateNoiseReduction(150);
      expect(metricsManager.getMetrics().noiseReductionLevel).toBe(100);
      
      metricsManager.updateNoiseReduction(-10);
      expect(metricsManager.getMetrics().noiseReductionLevel).toBe(0);
    });
  });

  describe('Frame tracking', () => {
    it('should record frames', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      metricsManager.recordFrame();
      
      const metrics = metricsManager.getMetrics();
      expect(metrics.frameCount).toBe(1);
      expect(metrics.timestamp).toBe(now);
    });

    it('should record frames with custom timestamp', () => {
      const customTime = 123456;
      metricsManager.recordFrame(customTime);
      
      const metrics = metricsManager.getMetrics();
      expect(metrics.frameCount).toBe(1);
      expect(metrics.timestamp).toBe(customTime);
    });

    it('should limit frame history', () => {
      // Record more than maxFrameHistory (100)
      for (let i = 0; i < 150; i++) {
        metricsManager.recordFrame(i);
      }
      
      // Should only keep last 100
      const metrics = metricsManager.getMetrics();
      expect(metrics.frameCount).toBe(150);
      
      // Internal frameTimestamps should be limited
      // We'll verify this through latency calculation
      metricsManager['calculateLatency']();
      expect(metricsManager.getMetrics().processingLatency).toBe(1); // Consistent 1ms between frames
    });

    it('should record dropped frames', () => {
      metricsManager.recordDroppedFrame();
      metricsManager.recordDroppedFrame();
      metricsManager.recordDroppedFrame();
      
      expect(metricsManager.getMetrics().droppedFrames).toBe(3);
    });
  });

  describe('Chunk processing', () => {
    it('should emit chunk events', () => {
      const callback = jest.fn();
      metricsManager.on('chunk-processed', callback);
      
      const chunk: ChunkMetrics = {
        originalSize: 480000,
        processedSize: 460000,
        noiseRemoved: 20000,
        metrics: metricsManager.getMetrics(),
        duration: 5000,
        startTime: Date.now(),
        endTime: Date.now() + 5000
      };
      
      metricsManager.recordChunk(chunk);
      
      expect(callback).toHaveBeenCalledWith(chunk);
    });
  });

  describe('Latency calculation', () => {
    it('should calculate average latency', () => {
      // Record frames with known intervals
      metricsManager.recordFrame(1000);
      metricsManager.recordFrame(1010); // 10ms
      metricsManager.recordFrame(1025); // 15ms
      metricsManager.recordFrame(1035); // 10ms
      
      // Trigger latency calculation
      metricsManager['calculateLatency']();
      
      // Average: (10 + 15 + 10) / 3 = 11.67
      expect(metricsManager.getMetrics().processingLatency).toBeCloseTo(11.67, 1);
    });

    it('should handle insufficient data', () => {
      metricsManager.recordFrame(1000);
      
      metricsManager['calculateLatency']();
      
      expect(metricsManager.getMetrics().processingLatency).toBe(0);
    });

    it('should update latency during auto-update', () => {
      const callback = jest.fn();
      metricsManager.on('metrics-update', callback);
      
      // Record some frames
      metricsManager.recordFrame(1000);
      metricsManager.recordFrame(1020);
      metricsManager.recordFrame(1030);
      
      metricsManager.startAutoUpdate(100);
      jest.advanceTimersByTime(100);
      
      const emittedMetrics = callback.mock.calls[0][0];
      expect(emittedMetrics.processingLatency).toBeGreaterThan(0);
    });
  });

  describe('reset()', () => {
    it('should reset all metrics', () => {
      // Set up some data
      metricsManager.updateInputLevel(0.8);
      metricsManager.updateOutputLevel(0.6);
      metricsManager.updateNoiseReduction(75);
      metricsManager.recordFrame();
      metricsManager.recordDroppedFrame();
      
      const beforeReset = metricsManager.getMetrics();
      expect(beforeReset.inputLevel).toBe(0.8);
      expect(beforeReset.frameCount).toBe(1);
      
      metricsManager.reset();
      
      const afterReset = metricsManager.getMetrics();
      expect(afterReset).toMatchObject({
        noiseReductionLevel: 0,
        processingLatency: 0,
        inputLevel: 0,
        outputLevel: 0,
        frameCount: 0,
        droppedFrames: 0
      });
    });
  });

  describe('Audio calculations', () => {
    it('should calculate RMS', () => {
      const samples = new Float32Array([0.5, -0.5, 0.5, -0.5]);
      const rms = metricsManager.calculateRMS(samples);
      
      // RMS = sqrt((0.25 + 0.25 + 0.25 + 0.25) / 4) = sqrt(0.25) = 0.5
      expect(rms).toBe(0.5);
    });

    it('should calculate RMS for silent audio', () => {
      const samples = new Float32Array(100); // All zeros
      const rms = metricsManager.calculateRMS(samples);
      
      expect(rms).toBe(0);
    });

    it('should calculate peak', () => {
      const samples = new Float32Array([0.1, -0.8, 0.3, -0.5, 0.9]);
      const peak = metricsManager.calculatePeak(samples);
      
      expect(peak).toBe(0.9);
    });

    it('should calculate peak for negative values', () => {
      const samples = new Float32Array([0.1, -0.95, 0.3, -0.5]);
      const peak = metricsManager.calculatePeak(samples);
      
      expect(peak).toBe(0.95);
    });
  });

  describe('getMetrics()', () => {
    it('should return a copy of metrics', () => {
      metricsManager.updateInputLevel(0.5);
      
      const metrics1 = metricsManager.getMetrics();
      const metrics2 = metricsManager.getMetrics();
      
      expect(metrics1).not.toBe(metrics2); // Different objects
      expect(metrics1).toEqual(metrics2); // Same values
      
      metrics1.inputLevel = 0.9;
      expect(metricsManager.getMetrics().inputLevel).toBe(0.5); // Original unchanged
    });
  });
});