import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WorkerManager } from '../../managers/WorkerManager';
import { EventEmitter } from '../../core/EventEmitter';
import { Logger } from '../../core/Logger';

// Mock worker
class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
}

// Mock global Worker
global.Worker = MockWorker as any;

describe('WorkerManager', () => {
  let workerManager: WorkerManager;
  let eventEmitter: EventEmitter;
  let mockWorker: MockWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter = new EventEmitter();
    
    // Mock worker creation
    vi.spyOn(global, 'Worker').mockImplementation(() => {
      mockWorker = new MockWorker();
      return mockWorker as any;
    });
    
    workerManager = new WorkerManager('test-worker.js', eventEmitter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with worker URL and event emitter', () => {
      expect(workerManager).toBeDefined();
      expect(workerManager['workerUrl']).toBe('test-worker.js');
      expect(workerManager['eventEmitter']).toBe(eventEmitter);
    });
  });

  describe('initialize', () => {
    it('should create worker and set up event handlers', async () => {
      await workerManager.initialize();
      
      expect(global.Worker).toHaveBeenCalledWith('test-worker.js');
      expect(mockWorker.onmessage).toBeDefined();
      expect(mockWorker.onerror).toBeDefined();
    });

    it('should handle worker ready message', async () => {
      const readyListener = vi.fn();
      eventEmitter.on('worker:ready', readyListener);
      
      await workerManager.initialize();
      
      // Simulate worker ready message
      mockWorker.onmessage!({ data: { type: 'ready' } });
      
      expect(readyListener).toHaveBeenCalled();
    });

    it('should handle worker error message', async () => {
      const errorListener = vi.fn();
      eventEmitter.on('worker:error', errorListener);
      
      await workerManager.initialize();
      
      // Simulate worker error
      const error = new Error('Worker error');
      mockWorker.onerror!(error);
      
      expect(errorListener).toHaveBeenCalledWith(error);
    });

    it('should forward worker messages to event emitter', async () => {
      const messageListener = vi.fn();
      eventEmitter.on('worker:message', messageListener);
      
      await workerManager.initialize();
      
      const testMessage = { type: 'test', data: 'hello' };
      mockWorker.onmessage!({ data: testMessage });
      
      expect(messageListener).toHaveBeenCalledWith(testMessage);
    });

    it('should not initialize twice', async () => {
      await workerManager.initialize();
      await workerManager.initialize();
      
      expect(global.Worker).toHaveBeenCalledTimes(1);
    });

    it('should handle worker creation failure', async () => {
      vi.spyOn(global, 'Worker').mockImplementation(() => {
        throw new Error('Failed to create worker');
      });
      
      await expect(workerManager.initialize()).rejects.toThrow('Failed to create worker');
    });
  });

  describe('sendMessage', () => {
    it('should send message to worker', async () => {
      await workerManager.initialize();
      
      const message = { type: 'process', data: [1, 2, 3] };
      workerManager.sendMessage(message);
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith(message);
    });

    it('should throw if worker not initialized', () => {
      expect(() => {
        workerManager.sendMessage({ type: 'test' });
      }).toThrow('Worker not initialized');
    });
  });

  describe('terminate', () => {
    it('should terminate worker', async () => {
      await workerManager.initialize();
      workerManager.terminate();
      
      expect(mockWorker.terminate).toHaveBeenCalled();
      expect(workerManager['worker']).toBeNull();
    });

    it('should handle terminating non-initialized worker', () => {
      expect(() => {
        workerManager.terminate();
      }).not.toThrow();
    });

    it('should allow re-initialization after termination', async () => {
      await workerManager.initialize();
      workerManager.terminate();
      
      await workerManager.initialize();
      
      expect(global.Worker).toHaveBeenCalledTimes(2);
    });
  });

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(workerManager.isInitialized()).toBe(false);
    });

    it('should return true when initialized', async () => {
      await workerManager.initialize();
      expect(workerManager.isInitialized()).toBe(true);
    });

    it('should return false after termination', async () => {
      await workerManager.initialize();
      workerManager.terminate();
      expect(workerManager.isInitialized()).toBe(false);
    });
  });

  describe('request-response pattern', () => {
    it('should handle request with response', async () => {
      await workerManager.initialize();
      
      const requestId = 'test-123';
      const responseListener = vi.fn();
      eventEmitter.on(`worker:response:${requestId}`, responseListener);
      
      // Send request
      workerManager.sendMessage({ type: 'request', id: requestId, data: 'test' });
      
      // Simulate response
      mockWorker.onmessage!({ 
        data: { 
          type: 'response', 
          id: requestId, 
          result: 'success' 
        } 
      });
      
      // Should emit specific response event
      expect(responseListener).toHaveBeenCalledWith({
        type: 'response',
        id: requestId,
        result: 'success'
      });
    });
  });

  describe('error handling', () => {
    it('should handle worker runtime errors', async () => {
      const errorListener = vi.fn();
      eventEmitter.on('worker:error', errorListener);
      
      await workerManager.initialize();
      
      // Simulate worker error event
      const errorEvent = { message: 'Runtime error', filename: 'worker.js', lineno: 10 };
      mockWorker.onerror!(errorEvent);
      
      expect(errorListener).toHaveBeenCalledWith(errorEvent);
    });

    it('should handle malformed messages', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await workerManager.initialize();
      
      // Send null data
      mockWorker.onmessage!({ data: null });
      
      // Should not throw
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('transferable objects', () => {
    it('should support sending transferable objects', async () => {
      await workerManager.initialize();
      
      const buffer = new ArrayBuffer(1024);
      const transferables = [buffer];
      
      workerManager.sendMessage({ type: 'process', buffer }, transferables);
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        { type: 'process', buffer },
        transferables
      );
    });
  });
});