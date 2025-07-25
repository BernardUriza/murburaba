import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChunkProcessor } from '../../../managers/ChunkProcessor';
import { EventEmitter } from '../../../core/EventEmitter';

describe('ChunkProcessor', () => {
  let processor: ChunkProcessor;
  let mockEventEmitter: EventEmitter;
  let mockMediaRecorder: any;
  let mockStream: MediaStream;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventEmitter = new EventEmitter();
    
    // Create mock MediaStream
    mockStream = {
      id: 'test-stream',
      getAudioTracks: () => [{
        id: 'audio-track-1',
        kind: 'audio',
        enabled: true,
      }],
    } as any;
    
    // Mock MediaRecorder
    mockMediaRecorder = {
      state: 'inactive',
      ondataavailable: null,
      onstop: null,
      onerror: null,
      start: vi.fn(function() {
        this.state = 'recording';
      }),
      stop: vi.fn(function() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    // Mock MediaRecorder constructor
    global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
    global.MediaRecorder.isTypeSupported = vi.fn(() => true);
    
    processor = new ChunkProcessor(
      mockStream,
      { 
        chunkDuration: 1000,
        mimeType: 'audio/webm;codecs=opus'
      },
      mockEventEmitter
    );
  });
  
  afterEach(() => {
    processor.stop();
  });
  
  describe('Initialization', () => {
    it('should create processor with default options', () => {
      const defaultProcessor = new ChunkProcessor(mockStream, {}, mockEventEmitter);
      expect(defaultProcessor).toBeDefined();
    });
    
    it('should create processor with custom chunk duration', () => {
      const customProcessor = new ChunkProcessor(
        mockStream,
        { chunkDuration: 2000 },
        mockEventEmitter
      );
      expect(customProcessor).toBeDefined();
    });
    
    it('should validate mime type support', () => {
      global.MediaRecorder.isTypeSupported = vi.fn(() => false);
      
      expect(() => new ChunkProcessor(
        mockStream,
        { mimeType: 'unsupported/type' },
        mockEventEmitter
      )).toThrow();
    });
  });
  
  describe('Recording', () => {
    it('should start recording when start is called', () => {
      processor.start();
      
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
      expect(processor.isRecording()).toBe(true);
    });
    
    it('should stop recording when stop is called', () => {
      processor.start();
      processor.stop();
      
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(processor.isRecording()).toBe(false);
    });
    
    it('should handle multiple start calls gracefully', () => {
      processor.start();
      processor.start();
      
      expect(mockMediaRecorder.start).toHaveBeenCalledTimes(1);
    });
    
    it('should handle stop without start', () => {
      expect(() => processor.stop()).not.toThrow();
    });
  });
  
  describe('Chunk Processing', () => {
    it('should emit chunk-ready event when data is available', async () => {
      const chunkReadySpy = vi.fn();
      mockEventEmitter.on('chunk-ready', chunkReadySpy);
      
      processor.start();
      
      // Simulate data available
      const mockBlob = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable({ data: mockBlob });
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chunkReadySpy).toHaveBeenCalled();
      const chunk = chunkReadySpy.mock.calls[0][0];
      expect(chunk).toHaveProperty('blob', mockBlob);
      expect(chunk).toHaveProperty('startTime');
      expect(chunk).toHaveProperty('endTime');
      expect(chunk).toHaveProperty('duration');
    });
    
    it('should handle empty blobs', async () => {
      const chunkReadySpy = vi.fn();
      mockEventEmitter.on('chunk-ready', chunkReadySpy);
      
      processor.start();
      
      // Simulate empty data
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable({ data: emptyBlob });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chunkReadySpy).not.toHaveBeenCalled();
    });
    
    it('should calculate correct timestamps for chunks', async () => {
      const chunkReadySpy = vi.fn();
      mockEventEmitter.on('chunk-ready', chunkReadySpy);
      
      processor.start();
      
      // Simulate multiple chunks
      const blob1 = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
      const blob2 = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
      
      mockMediaRecorder.ondataavailable({ data: blob1 });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Advance time
      vi.advanceTimersByTime(1000);
      
      mockMediaRecorder.ondataavailable({ data: blob2 });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chunkReadySpy).toHaveBeenCalledTimes(2);
      
      const chunk1 = chunkReadySpy.mock.calls[0][0];
      const chunk2 = chunkReadySpy.mock.calls[1][0];
      
      expect(chunk2.startTime).toBeGreaterThan(chunk1.startTime);
      expect(chunk1.duration).toBeCloseTo(1000, -2);
    });
  });
  
  describe('Error Handling', () => {
    it('should emit error event on MediaRecorder error', () => {
      const errorSpy = vi.fn();
      mockEventEmitter.on('chunk-error', errorSpy);
      
      processor.start();
      
      const mockError = new Error('MediaRecorder error');
      mockMediaRecorder.onerror({ error: mockError });
      
      expect(errorSpy).toHaveBeenCalledWith(mockError);
    });
    
    it('should handle errors during chunk processing', async () => {
      const errorSpy = vi.fn();
      mockEventEmitter.on('chunk-error', errorSpy);
      
      processor.start();
      
      // Simulate an error by passing invalid data
      mockMediaRecorder.ondataavailable({ data: null });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(errorSpy).toHaveBeenCalled();
    });
  });
  
  describe('Flush', () => {
    it('should flush remaining data when flush is called', () => {
      processor.start();
      
      const stopSpy = vi.spyOn(mockMediaRecorder, 'stop');
      processor.flush();
      
      expect(stopSpy).toHaveBeenCalled();
    });
    
    it('should handle flush without active recording', () => {
      expect(() => processor.flush()).not.toThrow();
    });
    
    it('should restart recording after flush if was recording', () => {
      processor.start();
      processor.flush();
      
      // Should stop and restart
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(mockMediaRecorder.start).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Metadata', () => {
    it('should add metadata to chunks', async () => {
      const chunkReadySpy = vi.fn();
      mockEventEmitter.on('chunk-ready', chunkReadySpy);
      
      const metadata = { 
        vadScore: 0.8,
        noiseLevel: 0.2 
      };
      
      processor.setMetadata(metadata);
      processor.start();
      
      const mockBlob = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable({ data: mockBlob });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const chunk = chunkReadySpy.mock.calls[0][0];
      expect(chunk.metadata).toEqual(metadata);
    });
    
    it('should update metadata for subsequent chunks', async () => {
      const chunkReadySpy = vi.fn();
      mockEventEmitter.on('chunk-ready', chunkReadySpy);
      
      processor.start();
      
      // First chunk with metadata
      processor.setMetadata({ vadScore: 0.8 });
      const blob1 = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable({ data: blob1 });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update metadata for second chunk
      processor.setMetadata({ vadScore: 0.3 });
      const blob2 = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable({ data: blob2 });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chunkReadySpy).toHaveBeenCalledTimes(2);
      expect(chunkReadySpy.mock.calls[0][0].metadata.vadScore).toBe(0.8);
      expect(chunkReadySpy.mock.calls[1][0].metadata.vadScore).toBe(0.3);
    });
  });
  
  describe('State Management', () => {
    it('should track recording state correctly', () => {
      expect(processor.isRecording()).toBe(false);
      
      processor.start();
      expect(processor.isRecording()).toBe(true);
      
      processor.stop();
      expect(processor.isRecording()).toBe(false);
    });
    
    it('should return current chunk count', async () => {
      const chunkReadySpy = vi.fn();
      mockEventEmitter.on('chunk-ready', chunkReadySpy);
      
      expect(processor.getChunkCount()).toBe(0);
      
      processor.start();
      
      // Process multiple chunks
      for (let i = 0; i < 3; i++) {
        const blob = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
        mockMediaRecorder.ondataavailable({ data: blob });
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      expect(processor.getChunkCount()).toBe(3);
    });
    
    it('should reset chunk count on stop', async () => {
      processor.start();
      
      const blob = new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' });
      mockMediaRecorder.ondataavailable({ data: blob });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(processor.getChunkCount()).toBe(1);
      
      processor.stop();
      processor.start();
      
      expect(processor.getChunkCount()).toBe(0);
    });
  });
  
  describe('Options Validation', () => {
    it('should validate chunk duration', () => {
      expect(() => new ChunkProcessor(
        mockStream,
        { chunkDuration: -1000 },
        mockEventEmitter
      )).toThrow();
      
      expect(() => new ChunkProcessor(
        mockStream,
        { chunkDuration: 0 },
        mockEventEmitter
      )).toThrow();
    });
    
    it('should use default mime type if not specified', () => {
      const defaultProcessor = new ChunkProcessor(mockStream, {}, mockEventEmitter);
      expect(defaultProcessor).toBeDefined();
    });
  });
});