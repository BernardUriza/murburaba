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
      rnnoiseWasmUrl: config.rnnoiseWasmUrl,
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

    try {
      // Use ES6 module instead of string pattern
      await this.audioContext!.audioWorklet.addModule(
        '/packages/murmuraba/src/engines/rnnoise-processor.worklet.js'
      );
      this.isInitialized = true;
      console.log('[AudioWorkletEngine] ES6 worklet module loaded successfully');
    } catch (error) {
      console.error('[AudioWorkletEngine] Failed to load ES6 worklet:', error);
      throw new Error(`Failed to load AudioWorklet module: ${error}`);
    }
  }

  process(inputBuffer: Float32Array): Float32Array {
    if (!this.isInitialized) {
      throw new Error('AudioWorkletEngine not initialized');
    }

    // For now, return the input as-is
    // This will be replaced with actual AudioWorklet processing
    return inputBuffer;
  }

  async createWorkletNode(): Promise<AudioWorkletNode> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioWorkletEngine not initialized');
    }

    // Create the AudioWorkletNode
    this.workletNode = new AudioWorkletNode(this.audioContext, 'rnnoise-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: {
        sampleRate: this.audioContext.sampleRate,
      },
    });

    // Set up message handler for performance metrics
    this.workletNode.port.onmessage = event => {
      if (event.data.type === 'performance' && this.performanceCallback) {
        this.performanceCallback(event.data.metrics);
      }
    };

    // Send initialization message with WASM buffer
    if (this.config.enableRNNoise) {
      try {
        // Load WASM buffer directly from wasm-data module
        const { decodeWasmBase64 } = await import('../utils/wasm-data');
        const wasmBuffer = await decodeWasmBase64();

        this.workletNode.port.postMessage({
          type: 'initialize',
          data: {
            wasmBuffer: wasmBuffer,
          },
        });
        console.log('[AudioWorkletEngine] WASM buffer sent to worklet');
      } catch (error) {
        console.error('[AudioWorkletEngine] Failed to load WASM for worklet:', error);
        // Initialize without RNNoise
        this.workletNode.port.postMessage({
          type: 'initialize',
          data: {},
        });
      }
    } else {
      this.workletNode.port.postMessage({
        type: 'initialize',
        data: {},
      });
    }

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
    const audioBuffer = offlineContext.createBuffer(
      1,
      inputBuffer.length,
      offlineContext.sampleRate
    );
    audioBuffer.copyToChannel(inputBuffer, 0);

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    try {
      // Load ES6 worklet module
      await offlineContext.audioWorklet.addModule(
        '/packages/murmuraba/src/engines/rnnoise-processor.worklet.js'
      );

      // Create worklet node in offline context
      const workletNode = new AudioWorkletNode(offlineContext, 'rnnoise-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });

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
    } catch (error) {
      console.error('[AudioWorkletEngine] Offline processing failed:', error);
      throw error;
    }
  }

  async createStreamProcessor(stream: MediaStream): Promise<MediaStreamAudioSourceNode> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('AudioWorkletEngine not initialized');
    }

    if (!this.workletNode) {
      await this.createWorkletNode();
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
        ...constraints,
      },
    });

    // Create nodes
    const input = this.audioContext.createMediaStreamSource(stream);
    const destination = this.audioContext.createMediaStreamDestination();

    if (!this.workletNode) {
      await this.createWorkletNode();
    }

    // Connect pipeline
    input.connect(this.workletNode!);
    this.workletNode!.connect(destination);

    return {
      input,
      output: destination.stream,
      workletNode: this.workletNode!,
    };
  }

  getSupportedFeatures(): Record<string, boolean> {
    return {
      audioWorklet: this.isAudioWorkletSupported(),
      offlineProcessing: typeof OfflineAudioContext !== 'undefined',
      realtimeProcessing: true,
      performanceMetrics: true,
      wasmSupport: typeof WebAssembly !== 'undefined',
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
