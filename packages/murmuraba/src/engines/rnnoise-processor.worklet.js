/**
 * RNNoise AudioWorklet Processor
 *
 * MIGRATION NOTES:
 * - Migrated from AudioWorkletEngine.ts string pattern (ELIMINATED)
 * - Reused WASM loading logic from RNNoiseEngine.ts
 * - Reused AGC logic from MurmubaraEngine.ts
 * - Centralized all audio processing in ES6 module (NO MORE BLOBS)
 *
 * This worklet handles:
 * - RNNoise WASM initialization and processing
 * - Real-time VAD (Voice Activity Detection)
 * - Automatic Gain Control (AGC)
 * - Frame buffering and metrics collection
 * - Low-latency audio processing (13ms target)
 */

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Core state
    this.isActive = true;
    this.isPaused = false;
    this.frameSize = 480; // RNNoise requirement

    // Buffers - optimized for low latency
    this.inputBuffer = [];
    this.outputBuffer = [];
    this.maxBufferSize = 960; // 2x frame size max

    // RNNoise WASM state
    this.isRNNoiseReady = false;
    this.rnnoiseModule = null;
    this.rnnoiseState = null;
    this.inputPtr = 0;
    this.outputPtr = 0;

    // Metrics tracking
    this.framesProcessed = 0;
    this.processingTimeSum = 0;
    this.inputLevel = 0;
    this.outputLevel = 0;
    this.lastVad = 0;
    this.noiseReduction = 0;

    // AGC state (reused from MurmubaraEngine)
    this.agcEnabled = true; // Enable AGC by default to handle low input
    this.agcTargetLevel = 0.3;
    this.agcCurrentGain = 1.0;

    // Setup message handling
    this.port.onmessage = event => {
      this.handleMessage(event.data);
    };

    console.log('[RNNoiseProcessor] Worklet initialized');
  }

  handleMessage(message) {
    switch (message.type) {
      case 'initialize':
        this.initializeRNNoise(message.data);
        break;
      case 'pause':
        this.isPaused = true;
        break;
      case 'resume':
        this.isPaused = false;
        break;
      case 'stop':
        this.isActive = false;
        break;
      case 'updateAGC':
        this.agcEnabled = message.data.enabled;
        this.agcTargetLevel = message.data.targetLevel || 0.3;
        break;
      default:
        console.warn(`[RNNoiseProcessor] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Initialize RNNoise WASM module
   * Reused logic from RNNoiseEngine.ts with worklet adaptations
   */
  async initializeRNNoise(config) {
    try {
      console.log('[RNNoiseProcessor] Initializing RNNoise WASM...');

      if (!config.wasmBuffer) {
        throw new Error('WASM buffer not provided');
      }

      // Instantiate WASM module
      const wasmModule = await WebAssembly.instantiate(config.wasmBuffer);
      this.rnnoiseModule = wasmModule.instance.exports;

      if (!this.rnnoiseModule._rnnoise_create) {
        throw new Error('RNNoise WASM module invalid');
      }

      // Create RNNoise state
      this.rnnoiseState = this.rnnoiseModule._rnnoise_create(0);
      if (!this.rnnoiseState) {
        throw new Error('Failed to create RNNoise state');
      }

      // Allocate memory for float32 samples (REGLA 8: 1920 bytes)
      this.inputPtr = this.rnnoiseModule._malloc(480 * 4);
      this.outputPtr = this.rnnoiseModule._malloc(480 * 4);

      if (!this.inputPtr || !this.outputPtr) {
        throw new Error('Failed to allocate WASM memory');
      }

      // Warm up with silent frames (from RNNoiseEngine.ts)
      const silentFrame = new Float32Array(480);
      for (let i = 0; i < 10; i++) {
        this.processFrameWithRNNoise(silentFrame);
      }

      this.isRNNoiseReady = true;
      console.log('[RNNoiseProcessor] RNNoise initialized successfully');

      this.port.postMessage({
        type: 'initialized',
        success: true,
      });
    } catch (error) {
      console.error('[RNNoiseProcessor] RNNoise initialization failed:', error);
      this.port.postMessage({
        type: 'initialized',
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Process single frame with RNNoise
   * Reused from RNNoiseEngine.ts with optimizations
   */
  processFrameWithRNNoise(frame) {
    if (!this.isRNNoiseReady || !this.rnnoiseModule || !this.rnnoiseState) {
      // Fallback: simple passthrough with fake VAD
      return {
        output: frame,
        vad: Math.min(1.0, this.calculateRMS(frame) * 10),
      };
    }

    // REGLA 5: Scale to RNNoise range
    const scaledInput = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      const clamped = Math.max(-1, Math.min(1, frame[i]));
      scaledInput[i] = clamped * 32768.0;
    }

    // REGLA 7: Write to HEAPF32
    this.rnnoiseModule.HEAPF32.set(scaledInput, this.inputPtr >> 2);

    // REGLA 11: Process and capture VAD
    const vad = this.rnnoiseModule._rnnoise_process_frame(
      this.rnnoiseState,
      this.outputPtr,
      this.inputPtr
    );

    // Get processed output
    const scaledOutput = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      scaledOutput[i] = this.rnnoiseModule.HEAPF32[(this.outputPtr >> 2) + i];
    }

    // REGLA 6: Scale back from RNNoise range
    const output = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      output[i] = scaledOutput[i] / 32768.0;
    }

    this.lastVad = vad || 0;
    return { output, vad: this.lastVad };
  }

  /**
   * Calculate RMS level
   * Reused from MetricsManager
   */
  calculateRMS(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Update AGC gain
   * Reused from MurmubaraEngine.ts
   */
  updateAGC(inputLevel) {
    if (!this.agcEnabled) return;

    const targetGain = this.agcTargetLevel / (inputLevel + 0.0001);
    const limitedGain = Math.min(targetGain, 50); // Increase max gain to 50x for very low input

    // Smooth gain changes
    const rate = limitedGain > this.agcCurrentGain ? 0.1 : 0.5;
    this.agcCurrentGain += (limitedGain - this.agcCurrentGain) * rate;
  }

  /**
   * Main audio processing method
   * Optimized for 128-sample WebAudio quanta -> 480-sample RNNoise frames
   */
  process(inputs, outputs, _parameters) {
    const startTime = globalThis.currentTime;
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || this.isPaused) {
      // Fill with silence if paused or no input
      if (output && output[0]) {
        output[0].fill(0);
      }
      return this.isActive;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    // Calculate input metrics
    this.inputLevel = this.calculateRMS(inputChannel);
    
    // Debug input levels
    if (this.frameCount % 100 === 0) {
      console.log('[RNNoiseProcessor] Input level:', this.inputLevel, 'Peak:', Math.max(...inputChannel.map(Math.abs)));
    }

    // Update AGC
    this.updateAGC(this.inputLevel);

    // Add input to buffer
    for (let i = 0; i < inputChannel.length; i++) {
      let sample = inputChannel[i];

      // Apply AGC if enabled
      if (this.agcEnabled) {
        sample *= this.agcCurrentGain;
      }

      this.inputBuffer.push(sample);
    }
    
    // Send samples to main thread for chunk processing
    if (this.port && inputChannel.length > 0) {
      this.port.postMessage({
        type: 'samples',
        data: inputChannel.slice() // Copy the array
      });
    }

    // Process buffered frames (480 samples each)
    let outputIndex = 0;
    while (this.inputBuffer.length >= this.frameSize && outputIndex < outputChannel.length) {
      // Extract frame
      const frame = new Float32Array(this.frameSize);
      for (let i = 0; i < this.frameSize; i++) {
        frame[i] = this.inputBuffer.shift();
      }

      // Process with RNNoise
      const { output: processed, vad } = this.processFrameWithRNNoise(frame);

      // Calculate noise reduction
      const inputRMS = this.calculateRMS(frame);
      const outputRMS = this.calculateRMS(processed);
      this.noiseReduction = inputRMS > 0 ? Math.max(0, (1 - outputRMS / inputRMS)) : 0;

      // Add to output buffer
      for (let i = 0; i < processed.length; i++) {
        this.outputBuffer.push(processed[i]);
      }

      this.framesProcessed++;
      this.lastVad = vad;
    }

    // Output buffered samples
    for (let i = 0; i < outputChannel.length; i++) {
      if (this.outputBuffer.length > 0) {
        outputChannel[i] = this.outputBuffer.shift();
      } else {
        outputChannel[i] = 0;
      }
    }

    // Calculate output metrics
    this.outputLevel = this.calculateRMS(outputChannel);

    // Track performance
    const processingTime = globalThis.currentTime - startTime;
    this.processingTimeSum += processingTime;

    // Send metrics every 10 frames (~0.21 seconds at 48kHz) for better responsiveness
    if (this.framesProcessed % 10 === 0) {
      this.port.postMessage({
        type: 'metrics',
        data: {
          inputLevel: this.inputLevel,
          outputLevel: this.outputLevel,
          vad: this.lastVad,
          noiseReduction: this.noiseReduction,
          processingTime: this.processingTimeSum / 100,
          framesProcessed: this.framesProcessed,
          agcGain: this.agcCurrentGain,
        },
      });
      this.processingTimeSum = 0;
      
      // Debug VAD and noise reduction
      if (this.lastVad > 0.01 || this.noiseReduction > 0.01) {
        console.log('[RNNoiseProcessor] VAD:', this.lastVad.toFixed(3), 'NR:', (this.noiseReduction * 100).toFixed(1) + '%');
      }
    }

    return this.isActive;
  }

  /**
   * Cleanup method
   */
  cleanup() {
    if (this.rnnoiseModule && this.rnnoiseState) {
      if (this.inputPtr) this.rnnoiseModule._free(this.inputPtr);
      if (this.outputPtr) this.rnnoiseModule._free(this.outputPtr);
      if (this.rnnoiseState) this.rnnoiseModule._rnnoise_destroy(this.rnnoiseState);
    }

    this.isRNNoiseReady = false;
    this.rnnoiseModule = null;
    this.rnnoiseState = null;
    this.inputPtr = 0;
    this.outputPtr = 0;

    console.log('[RNNoiseProcessor] Cleanup completed');
  }
}

// Register the processor
registerProcessor('rnnoise-processor', RNNoiseProcessor);
