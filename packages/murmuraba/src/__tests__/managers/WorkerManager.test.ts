import { WorkerManager } from '../../managers/WorkerManager';
import { Logger } from '../../core/Logger';
import { MurmubaraError, ErrorCodes } from '../../types';

// Mock Worker
class MockWorker {
  postMessage = jest.fn();
  terminate = jest.fn();
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

// Mock global Worker
global.Worker = jest.fn().mockImplementation((path) => {
  return new MockWorker();
}) as any;

describe('WorkerManager', () => {
  let workerManager: WorkerManager;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn(),
      setLogHandler: jest.fn()
    } as any;
    
    workerManager = new WorkerManager(mockLogger);
  });

  describe('createWorker()', () => {
    it('should create a new worker', () => {
      const worker = workerManager.createWorker('test-worker', '/worker.js');
      
      expect(global.Worker).toHaveBeenCalledWith('/worker.js');
      expect(worker).toBeInstanceOf(MockWorker);
      expect(mockLogger.debug).toHaveBeenCalledWith('Worker created: test-worker');
    });

    it('should throw error if worker ID already exists', () => {
      workerManager.createWorker('test-worker', '/worker.js');
      
      expect(() => {
        workerManager.createWorker('test-worker', '/worker2.js');
      }).toThrow(MurmubaraError);
      
      expect(() => {
        workerManager.createWorker('test-worker', '/worker2.js');
      }).toThrow('Worker with id test-worker already exists');
    });

    it('should handle worker creation failure', () => {
      (global.Worker as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Failed to create worker');
      });
      
      expect(() => {
        workerManager.createWorker('failing-worker', '/worker.js');
      }).toThrow(MurmubaraError);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create worker: failing-worker',
        expect.any(Error)
      );
    });

    it('should handle non-Error exceptions', () => {
      (global.Worker as jest.Mock).mockImplementationOnce(() => {
        throw 'String error';
      });
      
      expect(() => {
        workerManager.createWorker('failing-worker', '/worker.js');
      }).toThrow('Failed to create worker: String error');
    });
  });

  describe('getWorker()', () => {
    it('should return existing worker', () => {
      const created = workerManager.createWorker('test-worker', '/worker.js');
      const retrieved = workerManager.getWorker('test-worker');
      
      expect(retrieved).toBe(created);
    });

    it('should return undefined for non-existent worker', () => {
      const worker = workerManager.getWorker('non-existent');
      expect(worker).toBeUndefined();
    });
  });

  describe('sendMessage()', () => {
    it('should send message to worker', () => {
      const worker = workerManager.createWorker('test-worker', '/worker.js') as unknown as MockWorker;
      const message = { type: 'process', payload: { data: [1, 2, 3] } };
      
      workerManager.sendMessage('test-worker', message);
      
      expect(worker.postMessage).toHaveBeenCalledWith(message);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Message sent to worker test-worker:',
        message
      );
    });

    it('should throw error if worker not found', () => {
      expect(() => {
        workerManager.sendMessage('non-existent', { type: 'test' });
      }).toThrow(MurmubaraError);
      
      expect(() => {
        workerManager.sendMessage('non-existent', { type: 'test' });
      }).toThrow('Worker non-existent not found');
    });
  });

  describe('terminateWorker()', () => {
    it('should terminate existing worker', () => {
      const worker = workerManager.createWorker('test-worker', '/worker.js') as unknown as MockWorker;
      
      workerManager.terminateWorker('test-worker');
      
      expect(worker.terminate).toHaveBeenCalled();
      expect(workerManager.getWorker('test-worker')).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Worker terminated: test-worker');
    });

    it('should handle terminating non-existent worker', () => {
      // Should not throw
      expect(() => {
        workerManager.terminateWorker('non-existent');
      }).not.toThrow();
    });
  });

  describe('terminateAll()', () => {
    it('should terminate all workers', () => {
      const worker1 = workerManager.createWorker('worker-1', '/worker.js') as unknown as MockWorker;
      const worker2 = workerManager.createWorker('worker-2', '/worker.js') as unknown as MockWorker;
      const worker3 = workerManager.createWorker('worker-3', '/worker.js') as unknown as MockWorker;
      
      mockLogger.info.mockClear();
      mockLogger.debug.mockClear();
      
      workerManager.terminateAll();
      
      expect(worker1.terminate).toHaveBeenCalled();
      expect(worker2.terminate).toHaveBeenCalled();
      expect(worker3.terminate).toHaveBeenCalled();
      expect(workerManager.getActiveWorkerCount()).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Terminating all 3 workers');
      expect(mockLogger.debug).toHaveBeenCalledTimes(3);
    });

    it('should handle empty worker list', () => {
      workerManager.terminateAll();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Terminating all 0 workers');
      expect(workerManager.getActiveWorkerCount()).toBe(0);
    });
  });

  describe('getActiveWorkerCount()', () => {
    it('should return correct worker count', () => {
      expect(workerManager.getActiveWorkerCount()).toBe(0);
      
      workerManager.createWorker('worker-1', '/worker.js');
      expect(workerManager.getActiveWorkerCount()).toBe(1);
      
      workerManager.createWorker('worker-2', '/worker.js');
      expect(workerManager.getActiveWorkerCount()).toBe(2);
      
      workerManager.terminateWorker('worker-1');
      expect(workerManager.getActiveWorkerCount()).toBe(1);
    });
  });

  describe('getWorkerIds()', () => {
    it('should return all worker IDs', () => {
      expect(workerManager.getWorkerIds()).toEqual([]);
      
      workerManager.createWorker('worker-1', '/worker.js');
      workerManager.createWorker('worker-2', '/worker.js');
      workerManager.createWorker('worker-3', '/worker.js');
      
      const ids = workerManager.getWorkerIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('worker-1');
      expect(ids).toContain('worker-2');
      expect(ids).toContain('worker-3');
    });

    it('should update after termination', () => {
      workerManager.createWorker('worker-1', '/worker.js');
      workerManager.createWorker('worker-2', '/worker.js');
      
      workerManager.terminateWorker('worker-1');
      
      const ids = workerManager.getWorkerIds();
      expect(ids).toHaveLength(1);
      expect(ids).toContain('worker-2');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple operations', () => {
      // Create workers
      const worker1 = workerManager.createWorker('processor-1', '/processor.js');
      const worker2 = workerManager.createWorker('analyzer-1', '/analyzer.js');
      
      // Send messages
      workerManager.sendMessage('processor-1', { type: 'start' });
      workerManager.sendMessage('analyzer-1', { type: 'configure', payload: { mode: 'fft' } });
      
      // Check state
      expect(workerManager.getActiveWorkerCount()).toBe(2);
      expect(workerManager.getWorkerIds()).toContain('processor-1');
      expect(workerManager.getWorkerIds()).toContain('analyzer-1');
      
      // Terminate one
      workerManager.terminateWorker('processor-1');
      expect(workerManager.getActiveWorkerCount()).toBe(1);
      
      // Create another
      const worker3 = workerManager.createWorker('processor-2', '/processor.js');
      
      // Terminate all
      workerManager.terminateAll();
      expect(workerManager.getActiveWorkerCount()).toBe(0);
    });
  });
});