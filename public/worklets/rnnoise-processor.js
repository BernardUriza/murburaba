class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isInitialized = false;
    this.rnnoise = null;
    this.noiseSuppressionState = null;
    this.bufferSize = 480; // RNNoise expects 480 samples
    this.inputBuffer = [];
    this.outputBuffer = [];
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'init') {
        this.initializeRNNoise();
      }
    };
  }

  async initializeRNNoise() {
    try {
      console.log('[RNNoise Worklet] Starting initialization...');
      
      // Fetch and instantiate the WASM module directly
      const wasmResponse = await fetch('/dist/rnnoise.wasm');
      const wasmBuffer = await wasmResponse.arrayBuffer();
      
      console.log('[RNNoise Worklet] WASM binary loaded, size:', wasmBuffer.byteLength);
      
      // Create a minimal module interface for RNNoise
      const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 32768 }),
          __memory_base: 0,
          __table_base: 0,
          abort: () => { console.error('WASM abort called'); },
          _abort: () => { console.error('WASM _abort called'); },
          ___assert_fail: () => { console.error('WASM assert fail'); },
          _emscripten_memcpy_big: (dest, src, num) => {
            // Simple memory copy implementation
            const heap = new Uint8Array(wasmModule.instance.exports.memory.buffer);
            heap.copyWithin(dest, src, src + num);
          },
          _emscripten_resize_heap: () => { return 0; }
        }
      });
      
      console.log('[RNNoise Worklet] WASM module instantiated');
      
      // Get the exports
      this.rnnoise = wasmModule.instance.exports;
      
      // Initialize the module
      if (this.rnnoise.__wasm_call_ctors) {
        this.rnnoise.__wasm_call_ctors();
      }
      
      // Create noise suppression state
      this.noiseSuppressionState = this.rnnoise.rnnoise_create(0);
      
      if (!this.noiseSuppressionState) {
        throw new Error('Failed to create RNNoise state');
      }
      
      this.isInitialized = true;
      
      // Allocate memory for input/output buffers (float32 = 4 bytes)
      this.inputPtr = this.rnnoise.malloc(this.bufferSize * 4);
      this.outputPtr = this.rnnoise.malloc(this.bufferSize * 4);
      
      // Store heap views
      this.HEAP16 = new Int16Array(this.rnnoise.memory.buffer);
      
      console.log('[RNNoise Worklet] Initialized successfully');
      this.port.postMessage({ type: 'initialized' });
    } catch (error) {
      console.error('[RNNoise Worklet] Initialization error:', error);
      this.port.postMessage({ type: 'error', error: error.message });
    }
  }

  process(inputs, outputs, parameters) {
    if (!this.isInitialized || !inputs[0] || !inputs[0][0]) {
      return true;
    }

    const input = inputs[0][0];
    const output = outputs[0][0];

    // Add input samples to buffer
    for (let i = 0; i < input.length; i++) {
      this.inputBuffer.push(input[i]);
    }

    // Process when we have enough samples
    while (this.inputBuffer.length >= this.bufferSize) {
      // Get a frame of samples
      const frame = this.inputBuffer.splice(0, this.bufferSize);
      
      // Convert to 16-bit PCM
      const pcmData = new Int16Array(this.bufferSize);
      for (let i = 0; i < this.bufferSize; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(frame[i] * 32768)));
      }
      
      // Copy to WASM memory
      this.HEAP16.set(pcmData, this.inputPtr >> 1);
      
      // Process with RNNoise
      const vadProb = this.rnnoise.rnnoise_process_frame(
        this.noiseSuppressionState,
        this.outputPtr,
        this.inputPtr
      );
      
      // Get processed data from output pointer
      const processedPCM = new Int16Array(
        this.rnnoise.memory.buffer,
        this.outputPtr,
        this.bufferSize
      );
      
      // Log VAD probability for debugging
      if (Math.random() < 0.01) { // Log occasionally to avoid spam
        console.log('[RNNoise] VAD probability:', vadProb);
      }
      
      // Convert back to float32 and add to output buffer
      for (let i = 0; i < this.bufferSize; i++) {
        this.outputBuffer.push(processedPCM[i] / 32768.0);
      }
    }

    // Output processed samples
    const samplesToOutput = Math.min(output.length, this.outputBuffer.length);
    for (let i = 0; i < samplesToOutput; i++) {
      output[i] = this.outputBuffer.shift();
    }
    
    // Fill remaining output with zeros if needed
    for (let i = samplesToOutput; i < output.length; i++) {
      output[i] = 0;
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);