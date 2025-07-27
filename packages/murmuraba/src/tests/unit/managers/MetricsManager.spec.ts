import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MetricsManager } from '../../../managers/MetricsManager';

describe('MetricsManager', () => {
  let manager: MetricsManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new MetricsManager();
  });

  afterEach(() => {
    manager.stopAutoUpdate();
    vi.useRealTimers();
  });

  describe('Audio Level Metrics', () => {
    it('should update input level', () => {
      manager.updateInputLevel(0.5);

      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(0.5);
    });

    it('should track input level history', () => {
      manager.updateInputLevel(0.3);
      manager.updateInputLevel(0.7);
      manager.updateInputLevel(0.5);

      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(0.5); // Latest value
    });

    it('should update output level', () => {
      manager.updateOutputLevel(0.6);

      const metrics = manager.getMetrics();
      expect(metrics.outputLevel).toBe(0.6);
    });

    it('should track output level history', () => {
      manager.updateOutputLevel(0.2);
      manager.updateOutputLevel(0.8);
      manager.updateOutputLevel(0.4);

      const metrics = manager.getMetrics();
      expect(metrics.outputLevel).toBe(0.4); // Latest value
    });

    it('should clamp levels to 0-1 range', () => {
      manager.updateInputLevel(-0.5);
      manager.updateInputLevel(1.5);
      manager.updateOutputLevel(-0.3);
      manager.updateOutputLevel(2.0);

      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(1); // Last clamped value
      expect(metrics.outputLevel).toBe(1); // Last clamped value
    });
  });

  describe('Processing Metrics', () => {
    it('should update noise reduction', () => {
      manager.updateNoiseReduction(75.5);

      const metrics = manager.getMetrics();
      expect(metrics.noiseReductionLevel).toBe(75.5);
    });

    it('should update VAD score', () => {
      manager.updateVAD(0.85);

      const averageVAD = manager.getAverageVAD();
      expect(averageVAD).toBe(0.85);
    });

    it('should record frames', () => {
      manager.recordFrame();
      manager.recordFrame();
      manager.recordFrame();

      const metrics = manager.getMetrics();
      expect(metrics.frameCount).toBe(3);
    });

    it('should record dropped frames', () => {
      manager.recordDroppedFrame();
      manager.recordDroppedFrame();

      const metrics = manager.getMetrics();
      expect(metrics.droppedFrames).toBe(2);
    });
  });

  describe('RMS and Peak Calculations', () => {
    it('should calculate RMS correctly', () => {
      const samples = new Float32Array([0.5, -0.5, 0.5, -0.5]);
      const rms = manager.calculateRMS(samples);

      expect(rms).toBeCloseTo(0.5, 5);
    });

    it('should handle empty array for RMS', () => {
      const samples = new Float32Array(0);
      const rms = manager.calculateRMS(samples);

      expect(rms).toBe(0);
    });

    it('should handle silence for RMS', () => {
      const samples = new Float32Array(100); // All zeros
      const rms = manager.calculateRMS(samples);

      expect(rms).toBe(0);
    });

    it('should calculate peak correctly', () => {
      const samples = new Float32Array([0.2, -0.8, 0.5, -0.3, 0.6]);
      const peak = manager.calculatePeak(samples);

      expect(peak).toBe(0.8);
    });

    it('should handle empty array for peak', () => {
      const samples = new Float32Array(0);
      const peak = manager.calculatePeak(samples);

      expect(peak).toBe(0);
    });

    it('should handle all positive values for peak', () => {
      const samples = new Float32Array([0.1, 0.2, 0.9, 0.3]);
      const peak = manager.calculatePeak(samples);

      expect(peak).toBe(0.9);
    });
  });

  describe('Auto Update', () => {
    it('should start auto update with specified interval', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);

      manager.startAutoUpdate(100);

      // Initially no call
      expect(callback).not.toHaveBeenCalled();

      // After 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      // After another 100ms
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should stop auto update', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);

      manager.startAutoUpdate(100);
      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);

      manager.stopAutoUpdate();
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1); // No more calls
    });

    it('should handle multiple start calls', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);

      manager.startAutoUpdate(100);
      manager.startAutoUpdate(100); // Should replace the first

      vi.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should emit metrics data on update', () => {
      const callback = vi.fn();
      manager.on('metrics-update', callback);

      manager.updateInputLevel(0.5);
      manager.updateOutputLevel(0.3);
      manager.updateNoiseReduction(60);

      manager.startAutoUpdate(100);
      vi.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith({
        inputLevel: 0.3,
        outputLevel: 0.3,
        noiseReductionLevel: 60,
        processingLatency: expect.any(Number),
        frameCount: 0,
        droppedFrames: 0,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      manager.updateInputLevel(0.8);
      manager.updateOutputLevel(0.7);
      manager.updateNoiseReduction(80);
      manager.updateVAD(0.9);
      manager.recordFrame();
      manager.recordDroppedFrame();

      manager.reset();

      const metrics = manager.getMetrics();
      expect(metrics).toEqual({
        inputLevel: 0,
        outputLevel: 0,
        noiseReductionLevel: 0,
        processingLatency: expect.any(Number),
        frameCount: 0,
        droppedFrames: 0,
        timestamp: expect.any(Number),
      });
    });

    it('should reset levels after reset', () => {
      manager.updateInputLevel(0.9);
      manager.updateOutputLevel(0.8);

      manager.reset();

      manager.updateInputLevel(0.3);
      manager.updateOutputLevel(0.2);

      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(0.3);
      expect(metrics.outputLevel).toBe(0.2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid updates', () => {
      for (let i = 0; i < 1000; i++) {
        manager.updateInputLevel(Math.random());
        manager.updateOutputLevel(Math.random());
        manager.recordFrame();
      }

      const metrics = manager.getMetrics();
      expect(metrics.frameCount).toBe(1000);
      expect(metrics.inputLevel).toBeGreaterThanOrEqual(0);
      expect(metrics.inputLevel).toBeLessThanOrEqual(1);
    });

    it('should handle NaN values', () => {
      manager.updateInputLevel(NaN);
      manager.updateOutputLevel(NaN);
      manager.updateNoiseReduction(NaN);

      const metrics = manager.getMetrics();
      expect(isNaN(metrics.inputLevel) || metrics.inputLevel === 0).toBe(true);
      expect(isNaN(metrics.outputLevel) || metrics.outputLevel === 0).toBe(true);
      expect(isNaN(metrics.noiseReductionLevel) || metrics.noiseReductionLevel === 0).toBe(true);
    });

    it('should handle Infinity values', () => {
      manager.updateInputLevel(Infinity);
      manager.updateOutputLevel(-Infinity);

      const metrics = manager.getMetrics();
      expect(metrics.inputLevel).toBe(1); // Clamped to max
      expect(metrics.outputLevel).toBe(0); // Clamped to min
    });
  });

  describe('VAD Functionality', () => {
    it('should track VAD history', () => {
      manager.updateVAD(0.8);
      manager.updateVAD(0.6);
      manager.updateVAD(0.9);

      const avgVAD = manager.getAverageVAD();
      expect(avgVAD).toBeCloseTo(0.77, 1);
    });

    it('should calculate voice activity percentage', () => {
      manager.updateVAD(0.8); // Above threshold
      manager.updateVAD(0.3); // Below threshold
      manager.updateVAD(0.7); // Above threshold
      manager.updateVAD(0.2); // Below threshold

      const voicePercentage = manager.getVoiceActivityPercentage();
      expect(voicePercentage).toBe(50); // 2 out of 4 above 0.5
    });
  });

  describe('Getters', () => {
    it('should return current metrics snapshot', () => {
      const timestamp1 = Date.now();
      manager.updateInputLevel(0.4);

      const metrics1 = manager.getMetrics();
      expect(metrics1.timestamp).toBeGreaterThanOrEqual(timestamp1);

      vi.advanceTimersByTime(100);

      const metrics2 = manager.getMetrics();
      expect(metrics2.timestamp).toBeGreaterThan(metrics1.timestamp);
      expect(metrics2.inputLevel).toBe(0.4);
    });

    it('should return independent metric snapshots', () => {
      manager.updateInputLevel(0.5);

      const metrics1 = manager.getMetrics();
      const metrics2 = manager.getMetrics();

      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);
    });
  });
});
