import { AudioEngine } from './types';

export interface AudioWorkletEngineConfig {
  enableRNNoise?: boolean;
  rnnoiseWasmUrl?: string;
}

export class AudioWorkletEngine implements AudioEngine {
  name = 'AudioWorklet';
  description = 'High-performance audio processing using AudioWorklet API';
  isInitialized = false;
  
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private config: AudioWorkletEngineConfig;
  private performanceCallback?: (metrics: any) => void;
  
  constructor(config: AudioWorkletEngineConfig = {}) {
    this.config = {
      enableRNNoise: config.enableRNNoise ?? true,
      rnnoiseWasmUrl: config.rnnoiseWasmUrl
    };
  }
  
  isAudioWorkletSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    try {
      // Check if AudioContext exists
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        return false;
      }
      
      // Check if AudioWorklet class exists
      if (!(window as any).AudioWorklet) {
        return false;
      }
      
      // Create a test context to check for audioWorklet property
      const testContext = new AudioContextClass();
      const supported = 'audioWorklet' in testContext;
      
      // Clean up test context if it has close method
      if (testContext.close) {
        testContext.close();
      }
      
      return supported;
    } catch (error) {
      return false;
    }
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (!this.isAudioWorkletSupported()) {
      throw new Error('AudioWorklet is not supported in this browser');
    }
    
    // Create AudioContext
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    
    // Load the AudioWorklet processor
    const processorCode = this.getProcessorCode();
    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const processorUrl = URL.createObjectURL(blob);
    
    try {
      await this.audioContext!.audioWorklet.addModule(processorUrl);
      this.isInitialized = true;
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(processorUrl);
    }
  }
  
  private getProcessorCode(): string {
    // Migrated from ScriptProcessorNode by direct refactor, no new class created.
    return `
      class RNNoiseProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.isActive = true;
          this.isPaused = false;
          this.frameSize = 480; // RNNoise frame size
          this.inputBuffer = [];
          this.outputBuffer = [];
          this.isRNNoiseReady = false;
          this.rnnoiseModule = null;
          this.rnnoiseState = null;
          
          // Optimize for low latency
          this.maxBufferSize = 960; // 2x frame size max
          this.processingDelay = 0;
          
          // Metrics
          this.framesProcessed = 0;
          this.processingTimeSum = 0;
          this.inputLevel = 0;
          this.outputLevel = 0;
          
          // AGC state
          this.agcEnabled = false;
          this.agcTargetLevel = 0.3;
          this.agcCurrentGain = 1.0;
          
          // Setup message handling
          this.port.onmessage = (event) => {
            this.handleMessage(event.data);
          };
        }
        
        handleMessage(message) {
          switch (message.type) {
            case 'initialize':
              if (message.data.enableRNNoise) {
                this.initializeRNNoise(message.data.wasmUrl);
              }
              if (message.data.enableAGC !== undefined) {
                this.agcEnabled = message.data.enableAGC;
              }
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
          }
        }
        
        async initializeRNNoise(wasmUrl) {
          try {
            // In AudioWorklet context, we need to load WASM differently
            if (wasmUrl) {
              const response = await fetch(wasmUrl);
              const wasmBuffer = await response.arrayBuffer();
              
              // This is a simplified version - in reality, we'd need to
              // properly instantiate the WASM module in the worklet context
              console.log('RNNoise WASM loaded in AudioWorklet');
              
              // Mark as ready (in real implementation, after WASM is loaded)
              this.isRNNoiseReady = true;
            }
          } catch (error) {
            console.error('Failed to initialize RNNoise in AudioWorklet:', error);
          }
        }
        
        processFrame(frame) {
          // This is where RNNoise processing would happen
          // For now, apply simple gain reduction to simulate noise suppression
          const processed = new Float32Array(frame.length);
          for (let i = 0; i < frame.length; i++) {
            processed[i] = frame[i] * 0.8; // Simulated noise reduction
          }
          return processed;
        }
        
        calculateRMS(samples) {
          let sum = 0;
          for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
          }
          return Math.sqrt(sum / samples.length);
        }
        
        calculatePeak(samples) {
          let peak = 0;
          for (let i = 0; i < samples.length; i++) {
            peak = Math.max(peak, Math.abs(samples[i]));
          }
          return peak;
        }
        
        updateAGC(inputLevel) {
          if (!this.agcEnabled) return;
          
          const targetGain = this.agcTargetLevel / (inputLevel + 0.001);
          const limitedGain = Math.min(targetGain, 10); // Max 10x gain
          
          // Smooth gain changes
          const rate = limitedGain > this.agcCurrentGain ? 0.1 : 0.5;
          this.agcCurrentGain += (limitedGain - this.agcCurrentGain) * rate;
        }
        
        process(inputs, outputs, parameters) {
          const startTime = currentTime;
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
          
          // Calculate metrics
          this.inputLevel = this.calculateRMS(inputChannel);
          const inputPeak = this.calculatePeak(inputChannel);
          
          // Update AGC
          this.updateAGC(this.inputLevel);
          
          // Add input to buffer
          for (let i = 0; i < inputChannel.length; i++) {
            this.inputBuffer.push(inputChannel[i]);
          }
          
          // Process buffered frames
          let outputIndex = 0;
          while (this.inputBuffer.length >= this.frameSize && outputIndex < outputChannel.length) {
            // Get frame
            const frame = new Float32Array(this.frameSize);
            for (let i = 0; i < this.frameSize; i++) {
              frame[i] = this.inputBuffer.shift();
            }
            
            // Apply AGC if enabled
            if (this.agcEnabled) {
              for (let i = 0; i < frame.length; i++) {
                frame[i] *= this.agcCurrentGain;
              }
            }
            
            // Process with RNNoise if ready
            const processed = this.isRNNoiseReady 
              ? this.processFrame(frame)
              : frame;
            
            // Add to output buffer
            for (let i = 0; i < processed.length; i++) {
              this.outputBuffer.push(processed[i]);
            }
            
            this.framesProcessed++;
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
                if (startIdx + j >= 0 && startIdx + j < outputChannel.length) {
                  outputChannel[startIdx + j] = processedFrame[j];
                }
              }
              
              this.bufferIndex = 0;
              this.framesProcessed++;
            }
          }
          
          // Handle remaining samples
          if (this.bufferIndex > 0) {
            const startIdx = inputChannel.length - this.bufferIndex;
            for (let i = 0; i < this.bufferIndex; i++) {
              if (startIdx + i < outputChannel.length) {
                outputChannel[startIdx + i] = this.inputBuffer[i];
              }
            }
          }
          
          // Track performance
          const processingTime = currentTime - startTime;
          this.processingTimeSum += processingTime;
          
          // Send performance metrics every 100 frames
          if (this.framesProcessed % 100 === 0) {
            this.port.postMessage({
              type: 'performance',
              metrics: {
                processingTime: this.processingTimeSum / 100,
                bufferUnderruns: this.bufferUnderruns,
                framesProcessed: this.framesProcessed
              }
            });
            this.processingTimeSum = 0;
            this.bufferUnderruns = 0;
          }
          
          return this.isActive;
        }
      }
      
      registerProcessor('rnnoise-processor', RNNoiseProcessor);
    `;
  }
  
  process(inputBuffer: Float32Array): Float32Array {
    if (!this.isInitialized) {
      throw new Error('AudioWorkletEngine not initialized');
    }
    
    // For now, return the input as-is
    // This will be replaced with actual AudioWorklet processing
    return inputBuffer;
  }
  
  createWorkletNode(): AudioWorkletNode {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioWorkletEngine not initialized');
    }
    
    // Create the AudioWorkletNode
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      'rnnoise-processor',
      {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          sampleRate: this.audioContext.sampleRate
        }
      }
    );
    
    // Set up message handler for performance metrics
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'performance' && this.performanceCallback) {
        this.performanceCallback(event.data.metrics);
      }
    };
    
    // Send initialization message
    this.workletNode.port.postMessage({
      type: 'initialize',
      data: {
        enableRNNoise: this.config.enableRNNoise,
        wasmUrl: this.config.rnnoiseWasmUrl
      }
    });
    
    return this.workletNode;
  }
  
  async processWithWorklet(inputBuffer: Float32Array): Promise<Float32Array> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioWorkletEngine not initialized');
    }
    
    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      1, // mono
      inputBuffer.length,
      this.audioContext.sampleRate
    );
    
    // Create buffer source
    const audioBuffer = offlineContext.createBuffer(1, inputBuffer.length, offlineContext.sampleRate);
    audioBuffer.copyToChannel(inputBuffer, 0);
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Load worklet in offline context
    const processorCode = this.getProcessorCode();
    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const processorUrl = URL.createObjectURL(blob);
    
    try {
      await offlineContext.audioWorklet.addModule(processorUrl);
      
      // Create worklet node in offline context
      const workletNode = new AudioWorkletNode(
        offlineContext,
        'rnnoise-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1]
        }
      );
      
      // Connect nodes
      source.connect(workletNode);
      workletNode.connect(offlineContext.destination);
      
      // Start and render
      source.start();
      const renderedBuffer = await offlineContext.startRendering();
      
      // Extract the processed audio
      const outputBuffer = new Float32Array(inputBuffer.length);
      renderedBuffer.copyFromChannel(outputBuffer, 0);
      
      return outputBuffer;
    } finally {
      URL.revokeObjectURL(processorUrl);
    }
  }
  
  async createStreamProcessor(stream: MediaStream): Promise<MediaStreamAudioSourceNode> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioWorkletEngine not initialized');
    }
    
    if (!this.workletNode) {
      this.createWorkletNode();
    }
    
    // Create media stream source
    const source = this.audioContext.createMediaStreamSource(stream);
    
    // Connect to worklet
    source.connect(this.workletNode!);
    
    // Connect to destination (for monitoring)
    this.workletNode!.connect(this.audioContext.destination);
    
    return source;
  }
  
  sendToWorklet(message: any): void {
    if (!this.workletNode) {
      throw new Error('Worklet node not created');
    }
    
    this.workletNode.port.postMessage(message);
  }
  
  onPerformanceMetrics(callback: (metrics: any) => void): void {
    this.performanceCallback = callback;
  }
  
  async createProcessingPipeline(constraints: any = {}): Promise<{
    input: MediaStreamAudioSourceNode;
    output: MediaStream;
    workletNode: AudioWorkletNode;
  }> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioWorkletEngine not initialized');
    }
    
    // Get user media
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: constraints.echoCancellation ?? true,
        noiseSuppression: false, // We use RNNoise instead
        autoGainControl: constraints.autoGainControl ?? true,
        ...constraints
      }
    });
    
    // Create nodes
    const input = this.audioContext.createMediaStreamSource(stream);
    const destination = this.audioContext.createMediaStreamDestination();
    
    if (!this.workletNode) {
      this.createWorkletNode();
    }
    
    // Connect pipeline
    input.connect(this.workletNode!);
    this.workletNode!.connect(destination);
    
    return {
      input,
      output: destination.stream,
      workletNode: this.workletNode!
    };
  }
  
  getSupportedFeatures(): Record<string, boolean> {
    return {
      audioWorklet: this.isAudioWorkletSupported(),
      offlineProcessing: typeof OfflineAudioContext !== 'undefined',
      realtimeProcessing: true,
      performanceMetrics: true,
      wasmSupport: typeof WebAssembly !== 'undefined'
    };
  }
  
  cleanup(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isInitialized = false;
  }
}