/**
 * FrameProcessor Unit Tests
 * 
 * Tests the atomic 480-sample frame processing module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrameProcessor } from '../../../audio/FrameProcessor';

describe('FrameProcessor', () => {
  let frameProcessor: FrameProcessor;
  let mockModule: any;
  let mockState: number;
  let mockInputPtr: number;
  let mockOutputPtr: number;

  beforeEach(() => {
    frameProcessor = new FrameProcessor();
    
    // Mock WASM module
    mockModule = {
      _rnnoise_process_frame: vi.fn().mockReturnValue(0.75), // Mock VAD
      HEAPF32: new Float32Array(2000), // Large enough for test data
    };
    
    mockState = 123;
    mockInputPtr = 1000;
    mockOutputPtr = 2000;
  });

  describe('frame processing', () => {
    it('should process a valid 480-sample frame', () => {
      const inputFrame = new Float32Array(480);
      // Fill with test audio data
      for (let i = 0; i < 480; i++) {
        inputFrame[i] = Math.sin(i * 0.1) * 0.5; // Sine wave
      }

      // Mock processed output in WASM heap
      for (let i = 0; i < 480; i++) {
        mockModule.HEAPF32[(mockInputPtr >> 2) + i] = inputFrame[i] * 0.8; // Simulated noise reduction
      }

      const result = frameProcessor.processFrame(
        inputFrame, 
        mockModule, 
        mockState, 
        mockInputPtr, 
        mockOutputPtr
      );

      expect(result.vad).toBe(0.75);
      expect(result.output).toHaveLength(480);
      expect(mockModule._rnnoise_process_frame).toHaveBeenCalledWith(
        mockState, 
        mockInputPtr, 
        mockInputPtr
      );
    });

    it('should reject frames with incorrect size', () => {
      const invalidFrame = new Float32Array(256); // Wrong size

      expect(() => {
        frameProcessor.processFrame(
          invalidFrame, 
          mockModule, 
          mockState, 
          mockInputPtr, 
          mockOutputPtr
        );
      }).toThrow('Frame must be exactly 480 samples, got 256');
    });

    it('should handle degraded mode when WASM unavailable', () => {
      const inputFrame = new Float32Array(480);
      inputFrame.fill(0.1); // Quiet audio

      const result = frameProcessor.processFrame(
        inputFrame, 
        null, // No WASM module
        0, 
        0, 
        0
      );

      expect(result.vad).toBeGreaterThanOrEqual(0);
      expect(result.vad).toBeLessThanOrEqual(1);
      expect(result.output).toHaveLength(480);
    });
  });

  describe('audio metrics', () => {
    it('should calculate RMS correctly', () => {
      const frame = new Float32Array([0.5, -0.5, 0.3, -0.3]);
      const rms = frameProcessor.calculateRMS(frame);
      
      const expected = Math.sqrt((0.25 + 0.25 + 0.09 + 0.09) / 4);
      expect(rms).toBeCloseTo(expected, 5);
    });

    it('should calculate peak correctly', () => {
      const frame = new Float32Array([0.2, -0.8, 0.5, -0.3]);
      const peak = frameProcessor.calculatePeak(frame);
      
      expect(peak).toBeCloseTo(0.8, 5);
    });

    it('should handle silent frames', () => {
      const frame = new Float32Array(480);
      frame.fill(0);
      
      const rms = frameProcessor.calculateRMS(frame);
      const peak = frameProcessor.calculatePeak(frame);
      
      expect(rms).toBe(0);
      expect(peak).toBe(0);
    });
  });

  describe('scaling and validation', () => {
    it('should scale input correctly for RNNoise', () => {
      const frameProcessor = new FrameProcessor({ enableScaling: true });
      const inputFrame = new Float32Array([1.0, -1.0, 0.5, -0.5]);
      
      // Access private method through type assertion for testing
      const scaled = (frameProcessor as any).scaleInput(inputFrame);
      
      expect(scaled[0]).toBe(32768);
      expect(scaled[1]).toBe(-32768);
      expect(scaled[2]).toBe(16384);
      expect(scaled[3]).toBe(-16384);
    });

    it('should scale output correctly from RNNoise', () => {
      const frameProcessor = new FrameProcessor({ enableScaling: true });
      const scaledOutput = new Float32Array([32768, -32768, 16384, -16384]);
      
      // Access private method through type assertion for testing
      const output = (frameProcessor as any).scaleOutput(scaledOutput);
      
      expect(output[0]).toBeCloseTo(1.0, 5);
      expect(output[1]).toBeCloseTo(-1.0, 5);
      expect(output[2]).toBeCloseTo(0.5, 5);
      expect(output[3]).toBeCloseTo(-0.5, 5);
    });

    it('should validate frame data when enabled', () => {
      const frameProcessor = new FrameProcessor({ enableValidation: true });
      const invalidFrame = new Float32Array(480);
      invalidFrame[100] = NaN;

      expect(() => {
        frameProcessor.processFrame(
          invalidFrame,
          mockModule,
          mockState,
          mockInputPtr,
          mockOutputPtr
        );
      }).toThrow('Invalid sample at index 100: NaN');
    });
  });

  describe('constants', () => {
    it('should expose correct frame size', () => {
      expect(FrameProcessor.FRAME_SIZE).toBe(480);
    });
  });
});