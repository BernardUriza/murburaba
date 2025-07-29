/**
 * SIMPLIFIED AUDIO RECORDER
 * No DI, no factories, no 10 layers of abstraction
 * Just audio processing that works
 */

export interface SimpleMetrics {
  inputLevel: number;
  vad: number;
  noiseReduction: number;
}

export interface SimpleChunk {
  id: string;
  blob: Blob;
  duration: number;
  vad: number;
}

export class SimplifiedAudioRecorder {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private isRecording = false;
  
  // RNNoise
  private wasmModule: any = null;
  private rnnoiseState: number = 0;
  private inputPtr: number = 0;
  private outputPtr: number = 0;
  
  // Callbacks - DIRECT, no event emitters
  private onMetrics: ((metrics: SimpleMetrics) => void) | null = null;
  private onChunk: ((chunk: SimpleChunk) => void) | null = null;
  
  // Chunk processing
  private chunkBuffer: Float32Array[] = [];
  private chunkDuration = 8; // seconds
  private sampleRate = 48000;
  private samplesPerChunk = this.sampleRate * this.chunkDuration;
  private currentSamples = 0;
  
  constructor() {
    console.log('SimplifiedAudioRecorder: Created');
  }
  
  async initialize() {
    // Load WASM once
    if (!this.wasmModule) {
      const RNNoise = (await import('../wasm/rnnoise-loader')).default;
      this.wasmModule = await RNNoise();
      
      // Allocate memory
      this.inputPtr = this.wasmModule._malloc(480 * 4);
      this.outputPtr = this.wasmModule._malloc(480 * 4);
      
      // Create RNNoise state
      this.rnnoiseState = this.wasmModule._rnnoise_create();
      console.log('SimplifiedAudioRecorder: WASM loaded');
    }
    
    // Create audio context
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    console.log('SimplifiedAudioRecorder: Initialized');
  }
  
  async startRecording(
    onMetrics: (metrics: SimpleMetrics) => void,
    onChunk: (chunk: SimpleChunk) => void
  ) {
    if (this.isRecording) return;
    
    this.onMetrics = onMetrics;
    this.onChunk = onChunk;
    this.isRecording = true;
    
    // Get microphone
    this.stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    
    if (!this.audioContext) throw new Error('Not initialized');
    
    // Create nodes
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(512, 1, 1);
    
    // Process audio
    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      
      // Process with RNNoise
      let totalVad = 0;
      let framesProcessed = 0;
      
      // Process in 480-sample frames
      for (let offset = 0; offset < input.length; offset += 480) {
        if (offset + 480 > input.length) break;
        
        const frame = input.slice(offset, offset + 480);
        const { processedFrame, vad } = this.processFrame(frame);
        
        // Copy to output
        for (let i = 0; i < 480; i++) {
          if (offset + i < output.length) {
            output[offset + i] = processedFrame[i];
          }
        }
        
        totalVad += vad;
        framesProcessed++;
      }
      
      // Calculate metrics
      const avgVad = framesProcessed > 0 ? totalVad / framesProcessed : 0;
      const inputLevel = this.calculateRMS(input);
      
      // Send metrics DIRECTLY to UI
      if (this.onMetrics) {
        this.onMetrics({
          inputLevel,
          vad: avgVad,
          noiseReduction: avgVad > 0.5 ? 0.3 : 0.1
        });
      }
      
      // Add to chunk buffer
      this.chunkBuffer.push(new Float32Array(output));
      this.currentSamples += output.length;
      
      // Check if we have a complete chunk
      if (this.currentSamples >= this.samplesPerChunk) {
        this.emitChunk();
      }
    };
    
    // Connect
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    
    console.log('SimplifiedAudioRecorder: Recording started');
  }
  
  stopRecording() {
    this.isRecording = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Process remaining samples
    if (this.currentSamples > 0) {
      this.emitChunk();
    }
    
    console.log('SimplifiedAudioRecorder: Recording stopped');
  }
  
  private processFrame(frame: Float32Array): { processedFrame: Float32Array, vad: number } {
    if (!this.wasmModule || !this.rnnoiseState) {
      return { processedFrame: frame, vad: 0 };
    }
    
    // Scale input for RNNoise
    const scaled = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      scaled[i] = frame[i] * 32768;
    }
    
    // Write to WASM memory
    this.wasmModule.HEAPF32.set(scaled, this.inputPtr >> 2);
    
    // Process
    const vad = this.wasmModule._rnnoise_process_frame(
      this.rnnoiseState,
      this.outputPtr,
      this.inputPtr
    );
    
    // Read output
    const processedFrame = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      const sample = this.wasmModule.HEAPF32[(this.outputPtr >> 2) + i];
      processedFrame[i] = sample / 32768;
    }
    
    return { processedFrame, vad };
  }
  
  private calculateRMS(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }
  
  private async emitChunk() {
    // Combine all samples
    const totalSamples = this.chunkBuffer.reduce((acc, buf) => acc + buf.length, 0);
    const combined = new Float32Array(totalSamples);
    let offset = 0;
    
    for (const buffer of this.chunkBuffer) {
      combined.set(buffer, offset);
      offset += buffer.length;
    }
    
    // Convert to WAV
    const wav = this.encodeWAV(combined);
    const blob = new Blob([wav], { type: 'audio/wav' });
    
    // Calculate average VAD
    const vad = 0.5; // TODO: Track this properly
    
    // Emit chunk DIRECTLY
    if (this.onChunk) {
      this.onChunk({
        id: `chunk-${Date.now()}`,
        blob,
        duration: combined.length / this.sampleRate,
        vad
      });
    }
    
    // Reset buffer
    this.chunkBuffer = [];
    this.currentSamples = 0;
  }
  
  private encodeWAV(samples: Float32Array): ArrayBuffer {
    const length = samples.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return buffer;
  }
  
  destroy() {
    this.stopRecording();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.wasmModule) {
      if (this.inputPtr) this.wasmModule._free(this.inputPtr);
      if (this.outputPtr) this.wasmModule._free(this.outputPtr);
      if (this.rnnoiseState) this.wasmModule._rnnoise_destroy(this.rnnoiseState);
      this.wasmModule = null;
    }
    
    console.log('SimplifiedAudioRecorder: Destroyed');
  }
}