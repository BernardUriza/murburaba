import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  measureExecutionTime,
  throttle,
  debounce,
  calculateAverageTime,
  formatBytes,
  formatDuration,
} from '../../../utils/performance';

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should mark and measure performance', () => {
      monitor.mark('start');
      vi.advanceTimersByTime(100);
      monitor.mark('end');

      const duration = monitor.measure('task', 'start', 'end');
      expect(duration).toBeCloseTo(100, -1);
    });

    it('should get all measurements', () => {
      monitor.mark('task1-start');
      vi.advanceTimersByTime(50);
      monitor.mark('task1-end');
      monitor.measure('task1', 'task1-start', 'task1-end');

      monitor.mark('task2-start');
      vi.advanceTimersByTime(75);
      monitor.mark('task2-end');
      monitor.measure('task2', 'task2-start', 'task2-end');

      const measurements = monitor.getMeasurements();
      expect(measurements['task1']).toBeCloseTo(50, -1);
      expect(measurements['task2']).toBeCloseTo(75, -1);
    });

    it('should calculate average of multiple measurements', () => {
      for (let i = 0; i < 5; i++) {
        monitor.mark(`iter${i}-start`);
        vi.advanceTimersByTime(100 + i * 10);
        monitor.mark(`iter${i}-end`);
        monitor.measure('task', `iter${i}-start`, `iter${i}-end`);
      }

      const average = monitor.getAverage('task');
      expect(average).toBeCloseTo(120, -1); // (100+110+120+130+140)/5
    });

    it('should reset measurements', () => {
      monitor.mark('start');
      monitor.mark('end');
      monitor.measure('task', 'start', 'end');

      monitor.reset();

      const measurements = monitor.getMeasurements();
      expect(Object.keys(measurements)).toHaveLength(0);
    });

    it('should handle non-existent marks gracefully', () => {
      const duration = monitor.measure('task', 'non-existent1', 'non-existent2');
      expect(duration).toBe(0);
    });
  });

  describe('measureExecutionTime', () => {
    it('should measure synchronous function execution time', async () => {
      const syncFn = () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const { result, duration } = await measureExecutionTime(syncFn);

      expect(result).toBe(499500);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure async function execution time', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      };

      const startTime = performance.now();
      const { result, duration } = await measureExecutionTime(asyncFn);

      expect(result).toBe('done');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle function errors', async () => {
      const errorFn = () => {
        throw new Error('Test error');
      };

      await expect(measureExecutionTime(errorFn)).rejects.toThrow('Test error');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      // Call multiple times quickly
      throttled(1);
      throttled(2);
      throttled(3);

      // Only first call should execute immediately
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(1);

      // After delay, last call should execute
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenCalledWith(3);
    });

    it('should handle arguments correctly', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 50);

      throttled('a', 'b');
      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledWith('a', 'b');
    });

    it('should allow calls after throttle period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled(1);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(150);

      throttled(2);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith(2);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced(1);
      debounced(2);
      debounced(3);

      // No calls yet
      expect(fn).not.toHaveBeenCalled();

      // After delay, only last call executes
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(3);
    });

    it('should reset timer on each call', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced(1);
      vi.advanceTimersByTime(50);

      debounced(2);
      vi.advanceTimersByTime(50);

      debounced(3);
      vi.advanceTimersByTime(50);

      // Still no calls
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(3);
    });

    it('should handle multiple argument calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced('x', 'y', 'z');
      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledWith('x', 'y', 'z');
    });
  });

  describe('calculateAverageTime', () => {
    it('should calculate average of times', () => {
      const times = [100, 200, 300, 400, 500];
      const average = calculateAverageTime(times);

      expect(average).toBe(300);
    });

    it('should handle empty array', () => {
      const average = calculateAverageTime([]);

      expect(average).toBe(0);
    });

    it('should handle single value', () => {
      const average = calculateAverageTime([150]);

      expect(average).toBe(150);
    });

    it('should handle floating point values', () => {
      const times = [10.5, 20.5, 30.5];
      const average = calculateAverageTime(times);

      expect(average).toBeCloseTo(20.5, 5);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1)).toBe('1 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimals', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536, 2)).toBe('1.50 KB');
      expect(formatBytes(1500, 0)).toBe('1 KB');
    });

    it('should handle negative values', () => {
      expect(formatBytes(-1024)).toBe('-1 KB');
    });

    it('should handle very large values', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
      expect(formatBytes(1125899906842624)).toBe('1 PB');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds to readable duration', () => {
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(60000)).toBe('1m');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(3661000)).toBe('1h 1m 1s');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(999)).toBe('999ms');
      expect(formatDuration(59999)).toBe('59.999s');
      expect(formatDuration(3599999)).toBe('59m 59.999s');
    });

    it('should handle negative durations', () => {
      expect(formatDuration(-1000)).toBe('-1s');
      expect(formatDuration(-60000)).toBe('-1m');
    });

    it('should handle very long durations', () => {
      expect(formatDuration(86400000)).toBe('24h');
      expect(formatDuration(172800000)).toBe('48h');
    });
  });

  describe('Memory usage tracking', () => {
    it('should get memory usage', () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024,
        },
        configurable: true,
      });

      const monitor = new PerformanceMonitor();
      const memory = monitor.getMemoryUsage();

      expect(memory.used).toBe(50 * 1024 * 1024);
      expect(memory.total).toBe(100 * 1024 * 1024);
      expect(memory.limit).toBe(2048 * 1024 * 1024);
      expect(memory.usedFormatted).toBe('50 MB');
      expect(memory.totalFormatted).toBe('100 MB');
      expect(memory.limitFormatted).toBe('2 GB');
    });

    it('should handle missing performance.memory', () => {
      // Remove performance.memory
      delete (performance as any).memory;

      const monitor = new PerformanceMonitor();
      const memory = monitor.getMemoryUsage();

      expect(memory.used).toBe(0);
      expect(memory.total).toBe(0);
      expect(memory.limit).toBe(0);
    });
  });
});
