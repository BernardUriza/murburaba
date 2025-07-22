import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioStreamManager } from '../../utils/AudioStreamManager';

describe('AudioStreamManager - Critical Stream Management', () => {
  let audioContext: any;
  let manager: AudioStreamManager;
  let mockStream: MediaStream;
  let mockTrack: MediaStreamTrack;
  let mockSource: MediaStreamAudioSourceNode;

  beforeEach(() => {
    // Mock MediaStreamTrack
    mockTrack = {
      stop: vi.fn(),
      kind: 'audio',
      id: 'track-123',
      enabled: true,
      readyState: 'live'
    } as any;

    // Mock MediaStream
    mockStream = {
      id: 'stream-123',
      active: true,
      getTracks: vi.fn(() => [mockTrack]),
      getAudioTracks: vi.fn(() => [mockTrack]),
      addTrack: vi.fn(),
      removeTrack: vi.fn()
    } as any;

    // Mock MediaStreamAudioSourceNode
    mockSource = {
      disconnect: vi.fn(),
      connect: vi.fn(),
      context: audioContext,
      numberOfInputs: 0,
      numberOfOutputs: 1
    } as any;

    // Mock AudioContext
    audioContext = {
      createMediaStreamSource: vi.fn(() => mockSource),
      state: 'running',
      currentTime: 0
    };

    manager = new AudioStreamManager(audioContext);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Stream Addition', () => {
    it('should add a new stream and return source node', () => {
      const source = manager.addStream('test-1', mockStream);

      expect(audioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
      expect(source).toBe(mockSource);
      expect(manager.size).toBe(1);
    });

    it('should replace existing stream with same ID', () => {
      const oldStream = { ...mockStream, id: 'old-stream' };
      manager.addStream('test-1', oldStream as any);
      
      const source = manager.addStream('test-1', mockStream);

      expect(manager.size).toBe(1);
      expect(manager.getStream('test-1')).toBe(mockStream);
    });

    it('should cleanup old stream when replacing', () => {
      const oldTrack = { stop: vi.fn() };
      const oldStream = {
        getTracks: vi.fn(() => [oldTrack])
      };
      const oldSource = { disconnect: vi.fn() };
      
      audioContext.createMediaStreamSource
        .mockReturnValueOnce(oldSource)
        .mockReturnValueOnce(mockSource);

      manager.addStream('test-1', oldStream as any);
      manager.addStream('test-1', mockStream);

      expect(oldTrack.stop).toHaveBeenCalled();
      expect(oldSource.disconnect).toHaveBeenCalled();
    });

    it('should handle multiple concurrent streams', () => {
      const streams = Array.from({ length: 10 }, (_, i) => ({
        ...mockStream,
        id: `stream-${i}`
      }));

      streams.forEach((stream, i) => {
        manager.addStream(`test-${i}`, stream as any);
      });

      expect(manager.size).toBe(10);
      expect(audioContext.createMediaStreamSource).toHaveBeenCalledTimes(10);
    });

    it('should maintain stream-source mapping integrity', () => {
      const source = manager.addStream('test-1', mockStream);

      expect(manager.getStream('test-1')).toBe(mockStream);
      expect(manager.getSource('test-1')).toBe(source);
    });
  });

  describe('Stream Retrieval', () => {
    it('should retrieve existing stream by ID', () => {
      manager.addStream('test-1', mockStream);
      
      const retrieved = manager.getStream('test-1');
      
      expect(retrieved).toBe(mockStream);
    });

    it('should return undefined for non-existent stream', () => {
      const retrieved = manager.getStream('non-existent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should retrieve existing source by ID', () => {
      const source = manager.addStream('test-1', mockStream);
      
      const retrieved = manager.getSource('test-1');
      
      expect(retrieved).toBe(source);
    });

    it('should return undefined for non-existent source', () => {
      const retrieved = manager.getSource('non-existent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should handle retrieval after removal', () => {
      manager.addStream('test-1', mockStream);
      manager.removeStream('test-1');
      
      expect(manager.getStream('test-1')).toBeUndefined();
      expect(manager.getSource('test-1')).toBeUndefined();
    });
  });

  describe('Stream Removal', () => {
    it('should remove stream and cleanup tracks', () => {
      manager.addStream('test-1', mockStream);
      
      manager.removeStream('test-1');
      
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(mockSource.disconnect).toHaveBeenCalled();
      expect(manager.size).toBe(0);
    });

    it('should handle removal of non-existent stream', () => {
      expect(() => manager.removeStream('non-existent')).not.toThrow();
    });

    it('should cleanup multiple tracks in stream', () => {
      const tracks = [
        { stop: vi.fn(), kind: 'audio' },
        { stop: vi.fn(), kind: 'audio' }
      ];
      mockStream.getTracks = vi.fn(() => tracks);
      
      manager.addStream('test-1', mockStream);
      manager.removeStream('test-1');
      
      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    it('should not affect other streams when removing one', () => {
      const stream2 = { ...mockStream, id: 'stream-2' };
      manager.addStream('test-1', mockStream);
      manager.addStream('test-2', stream2 as any);
      
      manager.removeStream('test-1');
      
      expect(manager.size).toBe(1);
      expect(manager.getStream('test-2')).toBe(stream2);
    });

    it('should handle partial cleanup (stream exists but no source)', () => {
      // Manually add stream without source
      (manager as any).streams.set('test-1', mockStream);
      
      expect(() => manager.removeStream('test-1')).not.toThrow();
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  describe('Bulk Operations', () => {
    it('should remove all streams at once', () => {
      const streams = Array.from({ length: 5 }, (_, i) => ({
        ...mockStream,
        id: `stream-${i}`,
        getTracks: vi.fn(() => [{ stop: vi.fn() }])
      }));

      streams.forEach((stream, i) => {
        manager.addStream(`test-${i}`, stream as any);
      });

      manager.removeAllStreams();
      
      expect(manager.size).toBe(0);
      streams.forEach(stream => {
        expect(stream.getTracks).toHaveBeenCalled();
      });
    });

    it('should handle removeAllStreams on empty manager', () => {
      expect(() => manager.removeAllStreams()).not.toThrow();
      expect(manager.size).toBe(0);
    });

    it('should maintain consistency during concurrent operations', () => {
      // Add streams
      for (let i = 0; i < 3; i++) {
        manager.addStream(`test-${i}`, { ...mockStream, id: `stream-${i}` } as any);
      }

      // Remove middle one
      manager.removeStream('test-1');
      
      // Add new one
      manager.addStream('test-3', { ...mockStream, id: 'stream-3' } as any);
      
      expect(manager.size).toBe(3);
      expect(manager.getStream('test-0')).toBeDefined();
      expect(manager.getStream('test-1')).toBeUndefined();
      expect(manager.getStream('test-2')).toBeDefined();
      expect(manager.getStream('test-3')).toBeDefined();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle stream with no tracks', () => {
      mockStream.getTracks = vi.fn(() => []);
      
      manager.addStream('test-1', mockStream);
      
      expect(() => manager.removeStream('test-1')).not.toThrow();
    });

    it('should handle track.stop() throwing error', () => {
      mockTrack.stop = vi.fn(() => {
        throw new Error('Track already stopped');
      });
      
      manager.addStream('test-1', mockStream);
      
      expect(() => manager.removeStream('test-1')).not.toThrow();
      expect(mockSource.disconnect).toHaveBeenCalled();
    });

    it('should handle source.disconnect() throwing error', () => {
      mockSource.disconnect = vi.fn(() => {
        throw new Error('Already disconnected');
      });
      
      manager.addStream('test-1', mockStream);
      
      expect(() => manager.removeStream('test-1')).not.toThrow();
      expect(mockTrack.stop).toHaveBeenCalled();
    });

    it('should handle AudioContext in closed state', () => {
      audioContext.state = 'closed';
      
      const source = manager.addStream('test-1', mockStream);
      
      expect(source).toBe(mockSource);
      expect(audioContext.createMediaStreamSource).toHaveBeenCalled();
    });
  });
});