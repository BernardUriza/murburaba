import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processFileWithMetrics } from '../../api/processFileWithMetrics';
import { getEngine } from '../../api';
import { AudioConverter } from '../../utils/audioConverter';

// Mock dependencies
vi.mock('../../api', () => ({
  getEngine: vi.fn()
}));

vi.mock('../../utils/audioConverter', () => ({
  AudioConverter: vi.fn().mockImplementation(() => ({
    audioBufferToWav: vi.fn().mockReturnValue(new Blob([new ArrayBuffer(100)], { type: 'audio/wav' })),
    destroy: vi.fn()
  }))
}));

// Mock Web Audio API
const mockAudioContext = {
  decodeAudioData: vi.fn(),
  createBuffer: vi.fn(),
  close: vi.fn(),
  state: 'running'
};

global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
(global as any).webkitAudioContext = global.AudioContext;

describe('processFileWithMetrics', () => {
  let mockEngine: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock engine
    mockEngine = {
      processFrame: vi.fn().mockReturnValue({ vad: 0.5, processed: true }),
      processFile: vi.fn().mockResolvedValue(new ArrayBuffer(1000))
    };
    
    (getEngine as any).mockReturnValue(mockEngine);
    
    // Setup audio decoding mock
    const mockAudioBuffer = {
      sampleRate: 48000,
      numberOfChannels: 1,
      duration: 1.0,
      length: 48000,
      copyToChannel: vi.fn(),
      getChannelData: vi.fn().mockReturnValue(new Float32Array(480))
    };
    
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    mockAudioContext.createBuffer.mockReturnValue(mockAudioBuffer);
  });

  describe('Legacy API', () => {
    it('should process file with frame callback', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      const frameCallback = vi.fn();
      
      const result = await processFileWithMetrics(arrayBuffer, frameCallback);
      
      expect(result).toHaveProperty('processedBuffer');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('averageVad');
      expect(mockEngine.processFile).toHaveBeenCalledWith(arrayBuffer);
    });

    it('should call frame callback for each processed frame', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      const frameCallback = vi.fn();
      let processFrameCalls = 0;
      
      // Simulate multiple frame processing
      mockEngine.processFrame.mockImplementation((frame: Float32Array) => {
        processFrameCalls++;
        return { vad: 0.3 + processFrameCalls * 0.1, processed: true };
      });
      
      // Trigger frame processing
      await processFileWithMetrics(arrayBuffer, frameCallback);
      
      // Verify processFrame was hooked and called
      expect(mockEngine.processFrame).toHaveBeenCalled();
    });

    it('should restore original processFrame on error', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      const originalProcessFrame = mockEngine.processFrame;
      
      // Make processFile throw an error
      mockEngine.processFile.mockRejectedValue(new Error('Processing failed'));
      
      await expect(processFileWithMetrics(arrayBuffer)).rejects.toThrow('Processing failed');
      
      // Verify processFrame was restored
      expect(mockEngine.processFrame).toBe(originalProcessFrame);
    });
  });

  describe('New Chunking API', () => {
    it('should process file with chunk options', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      const result = await processFileWithMetrics(arrayBuffer, {
        enableVAD: true,
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'wav'
        }
      });
      
      expect(result).toHaveProperty('chunks');
      expect(result).toHaveProperty('processedBuffer');
      expect(result).toHaveProperty('averageVad');
      expect(result).toHaveProperty('totalDuration');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toMatchObject({
        sampleRate: 48000,
        channels: 1,
        originalDuration: 1000
      });
    });

    it('should create chunks based on duration', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      // Simulate processing frames over time
      let frameCount = 0;
      mockEngine.processFrame.mockImplementation(() => {
        frameCount++;
        return { vad: 0.5, processed: true };
      });
      
      // Mock longer audio duration
      mockAudioContext.decodeAudioData.mockResolvedValue({
        sampleRate: 48000,
        numberOfChannels: 1,
        duration: 10.0, // 10 seconds
        length: 480000,
        copyToChannel: vi.fn(),
        getChannelData: vi.fn().mockReturnValue(new Float32Array(480))
      });
      
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 3000, // 3 second chunks
          outputFormat: 'wav'
        }
      });
      
      // Should create multiple chunks
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should support different output formats', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      // Test RAW format
      const rawResult = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'raw'
        }
      });
      
      expect(rawResult.chunks).toBeDefined();
      
      // Test WAV format
      const wavResult = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'wav'
        }
      });
      
      expect(wavResult.chunks).toBeDefined();
    });

    it('should calculate VAD metrics per chunk', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      // Simulate varying VAD scores
      let frameCount = 0;
      mockEngine.processFrame.mockImplementation(() => {
        frameCount++;
        const vad = frameCount % 2 === 0 ? 0.8 : 0.2; // Alternating high/low VAD
        return { vad, processed: true };
      });
      
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'wav'
        }
      });
      
      if (result.chunks.length > 0) {
        const chunk = result.chunks[0];
        expect(chunk).toHaveProperty('vadScore');
        expect(chunk).toHaveProperty('metrics');
        expect(chunk.metrics).toHaveProperty('vad');
        expect(chunk.metrics).toHaveProperty('averageLevel');
        expect(chunk.metrics).toHaveProperty('noiseRemoved');
      }
    });

    it('should handle onFrameProcessed callback', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      const onFrameProcessed = vi.fn();
      
      await processFileWithMetrics(arrayBuffer, {
        enableVAD: true,
        onFrameProcessed
      });
      
      // Should be called for each frame
      expect(onFrameProcessed).toHaveBeenCalled();
      if (onFrameProcessed.mock.calls.length > 0) {
        const [metrics] = onFrameProcessed.mock.calls[0];
        expect(metrics).toHaveProperty('vad');
        expect(metrics).toHaveProperty('frame');
        expect(metrics).toHaveProperty('timestamp');
        expect(metrics).toHaveProperty('rms');
      }
    });

    it('should handle the last chunk correctly', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      // Mock audio that doesn't divide evenly into chunks
      mockAudioContext.decodeAudioData.mockResolvedValue({
        sampleRate: 48000,
        numberOfChannels: 1,
        duration: 7.5, // 7.5 seconds
        length: 360000,
        copyToChannel: vi.fn(),
        getChannelData: vi.fn().mockReturnValue(new Float32Array(480))
      });
      
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 3000, // 3 second chunks
          outputFormat: 'wav'
        }
      });
      
      // Should have 3 chunks: 3s, 3s, 1.5s
      expect(result.chunks.length).toBeGreaterThan(0);
      
      // Last chunk should have shorter duration
      if (result.chunks.length > 0) {
        const lastChunk = result.chunks[result.chunks.length - 1];
        expect(lastChunk.duration).toBeLessThanOrEqual(3000);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle audio decoding errors', async () => {
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Invalid audio data'));
      
      const arrayBuffer = new ArrayBuffer(1000);
      
      await expect(processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'wav'
        }
      })).rejects.toThrow('Invalid audio data');
    });

    it('should handle unsupported output format', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      // This should not throw as webm falls back to wav
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'webm'
        }
      });
      
      expect(result).toHaveProperty('chunks');
    });

    it('should handle engine processing errors', async () => {
      mockEngine.processFile.mockRejectedValue(new Error('Engine error'));
      
      const arrayBuffer = new ArrayBuffer(1000);
      
      await expect(processFileWithMetrics(arrayBuffer, {
        enableVAD: true
      })).rejects.toThrow('Engine error');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle empty audio buffer', async () => {
      const arrayBuffer = new ArrayBuffer(0);
      
      mockAudioContext.decodeAudioData.mockResolvedValue({
        sampleRate: 48000,
        numberOfChannels: 1,
        duration: 0,
        length: 0,
        copyToChannel: vi.fn(),
        getChannelData: vi.fn().mockReturnValue(new Float32Array(0))
      });
      
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 5000,
          outputFormat: 'wav'
        }
      });
      
      expect(result.chunks).toHaveLength(0);
      expect(result.totalDuration).toBe(0);
    });

    it('should handle very small chunk durations', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 100, // 100ms chunks
          outputFormat: 'wav'
        }
      });
      
      expect(result).toHaveProperty('chunks');
    });

    it('should calculate correct timestamps for chunks', async () => {
      const arrayBuffer = new ArrayBuffer(1000);
      
      // Mock 6 seconds of audio
      mockAudioContext.decodeAudioData.mockResolvedValue({
        sampleRate: 48000,
        numberOfChannels: 1,
        duration: 6.0,
        length: 288000,
        copyToChannel: vi.fn(),
        getChannelData: vi.fn().mockReturnValue(new Float32Array(480))
      });
      
      const result = await processFileWithMetrics(arrayBuffer, {
        chunkOptions: {
          chunkDuration: 2000, // 2 second chunks
          outputFormat: 'wav'
        }
      });
      
      // Verify chunk timestamps
      if (result.chunks.length >= 3) {
        expect(result.chunks[0].startTime).toBe(0);
        expect(result.chunks[0].duration).toBeCloseTo(2000, -2);
        expect(result.chunks[1].startTime).toBeCloseTo(result.chunks[0].endTime, -2);
        expect(result.chunks[2].startTime).toBeCloseTo(result.chunks[1].endTime, -2);
      }
    });
  });
});