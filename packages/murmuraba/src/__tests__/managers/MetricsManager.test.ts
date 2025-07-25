import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MetricsManager } from '../../managers/MetricsManager';
import { EventEmitter } from '../../core/EventEmitter';
import { AudioMetrics } from '../../types';

describe('MetricsManager', () => {
  let metricsManager: MetricsManager;
  let eventEmitter: EventEmitter;

  beforeEach(() => {
    vi.useFakeTimers();
    eventEmitter = new EventEmitter();
    metricsManager = new MetricsManager(eventEmitter);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default metrics', () => {
      const metrics = metricsManager.getMetrics();
      
      expect(metrics).toEqual({
        inputLevel: 0,
        outputLevel: 0,
        noiseReduction: 0,
        processingLoad: 0,
        latency: 0,
        vadScore: 0
      });
    });

    it('should not emit on construction', () => {
      const listener = vi.fn();
      eventEmitter.on('metrics:update', listener);
      
      new MetricsManager(eventEmitter);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('updateMetrics', () => {
    it('should update partial metrics', () => {
      metricsManager.updateMetrics({ inputLevel: 0.5 });
      
      const metrics = metricsManager.getMetrics();
      expect(metrics.inputLevel).toBe(0.5);
      expect(metrics.outputLevel).toBe(0); // Others unchanged
    });

    it('should update multiple metrics', () => {
      metricsManager.updateMetrics({
        inputLevel: 0.5,
        outputLevel: 0.7,
        noiseReduction: 0.3
      });
      
      const metrics = metricsManager.getMetrics();
      expect(metrics).toMatchObject({
        inputLevel: 0.5,
        outputLevel: 0.7,
        noiseReduction: 0.3
      });
    });

    it('should emit metrics update event', () => {
      const listener = vi.fn();
      eventEmitter.on('metrics:update', listener);
      
      const update = { inputLevel: 0.5 };
      metricsManager.updateMetrics(update);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        inputLevel: 0.5,
        outputLevel: 0,
        noiseReduction: 0,
        processingLoad: 0,
        latency: 0,
        vadScore: 0
      }));
    });

    it('should debounce rapid updates', () => {
      const listener = vi.fn();
      eventEmitter.on('metrics:update', listener);
      
      // Rapid updates
      metricsManager.updateMetrics({ inputLevel: 0.1 });
      metricsManager.updateMetrics({ inputLevel: 0.2 });
      metricsManager.updateMetrics({ inputLevel: 0.3 });
      
      // Should not emit immediately
      expect(listener).not.toHaveBeenCalled();
      
      // Advance timers
      vi.advanceTimersByTime(50);
      
      // Should emit once with latest values
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        inputLevel: 0.3
      }));
    });
  });

  describe('reset', () => {
    it('should reset all metrics to zero', () => {
      metricsManager.updateMetrics({
        inputLevel: 0.5,
        outputLevel: 0.7,
        noiseReduction: 0.3,
        processingLoad: 0.2,
        latency: 10,
        vadScore: 0.8
      });
      
      metricsManager.reset();
      
      const metrics = metricsManager.getMetrics();
      expect(metrics).toEqual({
        inputLevel: 0,
        outputLevel: 0,
        noiseReduction: 0,
        processingLoad: 0,
        latency: 0,
        vadScore: 0
      });
    });

    it('should emit reset event', () => {
      const listener = vi.fn();
      eventEmitter.on('metrics:update', listener);
      
      metricsManager.updateMetrics({ inputLevel: 0.5 });
      vi.advanceTimersByTime(50); // Let debounce settle
      listener.mockClear();
      
      metricsManager.reset();
      vi.advanceTimersByTime(50);
      
      expect(listener).toHaveBeenCalledWith({
        inputLevel: 0,
        outputLevel: 0,
        noiseReduction: 0,
        processingLoad: 0,
        latency: 0,
        vadScore: 0
      });
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const initialMetrics = metricsManager.getMetrics();
      
      metricsManager.updateMetrics({ inputLevel: 0.5 });
      
      const updatedMetrics = metricsManager.getMetrics();
      
      expect(initialMetrics).not.toBe(updatedMetrics); // Different objects
      expect(updatedMetrics.inputLevel).toBe(0.5);
    });

    it('should return frozen object', () => {
      const metrics = metricsManager.getMetrics();
      
      expect(() => {
        (metrics as any).inputLevel = 0.5;
      }).toThrow();
    });
  });

  describe('subscribe', () => {
    it('should subscribe to metrics updates', () => {
      const listener = vi.fn();
      const unsubscribe = metricsManager.subscribe(listener);
      
      metricsManager.updateMetrics({ inputLevel: 0.5 });
      vi.advanceTimersByTime(50);
      
      expect(listener).toHaveBeenCalledWith({
        inputLevel: 0.5,
        outputLevel: 0,
        noiseReduction: 0,
        processingLoad: 0,
        latency: 0,
        vadScore: 0
      });
      
      // Test unsubscribe
      unsubscribe();
      listener.mockClear();
      
      metricsManager.updateMetrics({ inputLevel: 0.7 });
      vi.advanceTimersByTime(50);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('calculateAverageMetrics', () => {
    it('should calculate running average', () => {
      const samples: AudioMetrics[] = [
        { inputLevel: 0.2, outputLevel: 0.3, noiseReduction: 0.1, processingLoad: 0.2, latency: 5, vadScore: 0.5 },
        { inputLevel: 0.4, outputLevel: 0.5, noiseReduction: 0.2, processingLoad: 0.3, latency: 10, vadScore: 0.7 },
        { inputLevel: 0.6, outputLevel: 0.7, noiseReduction: 0.3, processingLoad: 0.4, latency: 15, vadScore: 0.9 }
      ];
      
      samples.forEach(sample => {
        metricsManager.updateMetrics(sample);
        vi.advanceTimersByTime(100); // Space out updates
      });
      
      const average = metricsManager.calculateAverageMetrics();
      
      expect(average).toEqual({
        inputLevel: 0.4,
        outputLevel: 0.5,
        noiseReduction: 0.2,
        processingLoad: 0.3,
        latency: 10,
        vadScore: 0.7
      });
    });

    it('should handle empty history', () => {
      const average = metricsManager.calculateAverageMetrics();
      
      expect(average).toEqual({
        inputLevel: 0,
        outputLevel: 0,
        noiseReduction: 0,
        processingLoad: 0,
        latency: 0,
        vadScore: 0
      });
    });

    it('should maintain sliding window', () => {
      // Add more than window size
      for (let i = 0; i < 120; i++) {
        metricsManager.updateMetrics({ inputLevel: i / 100 });
        vi.advanceTimersByTime(10);
      }
      
      // Should only keep last 100 samples
      const history = metricsManager['metricsHistory'];
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('performance monitoring', () => {
    it('should track processing load', () => {
      const listener = vi.fn();
      metricsManager.subscribe(listener);
      
      // Simulate high processing load
      metricsManager.updateMetrics({ processingLoad: 0.8 });
      vi.advanceTimersByTime(50);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        processingLoad: 0.8
      }));
    });

    it('should track latency', () => {
      const listener = vi.fn();
      metricsManager.subscribe(listener);
      
      // Simulate latency measurement
      metricsManager.updateMetrics({ latency: 25 });
      vi.advanceTimersByTime(50);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        latency: 25
      }));
    });
  });

  describe('edge cases', () => {
    it('should handle negative values', () => {
      metricsManager.updateMetrics({ inputLevel: -0.5 });
      
      const metrics = metricsManager.getMetrics();
      expect(metrics.inputLevel).toBe(-0.5);
    });

    it('should handle very large values', () => {
      metricsManager.updateMetrics({ latency: 9999 });
      
      const metrics = metricsManager.getMetrics();
      expect(metrics.latency).toBe(9999);
    });

    it('should handle NaN values', () => {
      metricsManager.updateMetrics({ inputLevel: NaN });
      
      const metrics = metricsManager.getMetrics();
      expect(metrics.inputLevel).toBeNaN();
    });

    it('should handle concurrent updates', () => {
      const listener = vi.fn();
      metricsManager.subscribe(listener);
      
      // Simulate concurrent updates
      Promise.all([
        metricsManager.updateMetrics({ inputLevel: 0.1 }),
        metricsManager.updateMetrics({ outputLevel: 0.2 }),
        metricsManager.updateMetrics({ noiseReduction: 0.3 })
      ]);
      
      vi.advanceTimersByTime(50);
      
      // Should combine all updates
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        inputLevel: 0.1,
        outputLevel: 0.2,
        noiseReduction: 0.3
      }));
    });
  });
});