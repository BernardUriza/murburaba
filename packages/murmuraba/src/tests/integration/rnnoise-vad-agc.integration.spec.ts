/**
 * RNNoise + VAD + AGC Integration Tests
 * 
 * Tests the complete audio processing pipeline focusing on RNNoise neural network,
 * Voice Activity Detection, and Automatic Gain Control working together
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WasmManager } from '../../audio/WasmManager';
import { FrameProcessor } from '../../audio/FrameProcessor';
import { StreamProcessor } from '../../audio/StreamProcessor';

// Mock WASM loader
vi.mock('../../engines/wasm-loader-unified', () => ({
  loadRNNoiseWASM: vi.fn(),
}));

describe('RNNoise + VAD + AGC Integration', () => {
  let wasmManager: WasmManager;
  let frameProcessor: FrameProcessor;
  let streamProcessor: StreamProcessor;
  let mockModule: any;
  let mockAudioContext: any;

  beforeEach(async () => {
    // Mock enhanced WASM module with realistic RNNoise behavior
    mockModule = {
      _rnnoise_create: vi.fn().mockReturnValue(123),
      _rnnoise_destroy: vi.fn(),
      _rnnoise_process_frame: vi.fn(),
      _malloc: vi.fn().mockReturnValue(1000),
      _free: vi.fn(),
      HEAPF32: new Float32Array(8192),
      HEAPU8: new Uint8Array(32768),
    };

    // Mock AudioContext with AGC capabilities
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

    // Mock AudioWorkletNode with AGC support
    global.AudioWorkletNode = vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      port: {
        postMessage: vi.fn(),
        onmessage: null,
      },
    })) as any;

    // Setup WASM loader
    const { loadRNNoiseWASM } = await import('../../engines/wasm-loader-unified');
    vi.mocked(loadRNNoiseWASM).mockResolvedValue(mockModule);

    // Initialize components
    wasmManager = new WasmManager({ enableFallback: true });
    await wasmManager.initialize();
    frameProcessor = new FrameProcessor();
    streamProcessor = new StreamProcessor(mockAudioContext, wasmManager, {
      enableAGC: true,
      bufferSize: 4096,
    });
  });

  describe('RNNoise Neural Network Processing', () => {
    it('should apply different noise reduction based on signal characteristics', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      // Test 1: Clean speech signal (minimal processing)
      const cleanSpeech = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        cleanSpeech[i] = Math.sin(i * 0.05) * 0.5; // Clear sine wave
      }

      mockModule._rnnoise_process_frame.mockReturnValue(0.95); // High VAD
      // Mock minimal noise reduction (output ~95% of input)
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = cleanSpeech[i] * 0.95;
      }

      const cleanResult = frameProcessor.processFrame(
        cleanSpeech,
        mockModule,
        state,
        inputPtr,
        outputPtr
      );

      expect(cleanResult.vad).toBe(0.95);
      expect(cleanResult.output[100]).toBeCloseTo(cleanSpeech[100] * 0.95, 3);

      // Test 2: Noisy speech signal (aggressive processing)
      const noisySpeech = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        noisySpeech[i] = Math.sin(i * 0.05) * 0.5 + (Math.random() - 0.5) * 0.3; // Speech + noise
      }

      mockModule._rnnoise_process_frame.mockReturnValue(0.7); // Medium VAD
      // Mock aggressive noise reduction (output ~60% of input)
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = noisySpeech[i] * 0.6;
      }

      const noisyResult = frameProcessor.processFrame(
        noisySpeech,
        mockModule,
        state,
        inputPtr,
        outputPtr
      );

      expect(noisyResult.vad).toBe(0.7);
      // Output should be significantly reduced due to noise
      expect(Math.abs(noisyResult.output[100])).toBeLessThan(Math.abs(noisySpeech[100]));

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });

    it('should maintain voice characteristics while reducing noise', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      // Simulate voice-like signal with formant frequencies
      const voiceSignal = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        // Simulate formant at ~400Hz and ~1200Hz
        const fundamental = Math.sin(i * 0.02) * 0.3;
        const formant1 = Math.sin(i * 0.06) * 0.2;
        const formant2 = Math.sin(i * 0.18) * 0.1;
        voiceSignal[i] = fundamental + formant1 + formant2;
      }

      mockModule._rnnoise_process_frame.mockReturnValue(0.85);
      // Mock voice preservation (maintain formant structure)
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = voiceSignal[i] * 0.8; // Gentle reduction
      }

      const result = frameProcessor.processFrame(
        voiceSignal,
        mockModule,
        state,
        inputPtr,
        outputPtr
      );

      expect(result.vad).toBe(0.85);
      
      // Voice characteristics should be preserved
      const inputRMS = frameProcessor.calculateRMS(voiceSignal);
      const outputRMS = frameProcessor.calculateRMS(result.output);
      const preservationRatio = outputRMS / inputRMS;
      
      expect(preservationRatio).toBeGreaterThan(0.7); // Good preservation
      expect(preservationRatio).toBeLessThan(1.0); // Some noise reduction

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });
  });

  describe('Voice Activity Detection (VAD)', () => {
    it('should accurately detect speech vs silence vs noise', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      // Test 1: Clear speech
      const speech = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        speech[i] = Math.sin(i * 0.04) * 0.6; // Strong periodic signal
      }
      
      mockModule._rnnoise_process_frame.mockReturnValue(0.92);
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = speech[i] * 0.9;
      }

      const speechResult = frameProcessor.processFrame(speech, mockModule, state, inputPtr, outputPtr);
      expect(speechResult.vad).toBeGreaterThan(0.8); // High confidence speech

      // Test 2: Silence
      const silence = new Float32Array(480);
      silence.fill(0.001); // Very quiet
      
      mockModule._rnnoise_process_frame.mockReturnValue(0.05);
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = silence[i];
      }

      const silenceResult = frameProcessor.processFrame(silence, mockModule, state, inputPtr, outputPtr);
      expect(silenceResult.vad).toBeLessThan(0.2); // Low confidence speech

      // Test 3: Pure noise (should be distinguished from speech)
      const noise = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        noise[i] = (Math.random() - 0.5) * 0.4; // Random noise
      }
      
      mockModule._rnnoise_process_frame.mockReturnValue(0.25);
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(1000 >> 2) + i] = noise[i] * 0.3;
      }

      const noiseResult = frameProcessor.processFrame(noise, mockModule, state, inputPtr, outputPtr);
      expect(noiseResult.vad).toBeLessThan(0.4); // Should detect as non-speech

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });

    it('should provide stable VAD over time with speech continuity', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      const vadHistory: number[] = [];

      // Simulate continuous speech with varying amplitude
      for (let frameIdx = 0; frameIdx < 10; frameIdx++) {
        const frame = new Float32Array(480);
        const amplitude = 0.3 + 0.2 * Math.sin(frameIdx * 0.5); // Varying amplitude
        
        for (let i = 0; i < 480; i++) {
          frame[i] = Math.sin((frameIdx * 480 + i) * 0.03) * amplitude;
        }

        // Mock VAD that responds to amplitude but stays in speech range
        const vadValue = 0.7 + amplitude * 0.2;
        mockModule._rnnoise_process_frame.mockReturnValue(vadValue);
        
        for (let i = 0; i < 480; i++) {
          mockModule.HEAPF32[(1000 >> 2) + i] = frame[i] * 0.85;
        }

        const result = frameProcessor.processFrame(frame, mockModule, state, inputPtr, outputPtr);
        vadHistory.push(result.vad);
      }

      // All VAD values should indicate speech
      vadHistory.forEach(vad => {
        expect(vad).toBeGreaterThan(0.6);
        expect(vad).toBeLessThan(1.0);
      });

      // VAD should show reasonable variation (not constant)
      const vadVariation = Math.max(...vadHistory) - Math.min(...vadHistory);
      expect(vadVariation).toBeGreaterThan(0.1);
      expect(vadVariation).toBeLessThan(0.5);

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });
  });

  describe('Automatic Gain Control (AGC)', () => {
    it('should configure AGC in stream processing pipeline', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
        getAudioTracks: vi.fn().mockReturnValue([]),
      } as any;

      const controller = await streamProcessor.processStream(mockStream);

      // Verify AGC was configured in worklet
      const mockWorkletNode = vi.mocked(global.AudioWorkletNode).mock.results[0].value;
      expect(mockWorkletNode.port.postMessage).toHaveBeenCalledWith({
        type: 'initialize',
        data: {
          enableRNNoise: true,
          enableAGC: true,
          targetLevel: 0.3,
        },
      });

      controller.stop();
    });

    it('should handle AGC with different input levels', async () => {
      // Create stream processor with AGC enabled
      const agcStreamProcessor = new StreamProcessor(
        mockAudioContext,
        wasmManager,
        { enableAGC: true, bufferSize: 2048 }
      );

      const mockStream = { getTracks: vi.fn().mockReturnValue([]) } as any;
      const controller = await agcStreamProcessor.processStream(mockStream);

      // Simulate worklet sending metrics with varying levels
      const mockWorkletNode = vi.mocked(global.AudioWorkletNode).mock.results[0].value;
      const metricsHandler = vi.fn();
      agcStreamProcessor.on('metrics', metricsHandler);

      // Mock worklet onmessage handler
      if (mockWorkletNode.port.onmessage) {
        // Simulate quiet input requiring gain boost
        mockWorkletNode.port.onmessage({
          data: {
            type: 'metrics',
            inputLevel: 0.1,  // Quiet
            outputLevel: 0.25, // Boosted by AGC
            vad: 0.8,
            agcGain: 2.5,
          }
        } as any);

        // Simulate loud input requiring gain reduction
        mockWorkletNode.port.onmessage({
          data: {
            type: 'metrics',
            inputLevel: 0.9,  // Loud
            outputLevel: 0.3, // Reduced by AGC
            vad: 0.9,
            agcGain: 0.33,
          }
        } as any);
      }

      expect(metricsHandler).toHaveBeenCalledTimes(2);

      const calls = metricsHandler.mock.calls;
      
      // First call: gain boost for quiet signal
      expect(calls[0][0].inputLevel).toBe(0.1);
      expect(calls[0][0].outputLevel).toBe(0.25);
      expect(calls[0][0].agcGain).toBe(2.5);

      // Second call: gain reduction for loud signal  
      expect(calls[1][0].inputLevel).toBe(0.9);
      expect(calls[1][0].outputLevel).toBe(0.3);
      expect(calls[1][0].agcGain).toBe(0.33);

      controller.stop();
      agcStreamProcessor.cleanup();
    });
  });

  describe('RNNoise + VAD + AGC Combined Processing', () => {
    it('should integrate all three technologies in realistic scenario', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      // Scenario: Quiet speech with background noise
      const quietSpeechWithNoise = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        const speech = Math.sin(i * 0.04) * 0.2; // Quiet speech
        const noise = (Math.random() - 0.5) * 0.15; // Background noise
        quietSpeechWithNoise[i] = speech + noise;
      }

      // Mock RNNoise processing: detects speech, reduces noise, reports moderate VAD
      mockModule._rnnoise_process_frame.mockReturnValue(0.75); // Good VAD despite noise
      
      // Mock output: noise reduced, speech preserved and slightly amplified
      for (let i = 0; i < 480; i++) {
        const originalSpeech = Math.sin(i * 0.04) * 0.2;
        // RNNoise removes noise, AGC would boost the clean speech
        mockModule.HEAPF32[(1000 >> 2) + i] = originalSpeech * 1.3; // AGC boost
      }

      const result = frameProcessor.processFrame(
        quietSpeechWithNoise,
        mockModule,
        state,
        inputPtr,
        outputPtr
      );

      // VAD should detect speech despite noise
      expect(result.vad).toBe(0.75);

      // Output should be cleaner and louder than input
      const inputRMS = frameProcessor.calculateRMS(quietSpeechWithNoise);
      const outputRMS = frameProcessor.calculateRMS(result.output);
      
      expect(outputRMS).toBeGreaterThan(inputRMS); // AGC amplification
      expect(result.output).toHaveLength(480);

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });

    it('should maintain quality through complete processing chain', () => {
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      const qualityMetrics: Array<{
        inputRMS: number;
        outputRMS: number;
        vad: number;
        noiseReduction: number;
      }> = [];

      // Process multiple frames representing different acoustic conditions
      const scenarios = [
        { amplitude: 0.6, noiseLevel: 0.1, expectedVAD: 0.9 }, // Clear speech
        { amplitude: 0.3, noiseLevel: 0.2, expectedVAD: 0.7 }, // Moderate speech with noise
        { amplitude: 0.8, noiseLevel: 0.05, expectedVAD: 0.95 }, // Loud clear speech
        { amplitude: 0.15, noiseLevel: 0.15, expectedVAD: 0.6 }, // Quiet speech with noise
      ];

      scenarios.forEach((scenario, idx) => {
        const frame = new Float32Array(480);
        for (let i = 0; i < 480; i++) {
          const speech = Math.sin(i * 0.05) * scenario.amplitude;
          const noise = (Math.random() - 0.5) * scenario.noiseLevel;
          frame[i] = speech + noise;
        }

        mockModule._rnnoise_process_frame.mockReturnValue(scenario.expectedVAD);
        
        // Mock realistic processing: remove noise proportionally, adjust gain
        for (let i = 0; i < 480; i++) {
          const cleanSpeech = Math.sin(i * 0.05) * scenario.amplitude;
          const noiseFactor = 1 - (scenario.noiseLevel / (scenario.amplitude + scenario.noiseLevel));
          const agcGain = scenario.amplitude < 0.4 ? 1.2 : 0.9; // Boost quiet, reduce loud
          mockModule.HEAPF32[(1000 >> 2) + i] = cleanSpeech * noiseFactor * agcGain;
        }

        const result = frameProcessor.processFrame(frame, mockModule, state, inputPtr, outputPtr);
        
        const inputRMS = frameProcessor.calculateRMS(frame);
        const outputRMS = frameProcessor.calculateRMS(result.output);
        const noiseReduction = inputRMS > 0 ? (1 - outputRMS / inputRMS) * 100 : 0;

        qualityMetrics.push({
          inputRMS,
          outputRMS,
          vad: result.vad,
          noiseReduction,
        });

        // Verify VAD matches expectations
        expect(result.vad).toBeCloseTo(scenario.expectedVAD, 1);
      });

      // Verify overall quality metrics
      qualityMetrics.forEach((metrics, idx) => {
        expect(metrics.vad).toBeGreaterThan(0.5); // All should detect speech
        expect(metrics.outputRMS).toBeGreaterThan(0); // All should produce output
        
        // For scenarios with significant noise, should show noise reduction
        if (scenarios[idx].noiseLevel > 0.1) {
          expect(Math.abs(metrics.noiseReduction)).toBeGreaterThan(0);
        }
      });

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
    });
  });

  describe('Real-time Performance Integration', () => {
    it('should maintain real-time processing with all features enabled', async () => {
      const performanceMetrics: number[] = [];
      
      // Create high-performance stream processor
      const rtStreamProcessor = new StreamProcessor(
        mockAudioContext,
        wasmManager,
        { enableAGC: true, bufferSize: 256 } // Small buffer for low latency
      );

      const mockStream = { getTracks: vi.fn().mockReturnValue([]) } as any;
      const controller = await rtStreamProcessor.processStream(mockStream);

      // Simulate real-time frame processing
      const state = wasmManager.createState();
      const inputPtr = wasmManager.allocateMemory(480);
      const outputPtr = wasmManager.allocateMemory(480);

      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        const frame = new Float32Array(480);
        for (let j = 0; j < 480; j++) {
          frame[j] = Math.sin((i * 480 + j) * 0.02) * 0.4;
        }

        mockModule._rnnoise_process_frame.mockReturnValue(0.8);
        for (let j = 0; j < 480; j++) {
          mockModule.HEAPF32[(1000 >> 2) + j] = frame[j] * 0.85;
        }

        frameProcessor.processFrame(frame, mockModule, state, inputPtr, outputPtr);
        
        const processingTime = performance.now() - startTime;
        performanceMetrics.push(processingTime);
      }

      // Verify real-time performance (480 samples at 48kHz = 10ms)
      const avgProcessingTime = performanceMetrics.reduce((a, b) => a + b) / performanceMetrics.length;
      const maxProcessingTime = Math.max(...performanceMetrics);

      expect(avgProcessingTime).toBeLessThan(5); // Should be well under 10ms
      expect(maxProcessingTime).toBeLessThan(10); // Even worst case under real-time limit

      // Cleanup
      wasmManager.freeMemory(inputPtr);
      wasmManager.freeMemory(outputPtr);
      wasmManager.destroyState(state);
      controller.stop();
      rtStreamProcessor.cleanup();
    });
  });

  afterEach(() => {
    streamProcessor.cleanup();
    wasmManager.cleanup();
  });
});