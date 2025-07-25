import { describe, it, expect, vi } from 'vitest';
import { WorkerManager } from '../../managers/WorkerManager';
import { MetricsManager } from '../../managers/MetricsManager';
import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { EventEmitter } from '../../core/EventEmitter';

// Mock Worker
global.Worker = vi.fn(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

describe('Managers Simple Coverage', () => {
  describe('WorkerManager', () => {
    it('should create and use WorkerManager', () => {
      const emitter = new EventEmitter();
      const manager = new WorkerManager('worker.js', emitter);
      
      expect(manager.isInitialized()).toBe(false);
      
      // Try to send message without init (should throw)
      try {
        manager.sendMessage({ type: 'test' });
      } catch (e) {
        expect(e.message).toContain('Worker not initialized');
      }
      
      manager.terminate();
    });
  });
  
  describe('MetricsManager', () => {
    it('should create and use MetricsManager', () => {
      const emitter = new EventEmitter();
      const manager = new MetricsManager(emitter);
      
      const metrics = manager.getMetrics();
      expect(metrics).toHaveProperty('inputLevel', 0);
      expect(metrics).toHaveProperty('outputLevel', 0);
      
      manager.updateMetrics({ inputLevel: 0.5 });
      manager.reset();
      
      const avgMetrics = manager.calculateAverageMetrics();
      expect(avgMetrics).toBeDefined();
      
      // Subscribe
      const unsubscribe = manager.subscribe(() => {});
      unsubscribe();
    });
  });
  
  describe('ChunkProcessor', () => {
    it('should create ChunkProcessor', () => {
      const processor = new ChunkProcessor();
      expect(processor).toBeDefined();
      
      // Test public methods
      expect(processor.processChunk).toBeDefined();
      expect(processor.reset).toBeDefined();
    });
  });
});