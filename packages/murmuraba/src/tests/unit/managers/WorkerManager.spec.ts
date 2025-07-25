import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WorkerManager } from '../../../managers/WorkerManager';

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
  let mockWorker: MockWorker;
  
  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WorkerManager();
    
    // Get the created worker instance
    mockWorker = (manager as any).worker;
  });
  
  afterEach(() => {
    manager.terminate();
  });
  
  describe('Initialization', () => {
    it('should create a worker instance', () => {
      expect(mockWorker).toBeDefined();
      expect(mockWorker).toBeInstanceOf(MockWorker);
    });
    
    it('should set up message and error handlers', () => {
      expect(mockWorker.onmessage).toBeDefined();
      expect(mockWorker.onerror).toBeDefined();
    });
  });
  
  describe('Message Processing', () => {
    it('should process audio data', async () => {
      const audioData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
      const promise = manager.processAudio(audioData);
      
      // Verify message was sent to worker
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'process',
        data: audioData
      });
      
      // Simulate worker response
      mockWorker.simulateMessage({
        type: 'processed',
        data: new Float32Array([0.2, 0.3, 0.4, 0.5, 0.6])
      });
      
      const result = await promise;
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(5);
    });
    
    it('should handle multiple concurrent processing requests', async () => {
      const data1 = new Float32Array([0.1, 0.2]);
      const data2 = new Float32Array([0.3, 0.4]);
      const data3 = new Float32Array([0.5, 0.6]);
      
      const promise1 = manager.processAudio(data1);
      const promise2 = manager.processAudio(data2);
      const promise3 = manager.processAudio(data3);
      
      // Simulate responses in different order
      mockWorker.simulateMessage({
        type: 'processed',
        data: new Float32Array([0.3, 0.4])
      });
      mockWorker.simulateMessage({
        type: 'processed',
        data: new Float32Array([0.1, 0.2])
      });
      mockWorker.simulateMessage({
        type: 'processed',
        data: new Float32Array([0.5, 0.6])
      });
      
      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toHaveLength(3);
      expect(results.every(r => r instanceof Float32Array)).toBe(true);
    });
  });
  
  describe('Configuration', () => {
    it('should update worker configuration', () => {
      const config = {
        enableNoiseSuppression: true,
        targetLevel: 0.7,
        algorithm: 'rnnoise' as const
      };
      
      manager.updateConfig(config);
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'config',
        data: config
      });
    });
    
    it('should handle partial configuration updates', () => {
      manager.updateConfig({ targetLevel: 0.5 });
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'config',
        data: { targetLevel: 0.5 }
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle worker errors', async () => {
      const promise = manager.processAudio(new Float32Array([0.1]));
      
      // Simulate worker error
      mockWorker.simulateMessage({
        type: 'error',
        error: 'Processing failed'
      });
      
      await expect(promise).rejects.toThrow('Processing failed');
    });
    
    it('should handle worker crash', () => {
      const errorCallback = vi.fn();
      manager.on('error', errorCallback);
      
      const error = new Error('Worker crashed');
      mockWorker.simulateError(error);
      
      expect(errorCallback).toHaveBeenCalledWith(error);
    });
    
    it('should reject pending promises on termination', async () => {
      const promise1 = manager.processAudio(new Float32Array([0.1]));
      const promise2 = manager.processAudio(new Float32Array([0.2]));
      
      manager.terminate();
      
      await expect(promise1).rejects.toThrow('Worker terminated');
      await expect(promise2).rejects.toThrow('Worker terminated');
    });
  });
  
  describe('Performance Metrics', () => {
    it('should track processing performance', async () => {
      const metricsCallback = vi.fn();
      manager.on('metrics', metricsCallback);
      
      const audioData = new Float32Array([0.1, 0.2, 0.3]);
      const promise = manager.processAudio(audioData);
      
      // Simulate worker response with metrics
      mockWorker.simulateMessage({
        type: 'processed',
        data: new Float32Array([0.2, 0.3, 0.4]),
        metrics: {
          processingTime: 5.5,
          bufferSize: 3
        }
      });
      
      await promise;
      
      expect(metricsCallback).toHaveBeenCalledWith({
        processingTime: 5.5,
        bufferSize: 3
      });
    });
    
    it('should get current metrics', async () => {
      const audioData = new Float32Array(1024);
      const promise = manager.processAudio(audioData);
      
      mockWorker.simulateMessage({
        type: 'processed',
        data: new Float32Array(1024),
        metrics: {
          processingTime: 10,
          bufferSize: 1024
        }
      });
      
      await promise;
      
      const metrics = manager.getMetrics();
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('totalProcessed');
      expect(metrics.totalProcessed).toBe(1);
    });
  });
  
  describe('Worker State Management', () => {
    it('should initialize worker state', () => {
      manager.initialize();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'init'
      });
    });
    
    it('should reset worker state', () => {
      manager.reset();
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'reset'
      });
    });
    
    it('should check if worker is ready', () => {
      expect(manager.isReady()).toBe(true);
      
      manager.terminate();
      expect(manager.isReady()).toBe(false);
    });
  });
  
  describe('Termination', () => {
    it('should terminate worker properly', () => {
      manager.terminate();
      
      expect(mockWorker.terminate).toHaveBeenCalled();
      expect((manager as any).worker).toBeNull();
    });
    
    it('should handle multiple termination calls', () => {
      manager.terminate();
      manager.terminate();
      
      expect(mockWorker.terminate).toHaveBeenCalledTimes(1);
    });
    
    it('should clear pending operations on termination', async () => {
      const promises = [
        manager.processAudio(new Float32Array([0.1])),
        manager.processAudio(new Float32Array([0.2])),
        manager.processAudio(new Float32Array([0.3]))
      ];
      
      manager.terminate();
      
      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Worker terminated');
      }
    });
  });
  
  describe('Message Queue', () => {
    it('should handle message queue when worker is busy', () => {
      // Send multiple messages quickly
      for (let i = 0; i < 10; i++) {
        manager.processAudio(new Float32Array([i * 0.1]));
      }
      
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(10);
    });
    
    it('should maintain message order', async () => {
      const results: Float32Array[] = [];
      
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          manager.processAudio(new Float32Array([i])).then(r => results.push(r))
        );
      }
      
      // Respond in order
      for (let i = 0; i < 5; i++) {
        mockWorker.simulateMessage({
          type: 'processed',
          data: new Float32Array([i * 2])
        });
      }
      
      await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      for (let i = 0; i < 5; i++) {
        expect(results[i][0]).toBe(i * 2);
      }
    });
  });
  
  describe('Special Messages', () => {
    it('should handle status messages', () => {
      const statusCallback = vi.fn();
      manager.on('status', statusCallback);
      
      mockWorker.simulateMessage({
        type: 'status',
        status: 'ready',
        info: { initialized: true }
      });
      
      expect(statusCallback).toHaveBeenCalledWith({
        status: 'ready',
        info: { initialized: true }
      });
    });
    
    it('should handle unknown message types', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockWorker.simulateMessage({
        type: 'unknown',
        data: 'test'
      });
      
      expect(warnSpy).toHaveBeenCalledWith('Unknown message type:', 'unknown');
      
      warnSpy.mockRestore();
    });
  });
});