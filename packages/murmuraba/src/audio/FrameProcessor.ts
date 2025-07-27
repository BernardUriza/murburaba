/**
 * FrameProcessor - Atomic frame-level audio processing
 * 
 * EXTRACTION: From MurmubaraEngine.processFrame() (lines 382-458)
 * PHILOSOPHY: One module = one responsibility (480-sample frame processing)
 */

import type { RNNoiseModule } from '../utils/rnnoise-loader';

export interface FrameProcessingResult {
  output: Float32Array;
  vad: number;
}

export interface FrameProcessorConfig {
  enableValidation?: boolean;
  enableScaling?: boolean;
}

export class FrameProcessor {
  private static readonly FRAME_SIZE = 480;
  private static readonly SCALE_FACTOR = 32768.0;
  
  private config: Required<FrameProcessorConfig>;

  constructor(config: FrameProcessorConfig = {}) {
    this.config = {
      enableValidation: config.enableValidation ?? true,
      enableScaling: config.enableScaling ?? true,
    };
  }

  /**
   * Process single 480-sample frame with RNNoise
   * Implements BRUTAL VAD RULES from CLAUDE.md
   */
  processFrame(
    frame: Float32Array,
    wasmModule: RNNoiseModule,
    rnnoiseState: number,
    inputPtr: number,
    outputPtr: number
  ): FrameProcessingResult {
    // REGLA 1: Verificar 480 samples exactos
    if (frame.length !== FrameProcessor.FRAME_SIZE) {
      throw new Error(`Frame must be exactly 480 samples, got ${frame.length}`);
    }

    // Check for degraded mode (no WASM)
    if (!wasmModule || !rnnoiseState) {
      return this.processDegraded(frame);
    }

    if (this.config.enableValidation) {
      this.validateFrame(frame);
    }

    // REGLA 6: ESCALAR CORRECTAMENTE - Entrada: valor * 32768
    const scaledInput = this.scaleInput(frame);

    // REGLA 7: Escribir en HEAPF32
    wasmModule.HEAPF32.set(scaledInput, inputPtr >> 2);

    // REGLA 11: CAPTURAR EL VAD! Process with RNNoise
    // REGLA 13: Procesar in-place (usar mismo puntero para entrada y salida)
    const vad = wasmModule._rnnoise_process_frame(
      rnnoiseState,
      inputPtr, // In-place: output = input
      inputPtr  // In-place: usar mismo buffer
    );

    // Get output from the same buffer (in-place processing)
    const scaledOutput = new Float32Array(FrameProcessor.FRAME_SIZE);
    for (let i = 0; i < FrameProcessor.FRAME_SIZE; i++) {
      scaledOutput[i] = wasmModule.HEAPF32[(inputPtr >> 2) + i];
    }

    // REGLA 6: ESCALAR CORRECTAMENTE - Salida: valor / 32768
    const output = this.scaleOutput(scaledOutput);

    return { output, vad: vad || 0 };
  }

  /**
   * Process frame in degraded mode (no WASM available)
   */
  private processDegraded(frame: Float32Array): FrameProcessingResult {
    const output = new Float32Array(frame.length);
    const threshold = 0.01;
    let voiceActivity = 0;

    // Simple noise gate as fallback
    for (let i = 0; i < frame.length; i++) {
      const sample = frame[i];
      if (Math.abs(sample) < threshold) {
        output[i] = sample * 0.1; // Reduce quiet sounds
      } else {
        output[i] = sample;
        voiceActivity += Math.abs(sample);
      }
    }

    // Fake VAD for degraded mode
    const vad = Math.min(1.0, voiceActivity / frame.length / 0.1);
    return { output, vad };
  }

  /**
   * REGLA 15: Verificar datos válidos (no NaN, no undefined)
   */
  private validateFrame(frame: Float32Array): void {
    for (let i = 0; i < frame.length; i++) {
      if (isNaN(frame[i]) || frame[i] === undefined) {
        throw new Error(`Invalid sample at index ${i}: ${frame[i]}`);
      }
    }
  }

  /**
   * REGLA 5 & 6: Scale to RNNoise range (input)
   */
  private scaleInput(frame: Float32Array): Float32Array {
    if (!this.config.enableScaling) return frame;

    const scaledInput = new Float32Array(FrameProcessor.FRAME_SIZE);
    for (let i = 0; i < FrameProcessor.FRAME_SIZE; i++) {
      const clamped = Math.max(-1, Math.min(1, frame[i]));
      scaledInput[i] = clamped * FrameProcessor.SCALE_FACTOR;
    }
    return scaledInput;
  }

  /**
   * REGLA 6: Scale back from RNNoise range (output)
   */
  private scaleOutput(scaledOutput: Float32Array): Float32Array {
    if (!this.config.enableScaling) return scaledOutput;

    const output = new Float32Array(FrameProcessor.FRAME_SIZE);
    for (let i = 0; i < FrameProcessor.FRAME_SIZE; i++) {
      output[i] = scaledOutput[i] / FrameProcessor.SCALE_FACTOR;
    }
    return output;
  }

  /**
   * Calculate RMS level of frame
   */
  calculateRMS(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
  }

  /**
   * Calculate peak level of frame
   */
  calculatePeak(frame: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < frame.length; i++) {
      peak = Math.max(peak, Math.abs(frame[i]));
    }
    return peak;
  }

  static get FRAME_SIZE(): number {
    return 480;
  }
}