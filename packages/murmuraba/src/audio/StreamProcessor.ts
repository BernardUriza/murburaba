/**
 * StreamProcessor - Dedicated stream management and processing
 * 
 * EXTRACTION: From MurmubaraEngine.createStreamController() (lines 490-842)
 * PHILOSOPHY: One module = one responsibility (MediaStream lifecycle)
 */

import { EventEmitter } from '../core/EventEmitter';
import { FrameProcessor } from './FrameProcessor';
import { WasmManager } from './WasmManager';
import type { Logger } from '../core/Logger';
import type { ChunkConfig } from '../types/audio-types';

export interface StreamProcessorConfig {
  bufferSize?: number;
  enableAGC?: boolean;
  logger?: Logger;
}

export interface StreamController {
  stream: MediaStream;
  processor: {
    id: string;
    state: 'processing' | 'paused' | 'stopped';
    inputNode: MediaStreamAudioSourceNode;
    outputNode: MediaStreamAudioDestinationNode;
  };
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getState: () => string;
}

export class StreamProcessor extends EventEmitter {
  private audioContext: AudioContext;
  private wasmManager: WasmManager;
  private frameProcessor: FrameProcessor;
  private logger?: Logger;
  private config: Required<StreamProcessorConfig>;
  
  private activeControllers = new Map<string, StreamController>();
  private processorId = 0;

  constructor(
    audioContext: AudioContext,
    wasmManager: WasmManager,
    config: StreamProcessorConfig = {}
  ) {
    super();
    
    this.audioContext = audioContext;
    this.wasmManager = wasmManager;
    this.frameProcessor = new FrameProcessor();
    this.logger = config.logger;
    
    this.config = {
      bufferSize: config.bufferSize || 4096,
      enableAGC: config.enableAGC ?? true,
      logger: config.logger,
    };
  }

  async processStream(
    stream: MediaStream,
    chunkConfig?: ChunkConfig
  ): Promise<StreamController> {
    const streamId = this.generateStreamId();
    this.logger?.info(`Processing stream ${streamId}`);

    try {
      const controller = await this.createStreamController(stream, streamId, chunkConfig);
      this.activeControllers.set(streamId, controller);
      
      this.emit('stream-started', streamId);
      return controller;
    } catch (error) {
      this.logger?.error(`Failed to process stream ${streamId}:`, error);
      throw error;
    }
  }

  private async createStreamController(
    stream: MediaStream,
    streamId: string,
    chunkConfig?: ChunkConfig
  ): Promise<StreamController> {
    const source = this.audioContext.createMediaStreamSource(stream);
    const destination = this.audioContext.createMediaStreamDestination();

    // Use AudioWorklet with fallback to ScriptProcessor
    const processor = await this.createAudioProcessor();
    
    let isPaused = false;
    let isStopped = false;

    // Setup audio processing pipeline
    this.setupProcessingPipeline(source, processor, destination);

    const controller: StreamController = {
      stream: destination.stream,
      processor: {
        id: streamId,
        state: 'processing',
        inputNode: source,
        outputNode: destination,
      },
      stop: () => {
        isStopped = true;
        processor.disconnect();
        source.disconnect();
        this.activeControllers.delete(streamId);
        this.logger?.info(`Stream ${streamId} stopped`);
        this.emit('stream-stopped', streamId);
      },
      pause: () => {
        isPaused = true;
        controller.processor.state = 'paused';
        this.logger?.debug(`Stream ${streamId} paused`);
      },
      resume: () => {
        isPaused = false;
        controller.processor.state = 'processing';
        this.logger?.debug(`Stream ${streamId} resumed`);
      },
      getState: () => controller.processor.state,
    };

    return controller;
  }

  private async createAudioProcessor(): Promise<AudioWorkletNode | ScriptProcessorNode> {
    // Check if AudioWorklet is available
    const isAudioWorkletSupported = 
      'audioWorklet' in this.audioContext && 
      typeof this.audioContext.audioWorklet.addModule === 'function';

    if (isAudioWorkletSupported) {
      return this.createWorkletProcessor();
    } else {
      return this.createScriptProcessor();
    }
  }

  private async createWorkletProcessor(): Promise<AudioWorkletNode> {
    try {
      // Try to use existing worklet if available
      const processor = new AudioWorkletNode(this.audioContext, 'rnnoise-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          sampleRate: this.audioContext.sampleRate,
          bufferSize: this.config.bufferSize,
        },
      });

      // Configure worklet
      processor.port.postMessage({
        type: 'initialize',
        data: {
          enableRNNoise: true,
          enableAGC: this.config.enableAGC,
          targetLevel: 0.3,
        },
      });

      // Handle messages from worklet
      processor.port.onmessage = (event) => {
        if (event.data.type === 'metrics') {
          this.emit('metrics', event.data);
        }
      };

      this.logger?.info('✅ Using AudioWorkletNode for low-latency processing');
      return processor;
    } catch (error) {
      this.logger?.warn('⚠️  AudioWorklet failed, falling back to ScriptProcessor');
      return this.createScriptProcessor();
    }
  }

  private createScriptProcessor(): ScriptProcessorNode {
    this.logger?.warn('⚠️  Using ScriptProcessor (higher latency)');
    
    const processor = (this.audioContext as any).createScriptProcessor(
      this.config.bufferSize, 
      1, 
      1
    );

    // Setup ScriptProcessor handler
    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      this.handleScriptProcessorAudio(event);
    };

    return processor;
  }

  private handleScriptProcessorAudio(event: AudioProcessingEvent): void {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);

    // Process audio with frame processor
    const inputBuffer: number[] = [];
    const outputBuffer: number[] = [];

    // Add to buffer
    for (let i = 0; i < input.length; i++) {
      inputBuffer.push(input[i]);
    }

    // Process frames
    while (inputBuffer.length >= FrameProcessor.FRAME_SIZE) {
      const frame = new Float32Array(
        inputBuffer.splice(0, FrameProcessor.FRAME_SIZE)
      );

      try {
        if (this.wasmManager.isInitialized()) {
          const module = this.wasmManager.getModule()!;
          const state = this.wasmManager.createState();
          const inputPtr = this.wasmManager.allocateMemory(FrameProcessor.FRAME_SIZE);
          const outputPtr = this.wasmManager.allocateMemory(FrameProcessor.FRAME_SIZE);

          const result = this.frameProcessor.processFrame(
            frame, 
            module, 
            state, 
            inputPtr, 
            outputPtr
          );

          // Add processed audio to output buffer
          for (let i = 0; i < result.output.length; i++) {
            outputBuffer.push(result.output[i]);
          }

          // Emit metrics
          this.emit('metrics', {
            inputLevel: this.frameProcessor.calculateRMS(frame),
            outputLevel: this.frameProcessor.calculateRMS(result.output),
            vad: result.vad,
          });

          // Cleanup
          this.wasmManager.freeMemory(inputPtr);
          this.wasmManager.freeMemory(outputPtr);
          this.wasmManager.destroyState(state);
        } else {
          // Fallback: passthrough
          for (let i = 0; i < frame.length; i++) {
            outputBuffer.push(frame[i]);
          }
        }
      } catch (error) {
        this.logger?.error('Frame processing error:', error);
        // Fallback: passthrough
        for (let i = 0; i < frame.length; i++) {
          outputBuffer.push(frame[i]);
        }
      }
    }

    // Output processed audio
    for (let i = 0; i < output.length; i++) {
      if (outputBuffer.length > 0) {
        output[i] = outputBuffer.shift()!;
      } else {
        output[i] = 0;
      }
    }
  }

  private setupProcessingPipeline(
    source: MediaStreamAudioSourceNode,
    processor: AudioWorkletNode | ScriptProcessorNode,
    destination: MediaStreamAudioDestinationNode
  ): void {
    // Direct connection: source -> processor -> destination
    source.connect(processor);
    processor.connect(destination);
  }

  private generateStreamId(): string {
    return `stream-${Date.now()}-${++this.processorId}`;
  }

  getActiveStreams(): string[] {
    return Array.from(this.activeControllers.keys());
  }

  stopAllStreams(): void {
    this.activeControllers.forEach((controller) => {
      controller.stop();
    });
    this.activeControllers.clear();
  }

  cleanup(): void {
    this.stopAllStreams();
    this.removeAllListeners();
    this.logger?.debug('StreamProcessor cleaned up');
  }
}