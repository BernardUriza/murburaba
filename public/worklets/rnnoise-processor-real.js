class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isInitialized = false;
    this.bufferSize = 480; // RNNoise expects 480 samples
    this.inputBuffer = [];
    this.outputBuffer = [];
    this.sampleRate = 48000;
    
    // Initialize on first process call
    this.initPromise = null;
    
    console.log('[RNNoise Processor] Created');
  }

  async initializeIfNeeded() {
    if (this.isInitialized || this.initPromise) return;
    
    this.initPromise = this.initialize();
    await this.initPromise;
  }

  async initialize() {
    try {
      console.log('[RNNoise Processor] Initializing...');
      
      // Fetch the pre-initialized module from global scope
      // This assumes the main thread has already loaded it
      if (typeof globalThis.RNNoiseModule === 'undefined') {
        // If not available, we need to load it ourselves
        const response = await fetch('/rnnoise-fixed.js');
        const scriptText = await response.text();
        
        // Execute the script in global scope
        const script = new Function(scriptText);
        script();
        
        // Now create the module
        if (typeof globalThis.createRNNWasmModule === 'function') {
          globalThis.RNNoiseModule = await globalThis.createRNNWasmModule({
            locateFile: (filename) => {
              if (filename.endsWith('.wasm')) {
                return `/dist/${filename}`;
              }
              return filename;
            }
          });
        }
      }
      
      this.rnnoise = globalThis.RNNoiseModule;
      
      if (!this.rnnoise) {
        throw new Error('RNNoise module not available');
      }
      
      // Create noise suppression state
      this.noiseSuppressionState = this.rnnoise._rnnoise_create(0);
      
      if (!this.noiseSuppressionState) {
        throw new Error('Failed to create RNNoise state');
      }
      
      // Allocate memory for input/output buffers
      this.inputPtr = this.rnnoise._malloc(this.bufferSize * 2); // 2 bytes per sample (int16)
      this.outputPtr = this.rnnoise._malloc(this.bufferSize * 2);
      
      console.log('[RNNoise Processor] Initialized successfully');
      this.isInitialized = true;
    } catch (error) {
      console.error('[RNNoise Processor] Initialization error:', error);
      this.isInitialized = false;
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
    
    // Initialize if needed (non-blocking)
    if (!this.isInitialized && !this.initPromise) {
      this.initializeIfNeeded().catch(console.error);
      
      // Pass through while initializing
      outputChannel.set(inputChannel);
      return true;
    }
    
    // If still initializing, pass through
    if (!this.isInitialized) {
      outputChannel.set(inputChannel);
      return true;
    }
    
    // Add input samples to buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.inputBuffer.push(inputChannel[i]);
    }
    
    // Process when we have enough samples
    while (this.inputBuffer.length >= this.bufferSize && this.isInitialized) {
      // Get a frame of samples
      const frame = this.inputBuffer.splice(0, this.bufferSize);
      
      // Convert to 16-bit PCM
      const pcmData = new Int16Array(this.bufferSize);
      for (let i = 0; i < this.bufferSize; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(frame[i] * 32768)));
      }
      
      // Copy to WASM memory
      this.rnnoise.HEAP16.set(pcmData, this.inputPtr >> 1);
      
      // Process with RNNoise
      const vadProb = this.rnnoise._rnnoise_process_frame(
        this.noiseSuppressionState,
        this.outputPtr,
        this.inputPtr
      );
      
      // Get processed data
      const processedPCM = new Int16Array(
        this.rnnoise.HEAP16.buffer,
        this.outputPtr,
        this.bufferSize
      );
      
      // Log VAD occasionally
      if (Math.random() < 0.01) {
        console.log('[RNNoise] VAD probability:', vadProb);
      }
      
      // Convert back to float32 and add to output buffer
      for (let i = 0; i < this.bufferSize; i++) {
        this.outputBuffer.push(processedPCM[i] / 32768.0);
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

registerProcessor('rnnoise-processor-real', RNNoiseProcessor);