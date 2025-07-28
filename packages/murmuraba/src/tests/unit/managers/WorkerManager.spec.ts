import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WorkerManager } from '../../../managers/WorkerManager';
import { Logger } from '../../../core/Logger';

// Mock Worker
class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  // Simulate sending a message from worker
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  // Simulate error
  simulateError(error: any) {
    if (this.onerror) {
      this.onerror({ error });
    }
  }
}

// Mock global Worker
global.Worker = MockWorker as any;

describe('WorkerManager', () => {
  let manager: WorkerManager;
  let mockLogger: Logger;
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = new Logger('[WorkerManager]');
    mockLogger.setLevel('debug');
    manager = new WorkerManager(mockLogger);
  });

  afterEach(() => {
    manager.terminateAll();
  });

  describe('Worker Creation', () => {
    it('should create a worker with given id and path', () => {
      const worker = manager.createWorker('test-worker', '/test-worker.js');
      expect(worker).toBeDefined();
      expect(worker).toBeInstanceOf(MockWorker);
    });

    it('should throw error when creating worker with duplicate id', () => {
      manager.createWorker('test-worker', '/test-worker.js');
      expect(() => {
        manager.createWorker('test-worker', '/test-worker.js');
      }).toThrow('Worker with id test-worker already exists');
    });
  });

  describe('Message Processing', () => {
    it('should send message to worker', () => {
      const worker = manager.createWorker('test-worker', '/test-worker.js');
      const message = { type: 'process', payload: { data: 'test' } };

      manager.sendMessage('test-worker', message);

      expect(worker.postMessage).toHaveBeenCalledWith(message);
    });

    it('should throw error when sending message to non-existent worker', () => {
      const message = { type: 'test', payload: {} };

      expect(() => {
        manager.sendMessage('non-existent', message);
      }).toThrow('Worker non-existent not found');
    });
  });

  describe('Worker Management', () => {
    it('should get worker by id', () => {
      const worker = manager.createWorker('test-worker', '/test-worker.js');
      const retrieved = manager.getWorker('test-worker');

      expect(retrieved).toBe(worker);
    });

    it('should return undefined for non-existent worker', () => {
      const retrieved = manager.getWorker('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Worker Termination', () => {
    it('should terminate specific worker', () => {
      const worker = manager.createWorker('test-worker', '/test-worker.js');

      manager.terminateWorker('test-worker');

      expect(worker.terminate).toHaveBeenCalled();
      expect(manager.getWorker('test-worker')).toBeUndefined();
    });

    it('should terminate all workers', () => {
      const worker1 = manager.createWorker('worker1', '/worker1.js');
      const worker2 = manager.createWorker('worker2', '/worker2.js');

      manager.terminateAll();

      expect(worker1.terminate).toHaveBeenCalled();
      expect(worker2.terminate).toHaveBeenCalled();
      expect(manager.getActiveWorkerCount()).toBe(0);
    });

    it('should handle termination of non-existent worker gracefully', () => {
      expect(() => {
        manager.terminateWorker('non-existent');
      }).not.toThrow();
    });
  });

  describe('Worker Statistics', () => {
    it('should track active worker count', () => {
      expect(manager.getActiveWorkerCount()).toBe(0);

      manager.createWorker('worker1', '/worker1.js');
      expect(manager.getActiveWorkerCount()).toBe(1);

      manager.createWorker('worker2', '/worker2.js');
      expect(manager.getActiveWorkerCount()).toBe(2);

      manager.terminateWorker('worker1');
      expect(manager.getActiveWorkerCount()).toBe(1);
    });

    it('should get worker IDs', () => {
      manager.createWorker('worker1', '/worker1.js');
      manager.createWorker('worker2', '/worker2.js');

      const ids = manager.getWorkerIds();
      expect(ids).toContain('worker1');
      expect(ids).toContain('worker2');
      expect(ids).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle worker creation failure', () => {
      // Mock Worker constructor to throw
      const originalWorker = global.Worker;
      global.Worker = vi.fn(() => {
        throw new Error('Worker creation failed');
      }) as any;

      expect(() => {
        manager.createWorker('failing-worker', '/failing-worker.js');
      }).toThrow('Failed to create worker');

      // Restore original Worker
      global.Worker = originalWorker;
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple workers with different paths', () => {
      const worker1 = manager.createWorker('worker1', '/path1.js');
      const worker2 = manager.createWorker('worker2', '/path2.js');

      expect(worker1).not.toBe(worker2);
      expect(manager.getActiveWorkerCount()).toBe(2);
    });
  });

  describe('Message Handling', () => {
    it('should send multiple messages to same worker', () => {
      const worker = manager.createWorker('test-worker', '/test-worker.js');

      manager.sendMessage('test-worker', { type: 'msg1' });
      manager.sendMessage('test-worker', { type: 'msg2' });

      expect(worker.postMessage).toHaveBeenCalledTimes(2);
      expect(worker.postMessage).toHaveBeenCalledWith({ type: 'msg1' });
      expect(worker.postMessage).toHaveBeenCalledWith({ type: 'msg2' });
    });
  });

  describe('Cleanup', () => {
    it('should properly clean up all resources', () => {
      const worker1 = manager.createWorker('worker1', '/worker1.js');
      const worker2 = manager.createWorker('worker2', '/worker2.js');

      expect(manager.getActiveWorkerCount()).toBe(2);

      manager.terminateAll();

      expect(worker1.terminate).toHaveBeenCalled();
      expect(worker2.terminate).toHaveBeenCalled();
      expect(manager.getActiveWorkerCount()).toBe(0);
      expect(manager.getWorkerIds()).toHaveLength(0);
    });
  });
});
