/**
 * FileProcessor Unit Tests
 * 
 * Tests the dedicated file processing with chunking support module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileProcessor } from '../../../audio/FileProcessor';
import { WasmManager } from '../../../audio/WasmManager';

// Mock AudioResampler
vi.mock('../../../utils/AudioResampler', () => ({
  AudioResampler: {
    resampleToRNNoiseRate: vi.fn(),
  },
}));

// Helper function to create mock WAV buffer - moved to module scope
function createMockWavBuffer(): ArrayBuffer {
  // Create a minimal valid WAV file buffer
  const buffer = new ArrayBuffer(44 + 960); // Header + 480 samples * 2 bytes
  const view = new DataView(buffer);
  
  // RIFF header
  view.setUint32(0, 0x46464952, false); // 'RIFF'
  view.setUint32(4, buffer.byteLength - 8, true); // File size - 8
  view.setUint32(8, 0x45564157, false); // 'WAVE'
  
  // fmt chunk
  view.setUint32(12, 0x20746D66, false); // 'fmt '
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, 48000, true); // Sample rate
  view.setUint32(28, 96000, true); // Byte rate (48000 * 2)
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  
  // data chunk
  view.setUint32(36, 0x61746164, false); // 'data'
  view.setUint32(40, 960, true); // Data size (480 samples * 2 bytes)
  
  // Add some sample data (480 samples)
  const samples = new Int16Array(buffer, 44, 480);
  for (let i = 0; i < 480; i++) {
    samples[i] = Math.sin(i * 0.1) * 16384; // Sine wave
  }
  
  return buffer;
}

describe('FileProcessor', () => {
  let fileProcessor: FileProcessor;
  let mockWasmManager: WasmManager;
  let mockLogger: any;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    // Mock WasmManager
    mockWasmManager = {
      isInitialized: vi.fn().mockReturnValue(true),
      initialize: vi.fn().mockResolvedValue(undefined),
      getModule: vi.fn().mockReturnValue({
        _rnnoise_create: vi.fn().mockReturnValue(123),
        _rnnoise_destroy: vi.fn(),
        _rnnoise_process_frame: vi.fn().mockReturnValue(0.7),
        _malloc: vi.fn().mockReturnValue(456),
        _free: vi.fn(),
        HEAPF32: new Float32Array(1024),
      }),
      createState: vi.fn().mockReturnValue(123),
      destroyState: vi.fn(),
      allocateMemory: vi.fn().mockReturnValue(456),
      freeMemory: vi.fn(),
    } as any;

    fileProcessor = new FileProcessor(mockWasmManager, {
      logger: mockLogger,
      enableResampling: true,
      chunkSize: 1024,
    });
  });

  describe('initialization', () => {
    it('should create FileProcessor with correct config', () => {
      expect(fileProcessor).toBeDefined();
    });

    it('should handle missing config gracefully', () => {
      const processor = new FileProcessor(mockWasmManager);
      expect(processor).toBeDefined();
    });
  });

  describe('WAV file parsing', () => {

    it('should parse valid WAV file', async () => {
      const mockBuffer = createMockWavBuffer();
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      const result = await fileProcessor.processFile(mockBuffer);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Processing WAV file')
      );
    });

    it('should reject invalid WAV file (no RIFF header)', async () => {
      const invalidBuffer = new ArrayBuffer(44);
      const view = new DataView(invalidBuffer);
      view.setUint32(0, 0x12345678); // Invalid header
      
      await expect(fileProcessor.processFile(invalidBuffer)).rejects.toThrow(
        'Not a valid WAV file: missing RIFF header'
      );
    });

    it('should reject file with wrong format', async () => {
      const buffer = createMockWavBuffer();
      const view = new DataView(buffer);
      
      // Change format to non-PCM
      view.setUint16(20, 3, true); // IEEE float format instead of PCM
      
      await expect(fileProcessor.processFile(buffer)).rejects.toThrow(
        'Unsupported audio format: 3. Only PCM (format 1) is supported'
      );
    });

    it('should reject stereo files', async () => {
      const buffer = createMockWavBuffer();
      const view = new DataView(buffer);
      
      // Change to stereo
      view.setUint16(22, 2, true); // 2 channels
      
      await expect(fileProcessor.processFile(buffer)).rejects.toThrow(
        'Unsupported channel count: 2. Only mono (1 channel) is supported'
      );
    });
  });

  describe('audio processing', () => {
    it('should process audio frames and report progress', async () => {
      const mockBuffer = createMockWavBuffer();
      const progressSpy = vi.fn();
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480), // Exactly 1 frame
        outputSampleRate: 48000,
        wasResampled: false,
      });

      await fileProcessor.processFile(mockBuffer, progressSpy);
      
      expect(progressSpy).toHaveBeenCalledWith({
        frameIndex: 0,
        totalFrames: 1,
        progress: 0,
        vad: 0.7,
        noiseReduction: expect.any(Number),
      });
    });

    it('should handle resampling when needed', async () => {
      const mockBuffer = createMockWavBuffer();
      
      // Mock resampler to simulate different sample rate
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(960), // Upsampled to 2x
        outputSampleRate: 48000,
        wasResampled: true,
      });

      const result = await fileProcessor.processFile(mockBuffer);
      
      expect(AudioResampler.resampleToRNNoiseRate).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should skip resampling when disabled', async () => {
      const processorNoResampling = new FileProcessor(mockWasmManager, {
        enableResampling: false,
      });
      
      const mockBuffer = createMockWavBuffer();
      
      const result = await processorNoResampling.processFile(mockBuffer);
      
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      expect(AudioResampler.resampleToRNNoiseRate).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('WASM integration', () => {
    it('should initialize WASM if not already initialized', async () => {
      vi.mocked(mockWasmManager.isInitialized).mockReturnValue(false);
      
      const mockBuffer = createMockWavBuffer();
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      await fileProcessor.processFile(mockBuffer);
      
      expect(mockWasmManager.initialize).toHaveBeenCalled();
    });

    it('should properly manage WASM memory during processing', async () => {
      const mockBuffer = createMockWavBuffer();
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      await fileProcessor.processFile(mockBuffer);
      
      // Verify memory allocation and cleanup
      expect(mockWasmManager.createState).toHaveBeenCalled();
      expect(mockWasmManager.allocateMemory).toHaveBeenCalledTimes(2); // Input and output
      expect(mockWasmManager.freeMemory).toHaveBeenCalledTimes(2);
      expect(mockWasmManager.destroyState).toHaveBeenCalled();
    });
  });

  describe('metrics calculation', () => {
    it('should calculate VAD and noise reduction metrics', async () => {
      const mockBuffer = createMockWavBuffer();
      const progressSpy = vi.fn();
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      await fileProcessor.processFile(mockBuffer, progressSpy);
      
      const progressCall = progressSpy.mock.calls[0][0];
      expect(progressCall.vad).toBe(0.7); // From mock WASM
      expect(progressCall.noiseReduction).toBeGreaterThanOrEqual(0);
      expect(progressCall.progress).toBeGreaterThanOrEqual(0);
      expect(progressCall.progress).toBeLessThanOrEqual(100);
    });

    it('should log processing summary', async () => {
      const mockBuffer = createMockWavBuffer();
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      await fileProcessor.processFile(mockBuffer);
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Processing complete: Average VAD:')
      );
    });
  });

  describe('output generation', () => {
    it('should create valid WAV output', async () => {
      const mockBuffer = createMockWavBuffer();
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      const result = await fileProcessor.processFile(mockBuffer);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(44); // At least WAV header size
      
      // Verify WAV header
      const view = new DataView(result);
      const riff = String.fromCharCode(
        view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
      );
      expect(riff).toBe('RIFF');
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      const mockBuffer = createMockWavBuffer();
      
      // Mock WASM to throw error
      vi.mocked(mockWasmManager.getModule).mockReturnValue(null);
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      const result = await fileProcessor.processFile(mockBuffer);
      
      // Should still produce output (fallback processing)
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should cleanup resources even if processing fails', async () => {
      const mockBuffer = createMockWavBuffer();
      
      // Mock frame processor to throw error after allocation
      const mockModule = mockWasmManager.getModule();
      if (mockModule) {
        vi.mocked(mockModule._rnnoise_process_frame).mockImplementation(() => {
          throw new Error('Processing failed');
        });
      }
      
      // Mock resampler
      const { AudioResampler } = await import('../../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(480),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      const result = await fileProcessor.processFile(mockBuffer);
      
      // Should still cleanup resources
      expect(mockWasmManager.freeMemory).toHaveBeenCalled();
      expect(mockWasmManager.destroyState).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });
});