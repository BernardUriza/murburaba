/**
 * Audio Pipeline Integration Tests
 * 
 * Tests the complete audio processing pipeline with all modules working together
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WasmManager } from '../../audio/WasmManager';
import { FrameProcessor } from '../../audio/FrameProcessor';
import { StreamProcessor } from '../../audio/StreamProcessor';
import { FileProcessor } from '../../audio/FileProcessor';

// Mock WASM loader
vi.mock('../../engines/wasm-loader-unified', () => ({
  loadRNNoiseWASM: vi.fn(),
}));

// Mock AudioResampler
vi.mock('../../utils/AudioResampler', () => ({
  AudioResampler: {
    resampleToRNNoiseRate: vi.fn(),
  },
}));

describe('Audio Pipeline Integration', () => {
  let wasmManager: WasmManager;
  let frameProcessor: FrameProcessor;
  let streamProcessor: StreamProcessor;
  let fileProcessor: FileProcessor;
  let mockModule: any;
  let mockAudioContext: any;

  beforeEach(async () => {
    // Mock WASM module
    mockModule = {
      _rnnoise_create: vi.fn().mockReturnValue(123),
      _rnnoise_destroy: vi.fn(),
      _rnnoise_process_frame: vi.fn().mockReturnValue(0.8),
      _malloc: vi.fn().mockReturnValue(1000),
      _free: vi.fn(),
      HEAPF32: new Float32Array(4096),
      HEAPU8: new Uint8Array(16384),
    };

    // Mock AudioContext
    mockAudioContext = {
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createMediaStreamDestination: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
        stream: {} as MediaStream,
      }),
      audioWorklet: {
        addModule: vi.fn().mockResolvedValue(undefined),
      },
      sampleRate: 48000,
      createScriptProcessor: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null,
      }),
    };

    // Mock global AudioWorkletNode
    global.AudioWorkletNode = vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      port: {
        postMessage: vi.fn(),
        onmessage: null,
      },
    })) as any;

    // Setup WASM loader mock
    const { loadRNNoiseWASM } = await import('../../engines/wasm-loader-unified');
    vi.mocked(loadRNNoiseWASM).mockResolvedValue(mockModule);

    // Initialize components
    wasmManager = new WasmManager({ enableFallback: true });
    await wasmManager.initialize();

    frameProcessor = new FrameProcessor();
    streamProcessor = new StreamProcessor(mockAudioContext, wasmManager);
    fileProcessor = new FileProcessor(wasmManager);
  });

  describe('WASM + Frame Processing Pipeline', () => {
    it('should process audio frames through complete WASM pipeline', () => {
      // Create test audio frame
      const inputFrame = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        inputFrame[i] = Math.sin(i * 0.01) * 0.5; // Sine wave
      }

      // Mock WASM heap with processed data
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = inputFrame[i] * 0.7; // Simulated noise reduction
      }

      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      const result = frameProcessor.processFrame(
        inputFrame,
        wasmManager.getModule()!,
        state,
        inputPtr,
        outputPtr
      );

      expect(result.vad).toBe(0.8);
      expect(result.output).toHaveLength(480);
      expect(result.output[0]).toBeCloseTo(inputFrame[0] * 0.7, 5);

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });

    it('should handle multiple frames in sequence', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      const frames = [];
      const results = [];

      // Process 5 consecutive frames
      for (let frameIdx = 0; frameIdx < 5; frameIdx++) {
        const frame = new Float32Array(480);
        for (let i = 0; i < 480; i++) {
          frame[i] = Math.sin((frameIdx * 480 + i) * 0.01) * 0.3;
        }
        
        // Mock processed output
        for (let i = 0; i < 480; i++) {
          mockModule.HEAPF32[(1000 >> 2) + i] = frame[i] * 0.6;
        }

        frames.push(frame);
        const result = frameProcessor.processFrame(
          frame,
          wasmManager.getModule()!,
          state,
          inputPtr,
          outputPtr
        );
        results.push(result);
      }

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.vad).toBe(0.8);
        expect(result.output).toHaveLength(480);
      });

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });
  });

  describe('Stream Processing Pipeline', () => {
    it('should create and manage audio stream processing', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
        getAudioTracks: vi.fn().mockReturnValue([]),
      } as any;

      const controller = await streamProcessor.processStream(mockStream);

      expect(controller).toBeDefined();
      expect(controller.processor.state).toBe('processing');
      expect(streamProcessor.getActiveStreams()).toHaveLength(1);

      // Test stream control
      controller.pause();
      expect(controller.getState()).toBe('paused');

      controller.resume();
      expect(controller.getState()).toBe('processing');

      controller.stop();
      expect(streamProcessor.getActiveStreams()).toHaveLength(0);
    });

    it('should handle multiple concurrent streams', async () => {
      const mockStream1 = { getTracks: vi.fn().mockReturnValue([]) } as any;
      const mockStream2 = { getTracks: vi.fn().mockReturnValue([]) } as any;

      const controller1 = await streamProcessor.processStream(mockStream1);
      const controller2 = await streamProcessor.processStream(mockStream2);

      expect(streamProcessor.getActiveStreams()).toHaveLength(2);
      expect(controller1.processor.id).not.toBe(controller2.processor.id);

      // Stop first stream
      controller1.stop();
      expect(streamProcessor.getActiveStreams()).toHaveLength(1);

      // Stop second stream
      controller2.stop();
      expect(streamProcessor.getActiveStreams()).toHaveLength(0);
    });
  });

  describe('File Processing Pipeline', () => {
    function createTestWavBuffer(samples: number = 480): ArrayBuffer {
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      
      // WAV header
      view.setUint32(0, 0x46464952, false); // 'RIFF'
      view.setUint32(4, buffer.byteLength - 8, true);
      view.setUint32(8, 0x45564157, false); // 'WAVE'
      view.setUint32(12, 0x20746D66, false); // 'fmt '
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, 48000, true); // Sample rate
      view.setUint32(28, 96000, true); // Byte rate
      view.setUint16(32, 2, true); // Block align
      view.setUint16(34, 16, true); // 16-bit
      view.setUint32(36, 0x61746164, false); // 'data'
      view.setUint32(40, samples * 2, true);
      
      // Sample data
      const sampleView = new Int16Array(buffer, 44, samples);
      for (let i = 0; i < samples; i++) {
        sampleView[i] = Math.sin(i * 0.1) * 16384;
      }
      
      return buffer;
    }

    it('should process complete WAV file through pipeline', async () => {
      const testBuffer = createTestWavBuffer(960); // 2 frames
      const progressSpy = vi.fn();

      // Mock resampler
      const { AudioResampler } = await import('../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(960),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      const result = await fileProcessor.processFile(testBuffer, progressSpy);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(progressSpy).toHaveBeenCalled();
      
      // Verify progress was reported
      const progressCalls = progressSpy.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
      
      const lastProgress = progressCalls[progressCalls.length - 1][0];
      expect(lastProgress.progress).toBeGreaterThan(0);
      expect(lastProgress.vad).toBe(0.8);
    });

    it('should handle large files with chunked progress reporting', async () => {
      const largeBuffer = createTestWavBuffer(4800); // 10 frames
      const progressSpy = vi.fn();

      // Mock resampler
      const { AudioResampler } = await import('../../utils/AudioResampler');
      vi.mocked(AudioResampler.resampleToRNNoiseRate).mockReturnValue({
        resampledData: new Int16Array(4800),
        outputSampleRate: 48000,
        wasResampled: false,
      });

      const result = await fileProcessor.processFile(largeBuffer, progressSpy);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(progressSpy).toHaveBeenCalled();
      
      // Should have multiple progress reports for large file
      expect(progressSpy.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('RNNoise + VAD + AGC Integration', () => {
    it('should integrate VAD detection with noise processing', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      // Test with high-energy frame (should detect voice)
      const voiceFrame = new Float32Array(480);
      voiceFrame.fill(0.5); // High amplitude
      
      // Mock high VAD response
      mockModule._rnnoise_process_frame.mockReturnValue(0.9);
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = voiceFrame[i] * 0.8;
      }

      const voiceResult = frameProcessor.processFrame(
        voiceFrame,
        wasmManager.getModule()!,
        state,
        inputPtr,
        outputPtr
      );

      expect(voiceResult.vad).toBe(0.9);
      expect(voiceResult.output).toHaveLength(480);

      // Test with low-energy frame (should detect silence)
      const silentFrame = new Float32Array(480);
      silentFrame.fill(0.01); // Low amplitude
      
      // Mock low VAD response
      mockModule._rnnoise_process_frame.mockReturnValue(0.1);
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = silentFrame[i] * 0.9;
      }

      const silentResult = frameProcessor.processFrame(
        silentFrame,
        wasmManager.getModule()!,
        state,
        inputPtr,
        outputPtr
      );

      expect(silentResult.vad).toBe(0.1);

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });

    it('should process stream with AGC enabled', async () => {
      const agcStreamProcessor = new StreamProcessor(
        mockAudioContext,
        wasmManager,
        { enableAGC: true, bufferSize: 4096 }
      );

      const mockStream = { getTracks: vi.fn().mockReturnValue([]) } as any;
      const controller = await agcStreamProcessor.processStream(mockStream);

      expect(controller).toBeDefined();
      expect(controller.processor.state).toBe('processing');

      // Verify AGC configuration was sent to worklet
      expect(global.AudioWorkletNode).toHaveBeenCalled();

      controller.stop();
      agcStreamProcessor.cleanup();
    });
  });

  describe('Error Recovery and Fallback', () => {
    it('should handle WASM initialization failure gracefully', async () => {
      // Create processor with failed WASM
      const failedWasmManager = new WasmManager({ enableFallback: true });
      
      // Mock WASM load failure
      const { loadRNNoiseWASM } = await import('../../engines/wasm-loader-unified');
      vi.mocked(loadRNNoiseWASM).mockRejectedValue(new Error('WASM failed'));

      await expect(failedWasmManager.initialize()).rejects.toThrow('WASM failed');

      // Frame processor should still work in degraded mode
      const degradedFrameProcessor = new FrameProcessor();
      const testFrame = new Float32Array(480);
      testFrame.fill(0.1);

      const result = degradedFrameProcessor.processFrame(
        testFrame,
        null as any, // No WASM
        0,
        0,
        0
      );

      expect(result.vad).toBeGreaterThanOrEqual(0);
      expect(result.vad).toBeLessThanOrEqual(1);
      expect(result.output).toHaveLength(480);
    });

    it('should maintain stream processing without WASM', async () => {
      const fallbackStreamProcessor = new StreamProcessor(
        mockAudioContext,
        { isInitialized: () => false } as any // Mock uninitialized WASM
      );

      const mockStream = { getTracks: vi.fn().mockReturnValue([]) } as any;
      const controller = await fallbackStreamProcessor.processStream(mockStream);

      expect(controller).toBeDefined();
      expect(controller.processor.state).toBe('processing');

      controller.stop();
      fallbackStreamProcessor.cleanup();
    });
  });

  afterEach(() => {
    streamProcessor.cleanup();
    wasmManager.cleanup();
  });
});