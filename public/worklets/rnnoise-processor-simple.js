class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isActive = true;
    this.bufferSize = 480; // RNNoise expects 480 samples
    this.inputBuffer = [];
    this.outputBuffer = [];
    
    console.log('[RNNoise Simple Processor] Created');
  }

  process(inputs, outputs, parameters) {
    if (!inputs[0] || !inputs[0][0]) {
      return true;
    }

    const input = inputs[0][0];
    const output = outputs[0][0];

    // For now, just pass through with simple noise gate
    for (let i = 0; i < input.length; i++) {
      // Simple noise gate - suppress very quiet signals
      if (Math.abs(input[i]) < 0.01) {
        output[i] = 0;
      } else {
        output[i] = input[i];
      }
    }

    return true;
  }
}

registerProcessor('rnnoise-processor-simple', RNNoiseProcessor);