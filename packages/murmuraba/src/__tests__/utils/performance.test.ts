import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  measurePerformance,
  createPerformanceMonitor,
  getPerformanceReport,
  resetPerformanceMetrics
} from '../../utils/performance';

describe('Performance Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPerformanceMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('measurePerformance', () => {
    it('should measure sync function performance', () => {
      const fn = vi.fn(() => 'result');
      
      const result = measurePerformance('test-operation', fn);
      
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');
      
      const report = getPerformanceReport();
      expect(report['test-operation']).toBeDefined();
      expect(report['test-operation'].count).toBe(1);
      expect(report['test-operation'].totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should measure async function performance', async () => {
      const fn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async result';
      });
      
      const promise = measurePerformance('async-operation', fn);
      
      // Advance timers
      vi.advanceTimersByTime(100);
      
      const result = await promise;
      
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('async result');
      
      const report = getPerformanceReport();
      expect(report['async-operation']).toBeDefined();
      expect(report['async-operation'].count).toBe(1);
    });

    it('should handle errors in measured function', () => {
      const error = new Error('Test error');
      const fn = vi.fn(() => {
        throw error;
      });
      
      expect(() => measurePerformance('error-operation', fn)).toThrow('Test error');
      
      const report = getPerformanceReport();
      expect(report['error-operation']).toBeDefined();
      expect(report['error-operation'].count).toBe(1);
      expect(report['error-operation'].errors).toBe(1);
    });

    it('should accumulate metrics for repeated operations', () => {
      const fn = vi.fn(() => 'result');
      
      measurePerformance('repeated-op', fn);
      measurePerformance('repeated-op', fn);
      measurePerformance('repeated-op', fn);
      
      const report = getPerformanceReport();
      expect(report['repeated-op'].count).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('createPerformanceMonitor', () => {
    it('should create a performance monitor', () => {
      const monitor = createPerformanceMonitor('monitor-test');
      
      expect(monitor).toHaveProperty('start');
      expect(monitor).toHaveProperty('end');
      expect(monitor).toHaveProperty('mark');
    });

    it('should measure time between start and end', () => {
      const monitor = createPerformanceMonitor('timing-test');
      
      monitor.start();
      vi.advanceTimersByTime(150);
      monitor.end();
      
      const report = getPerformanceReport();
      expect(report['timing-test']).toBeDefined();
      expect(report['timing-test'].totalTime).toBeGreaterThanOrEqual(150);
    });

    it('should support marking intermediate points', () => {
      const monitor = createPerformanceMonitor('mark-test');
      
      monitor.start();
      vi.advanceTimersByTime(50);
      
      const mark1 = monitor.mark('checkpoint-1');
      expect(mark1).toBeGreaterThanOrEqual(50);
      
      vi.advanceTimersByTime(100);
      
      const mark2 = monitor.mark('checkpoint-2');
      expect(mark2).toBeGreaterThanOrEqual(150);
      
      monitor.end();
    });

    it('should handle calling end without start', () => {
      const monitor = createPerformanceMonitor('no-start-test');
      
      expect(() => monitor.end()).not.toThrow();
      
      const report = getPerformanceReport();
      expect(report['no-start-test']).toBeUndefined();
    });

    it('should handle multiple start calls', () => {
      const monitor = createPerformanceMonitor('multi-start-test');
      
      monitor.start();
      vi.advanceTimersByTime(100);
      monitor.start(); // Reset start time
      vi.advanceTimersByTime(50);
      monitor.end();
      
      const report = getPerformanceReport();
      expect(report['multi-start-test'].totalTime).toBeGreaterThanOrEqual(50);
      expect(report['multi-start-test'].totalTime).toBeLessThan(150);
    });
  });

  describe('getPerformanceReport', () => {
    it('should return empty report initially', () => {
      const report = getPerformanceReport();
      expect(report).toEqual({});
    });

    it('should include all measured operations', () => {
      measurePerformance('op1', () => 1);
      measurePerformance('op2', () => 2);
      measurePerformance('op3', () => 3);
      
      const report = getPerformanceReport();
      expect(Object.keys(report)).toHaveLength(3);
      expect(report).toHaveProperty('op1');
      expect(report).toHaveProperty('op2');
      expect(report).toHaveProperty('op3');
    });

    it('should calculate average time correctly', () => {
      const fn = () => {
        vi.advanceTimersByTime(100);
      };
      
      measurePerformance('avg-test', fn);
      measurePerformance('avg-test', fn);
      measurePerformance('avg-test', fn);
      
      const report = getPerformanceReport();
      expect(report['avg-test'].count).toBe(3);
      expect(report['avg-test'].averageTime).toBeCloseTo(100, 0);
    });

    it('should track min and max times', () => {
      let delay = 50;
      const fn = () => {
        vi.advanceTimersByTime(delay);
        delay += 50;
      };
      
      measurePerformance('minmax-test', fn); // 50ms
      measurePerformance('minmax-test', fn); // 100ms
      measurePerformance('minmax-test', fn); // 150ms
      
      const report = getPerformanceReport();
      expect(report['minmax-test'].minTime).toBeCloseTo(50, 0);
      expect(report['minmax-test'].maxTime).toBeCloseTo(150, 0);
    });
  });

  describe('resetPerformanceMetrics', () => {
    it('should clear all metrics', () => {
      measurePerformance('test1', () => 1);
      measurePerformance('test2', () => 2);
      
      let report = getPerformanceReport();
      expect(Object.keys(report)).toHaveLength(2);
      
      resetPerformanceMetrics();
      
      report = getPerformanceReport();
      expect(Object.keys(report)).toHaveLength(0);
    });

    it('should allow measuring after reset', () => {
      measurePerformance('before-reset', () => 1);
      resetPerformanceMetrics();
      measurePerformance('after-reset', () => 2);
      
      const report = getPerformanceReport();
      expect(report).not.toHaveProperty('before-reset');
      expect(report).toHaveProperty('after-reset');
    });
  });

  describe('edge cases', () => {
    it('should handle very long operation names', () => {
      const longName = 'a'.repeat(1000);
      
      expect(() => measurePerformance(longName, () => 'ok')).not.toThrow();
      
      const report = getPerformanceReport();
      expect(report[longName]).toBeDefined();
    });

    it('should handle high-frequency operations', () => {
      const fn = vi.fn(() => 'result');
      
      for (let i = 0; i < 1000; i++) {
        measurePerformance('high-freq', fn);
      }
      
      const report = getPerformanceReport();
      expect(report['high-freq'].count).toBe(1000);
      expect(fn).toHaveBeenCalledTimes(1000);
    });

    it('should maintain precision for very small durations', () => {
      const fn = () => 'instant';
      
      measurePerformance('instant-op', fn);
      
      const report = getPerformanceReport();
      expect(report['instant-op'].minTime).toBeGreaterThanOrEqual(0);
      expect(report['instant-op'].totalTime).toBeGreaterThanOrEqual(0);
    });
  });
});