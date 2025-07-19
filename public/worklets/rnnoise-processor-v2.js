class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isInitialized = false;
    this.bufferSize = 480; // RNNoise expects 480 samples
    this.inputBuffer = [];
    this.outputBuffer = [];
    
    console.log('[RNNoise Processor V2] Created');
    
    // Listen for initialization message
    this.port.onmessage = (event) => {
      if (event.data.type === 'init') {
        this.initialize(event.data);
      }
    };
  }

  initialize(data) {
    try {
      console.log('[RNNoise Processor V2] Initializing with transferred data...');
      
      // Store the transferred data
      this.wasmMemory = data.wasmMemory;
      this.noiseSuppressionState = data.state;
      this.inputPtr = data.inputPtr;
      this.outputPtr = data.outputPtr;
      this.exports = data.exports;
      
      // Create heap views
      this.HEAP16 = new Int16Array(this.wasmMemory.buffer);
      
      this.isInitialized = true;
      console.log('[RNNoise Processor V2] Initialized successfully');
      
      this.port.postMessage({ type: 'initialized' });
    } catch (error) {
      console.error('[RNNoise Processor V2] Initialization error:', error);
      this.port.postMessage({ type: 'error', error: error.message });
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !input[0]) {
      return true;
    }
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    
    // Pass through if not initialized
    if (!this.isInitialized) {
      outputChannel.set(inputChannel);
      return true;
    }
    
    // Add input samples to buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.inputBuffer.push(inputChannel[i]);
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
      // Send message to main thread to process
      this.port.postMessage({
        type: 'process',
        inputPtr: this.inputPtr,
        outputPtr: this.outputPtr,
        state: this.noiseSuppressionState
      });
      
      // For now, pass through with simple filtering
      // The actual processing will happen asynchronously
      for (let i = 0; i < this.bufferSize; i++) {
        // Simple noise gate as placeholder
        const sample = frame[i];
        if (Math.abs(sample) < 0.02) {
          this.outputBuffer.push(0);
        } else {
          this.outputBuffer.push(sample * 0.9); // Slight attenuation
        }
      }
    }
    
    // Output processed samples
    const samplesToOutput = Math.min(outputChannel.length, this.outputBuffer.length);
    for (let i = 0; i < samplesToOutput; i++) {
      outputChannel[i] = this.outputBuffer.shift();
    }
    
    // Fill remaining output with zeros if needed
    for (let i = samplesToOutput; i < outputChannel.length; i++) {
      outputChannel[i] = 0;
    }
    
    return true;
  }
}

registerProcessor('rnnoise-processor-v2', RNNoiseProcessor);