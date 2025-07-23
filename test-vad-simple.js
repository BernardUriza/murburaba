// Simple test to check VAD behavior

const testVAD = async () => {
  console.log('🔍 Testing VAD return value from RNNoise WASM...\n');
  
  try {
    // Load the RNNoise module
    const script = document.createElement('script');
    script.src = '/rnnoise-fixed.js';
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    console.log('✅ Script loaded');
    
    // Create WASM module
    const module = await window.createRNNWasmModule({
      locateFile: (filename) => {
        if (filename.endsWith('.wasm')) {
          return `/dist/${filename}`;
        }
        return filename;
      }
    });
    
    console.log('✅ WASM module created');
    
    // Create RNNoise state
    const state = module._rnnoise_create(0);
    console.log('✅ RNNoise state created:', state);
    
    // Allocate memory
    const FRAME_SIZE = 480;
    const BYTES_PER_FLOAT = 4;
    const inputPtr = module._malloc(FRAME_SIZE * BYTES_PER_FLOAT);
    const outputPtr = module._malloc(FRAME_SIZE * BYTES_PER_FLOAT);
    
    console.log('✅ Memory allocated - input:', inputPtr, 'output:', outputPtr);
    
    // Create test frame (silence)
    const silentFrame = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      silentFrame[i] = 0;
    }
    
    // Scale and copy to WASM heap
    const scaledInput = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      scaledInput[i] = silentFrame[i] * 32768.0;
    }
    module.HEAPF32.set(scaledInput, inputPtr >> 2);
    
    console.log('\n🎯 Testing _rnnoise_process_frame...');
    
    // Test 1: Call with separate buffers
    console.log('\nTest 1: Separate buffers (input, output)');
    const vad1 = module._rnnoise_process_frame(state, outputPtr, inputPtr);
    console.log('Return value:', vad1);
    console.log('Type:', typeof vad1);
    
    // Test 2: Call with in-place processing
    console.log('\nTest 2: In-place processing (same buffer)');
    const vad2 = module._rnnoise_process_frame(state, inputPtr, inputPtr);
    console.log('Return value:', vad2);
    console.log('Type:', typeof vad2);
    
    // Test 3: Create voice-like signal
    console.log('\nTest 3: Voice-like signal');
    const voiceFrame = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      // Simple sine wave at 200Hz (typical voice pitch)
      voiceFrame[i] = 0.3 * Math.sin(2 * Math.PI * 200 * i / 48000);
    }
    
    // Scale and copy
    for (let i = 0; i < FRAME_SIZE; i++) {
      scaledInput[i] = voiceFrame[i] * 32768.0;
    }
    module.HEAPF32.set(scaledInput, inputPtr >> 2);
    
    const vad3 = module._rnnoise_process_frame(state, outputPtr, inputPtr);
    console.log('Return value:', vad3);
    console.log('Type:', typeof vad3);
    
    // Clean up
    module._free(inputPtr);
    module._free(outputPtr);
    module._rnnoise_destroy(state);
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Export for use in browser console
window.testVAD = testVAD;
console.log('Test loaded! Run window.testVAD() in the console');