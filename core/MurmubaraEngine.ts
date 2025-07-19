import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { Logger } from './Logger';
import { WorkerManager } from '../managers/WorkerManager';
import { MetricsManager } from '../managers/MetricsManager';
import { ChunkProcessor } from '../managers/ChunkProcessor';
import {
  MurmubaraConfig,
  EngineEvents,
  StreamController,
  DiagnosticInfo,
  MurmubaraError,
  ErrorCodes,
  ProcessingMetrics,
  ChunkConfig,
  EngineState,
} from '../types';

export class MurmubaraEngine extends EventEmitter<EngineEvents> {
  private config: Required<MurmubaraConfig>;
  private stateManager: StateManager;
  private logger: Logger;
  private workerManager: WorkerManager;
  private metricsManager: MetricsManager;
  private audioContext?: AudioContext;
  private activeStreams: Map<string, StreamController> = new Map();
  private wasmModule?: any;
  private rnnoiseState?: any;
  private inputPtr?: number;
  private outputPtr?: number;
  private initPromise?: Promise<void>;
  private cleanupTimer?: NodeJS.Timeout;
  private errorHistory: Array<{ timestamp: number; error: string }> = [];
  
  constructor(config: MurmubaraConfig = {}) {
    super();
    
    this.config = {
      logLevel: config.logLevel || 'info',
      onLog: config.onLog || undefined,
      noiseReductionLevel: config.noiseReductionLevel || 'medium',
      bufferSize: config.bufferSize || 4096,
      algorithm: config.algorithm || 'rnnoise',
      autoCleanup: config.autoCleanup ?? true,
      cleanupDelay: config.cleanupDelay || 30000,
      useWorker: config.useWorker ?? false,
      workerPath: config.workerPath || '/murmuraba.worker.js',
    } as Required<MurmubaraConfig>;
    
    this.logger = new Logger('[Murmuraba]');
    this.logger.setLevel(this.config.logLevel);
    if (this.config.onLog) {
      this.logger.setLogHandler(this.config.onLog);
    }
    
    this.stateManager = new StateManager();
    this.workerManager = new WorkerManager(this.logger);
    this.metricsManager = new MetricsManager();
    
    this.setupEventForwarding();
    this.setupAutoCleanup();
  }
  
  private setupEventForwarding(): void {
    this.stateManager.on('state-change', (oldState, newState) => {
      this.logger.info(`State transition: ${oldState} -> ${newState}`);
      this.emit('state-change', oldState, newState);
    });
    
    this.metricsManager.on('metrics-update', (metrics) => {
      this.emit('metrics-update', metrics);
    });
  }
  
  private setupAutoCleanup(): void {
    if (!this.config.autoCleanup) return;
    
    const resetCleanupTimer = () => {
      if (this.cleanupTimer) {
        clearTimeout(this.cleanupTimer);
      }
      
      if (this.activeStreams.size === 0 && this.stateManager.isInState('ready')) {
        this.cleanupTimer = setTimeout(() => {
          this.logger.info('Auto-cleanup triggered due to inactivity');
          this.destroy();
        }, this.config.cleanupDelay);
      }
    };
    
    this.on('processing-start', () => {
      if (this.cleanupTimer) {
        clearTimeout(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }
    });
    
    this.on('processing-end', resetCleanupTimer);
  }
  
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    if (!this.stateManager.canTransitionTo('initializing')) {
      throw new MurmubaraError(
        ErrorCodes.ALREADY_INITIALIZED,
        'Engine is already initialized or in an invalid state'
      );
    }
    
    this.initPromise = this.performInitialization();
    return this.initPromise;
  }
  
  private async performInitialization(): Promise<void> {
    this.stateManager.transitionTo('initializing');
    
    try {
      this.logger.info('Initializing Murmuraba engine...');
      
      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      
      // Load WASM module
      await this.loadWasmModule();
      
      // Initialize metrics
      this.metricsManager.startAutoUpdate(100);
      
      this.stateManager.transitionTo('ready');
      this.emit('initialized');
      this.logger.info('Murmuraba engine initialized successfully');
      
    } catch (error) {
      this.stateManager.transitionTo('error');
      const murmubaraError = new MurmubaraError(
        ErrorCodes.INITIALIZATION_FAILED,
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      this.emit('error', murmubaraError);
      throw murmubaraError;
    }
  }
  
  private async loadWasmModule(): Promise<void> {
    this.logger.debug('Loading WASM module...');
    
    // Load the RNNoise script
    const script = document.createElement('script');
    script.src = '/rnnoise-fixed.js';
    
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load RNNoise script'));
      document.head.appendChild(script);
    });
    
    // Create WASM module
    const createRNNWasmModule = (window as any).createRNNWasmModule;
    if (!createRNNWasmModule) {
      throw new Error('RNNoise WASM module creator not found');
    }
    
    this.wasmModule = await createRNNWasmModule({
      locateFile: (filename: string) => {
        if (filename.endsWith('.wasm')) {
          return `/dist/${filename}`;
        }
        return filename;
      }
    });
    
    // Create RNNoise state
    this.rnnoiseState = this.wasmModule._rnnoise_create(0);
    if (!this.rnnoiseState) {
      throw new Error('Failed to create RNNoise state');
    }
    
    // Allocate memory
    this.inputPtr = this.wasmModule._malloc(480 * 4);
    this.outputPtr = this.wasmModule._malloc(480 * 4);
    
    // Warm up the model
    await this.warmupModel();
    
    this.logger.debug('WASM module loaded successfully');
  }
  
  private async warmupModel(): Promise<void> {
    this.logger.debug('Warming up noise reduction model...');
    const silentFrame = new Float32Array(480);
    
    for (let i = 0; i < 10; i++) {
      this.processFrame(silentFrame);
    }
  }
  
  private processFrame(frame: Float32Array): Float32Array {
    if (!this.wasmModule || !this.rnnoiseState || !this.inputPtr || !this.outputPtr) {
      throw new Error('WASM module not initialized');
    }
    
    // Copy to WASM heap
    this.wasmModule.HEAPF32.set(frame, this.inputPtr >> 2);
    
    // Process with RNNoise
    this.wasmModule._rnnoise_process_frame(
      this.rnnoiseState,
      this.outputPtr,
      this.inputPtr
    );
    
    // Get output
    const output = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      output[i] = this.wasmModule.HEAPF32[(this.outputPtr >> 2) + i];
    }
    
    return output;
  }
  
  async processStream(
    stream: MediaStream,
    chunkConfig?: ChunkConfig
  ): Promise<StreamController> {
    this.stateManager.requireState('ready', 'processing');
    
    const streamId = this.generateStreamId();
    this.logger.info(`Processing stream ${streamId}`);
    
    try {
      const controller = await this.createStreamController(stream, streamId, chunkConfig);
      this.activeStreams.set(streamId, controller);
      
      if (this.activeStreams.size === 1) {
        this.stateManager.transitionTo('processing');
        this.emit('processing-start');
      }
      
      return controller;
      
    } catch (error) {
      const murmubaraError = new MurmubaraError(
        ErrorCodes.PROCESSING_FAILED,
        `Failed to process stream: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      this.emit('error', murmubaraError);
      throw murmubaraError;
    }
  }
  
  private async createStreamController(
    stream: MediaStream,
    streamId: string,
    chunkConfig?: ChunkConfig
  ): Promise<StreamController> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }
    
    const source = this.audioContext.createMediaStreamSource(stream);
    const destination = this.audioContext.createMediaStreamDestination();
    const processor = this.audioContext.createScriptProcessor(this.config.bufferSize, 1, 1);
    
    let isPaused = false;
    let isStopped = false;
    const inputBuffer: number[] = [];
    const outputBuffer: number[] = [];
    
    // Setup chunk processor if configured
    let chunkProcessor: ChunkProcessor | undefined;
    if (chunkConfig) {
      chunkProcessor = new ChunkProcessor(
        this.audioContext.sampleRate,
        chunkConfig,
        this.logger,
        this.metricsManager
      );
      
      // Forward chunk events
      chunkProcessor.on('chunk-processed', (metrics) => {
        this.logger.debug('Chunk processed:', metrics);
        this.metricsManager.recordChunk(metrics);
      });
    }
    
    processor.onaudioprocess = (event) => {
      if (isStopped || isPaused) {
        event.outputBuffer.getChannelData(0).fill(0);
        return;
      }
      
      const input = event.inputBuffer.getChannelData(0);
      const output = event.outputBuffer.getChannelData(0);
      
      // Update metrics
      const inputLevel = this.metricsManager.calculateRMS(input);
      const inputPeak = this.metricsManager.calculatePeak(input);
      this.metricsManager.updateInputLevel(inputPeak);
      
      // Add to buffer
      for (let i = 0; i < input.length; i++) {
        inputBuffer.push(input[i]);
      }
      
      // If using chunk processing, add samples to chunk processor
      if (chunkProcessor && !isPaused && !isStopped) {
        chunkProcessor.addSamples(input);
      }
      
      // Process frames
      while (inputBuffer.length >= 480) {
        const frame = new Float32Array(inputBuffer.splice(0, 480));
        const processed = this.processFrame(frame);
        
        // Apply noise reduction level adjustment
        const reductionFactor = this.getReductionFactor();
        for (let i = 0; i < processed.length; i++) {
          processed[i] *= reductionFactor;
          outputBuffer.push(processed[i]);
        }
        
        this.metricsManager.recordFrame();
      }
      
      // Output processed audio
      for (let i = 0; i < output.length; i++) {
        if (outputBuffer.length > 0) {
          output[i] = outputBuffer.shift()!;
        } else {
          output[i] = 0;
        }
      }
      
      // Update output metrics
      const outputLevel = this.metricsManager.calculateRMS(output);
      const outputPeak = this.metricsManager.calculatePeak(output);
      this.metricsManager.updateOutputLevel(outputPeak);
      
      // Calculate noise reduction
      const reduction = inputLevel > 0 ? (1 - outputLevel / inputLevel) * 100 : 0;
      this.metricsManager.updateNoiseReduction(reduction);
    };
    
    source.connect(processor);
    processor.connect(destination);
    
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
        
        // Flush any remaining chunks
        if (chunkProcessor) {
          chunkProcessor.flush();
        }
        
        processor.disconnect();
        source.disconnect();
        this.activeStreams.delete(streamId);
        this.logger.info(`Stream ${streamId} stopped`);
        
        if (this.activeStreams.size === 0) {
          this.stateManager.transitionTo('ready');
          this.emit('processing-end');
        }
      },
      pause: () => {
        isPaused = true;
        controller.processor.state = 'paused';
        this.logger.debug(`Stream ${streamId} paused`);
      },
      resume: () => {
        isPaused = false;
        controller.processor.state = 'processing';
        this.logger.debug(`Stream ${streamId} resumed`);
      },
      getState: () => controller.processor.state as EngineState,
    };
    
    return controller;
  }
  
  private getReductionFactor(): number {
    switch (this.config.noiseReductionLevel) {
      case 'low': return 0.9;
      case 'medium': return 0.7;
      case 'high': return 0.5;
      case 'auto': return 0.7; // TODO: Implement auto adjustment
      default: return 0.7;
    }
  }
  
  private generateStreamId(): string {
    return `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async destroy(force: boolean = false): Promise<void> {
    if (!this.stateManager.canTransitionTo('destroying')) {
      if (force) {
        this.logger.warn('Force destroying engine');
      } else {
        throw new MurmubaraError(
          ErrorCodes.CLEANUP_FAILED,
          'Cannot destroy engine in current state'
        );
      }
    }
    
    this.stateManager.transitionTo('destroying');
    this.logger.info('Destroying Murmuraba engine...');
    
    try {
      // Stop all active streams
      for (const [id, controller] of this.activeStreams) {
        controller.stop();
      }
      this.activeStreams.clear();
      
      // Stop metrics
      this.metricsManager.stopAutoUpdate();
      
      // Terminate workers
      this.workerManager.terminateAll();
      
      // Clean up WASM
      if (this.wasmModule) {
        if (this.inputPtr) this.wasmModule._free(this.inputPtr);
        if (this.outputPtr) this.wasmModule._free(this.outputPtr);
        if (this.rnnoiseState) this.wasmModule._rnnoise_destroy(this.rnnoiseState);
      }
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }
      
      // Clear timers
      if (this.cleanupTimer) {
        clearTimeout(this.cleanupTimer);
      }
      
      // Remove all event listeners
      this.removeAllListeners();
      
      this.stateManager.transitionTo('destroyed');
      this.emit('destroyed');
      this.logger.info('Murmuraba engine destroyed successfully');
      
    } catch (error) {
      this.stateManager.transitionTo('error');
      const murmubaraError = new MurmubaraError(
        ErrorCodes.CLEANUP_FAILED,
        `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      this.emit('error', murmubaraError);
      throw murmubaraError;
    }
  }
  
  getMetrics(): ProcessingMetrics {
    return this.metricsManager.getMetrics();
  }
  
  onMetricsUpdate(callback: (metrics: ProcessingMetrics) => void): void {
    this.on('metrics-update', callback);
  }
  
  getDiagnostics(): DiagnosticInfo {
    return {
      engineVersion: '2.0.0',
      wasmLoaded: !!this.wasmModule,
      activeProcessors: this.activeStreams.size,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      processingTime: this.metricsManager.getMetrics().processingLatency,
      engineState: this.stateManager.getState(),
      errors: this.errorHistory,
    };
  }
  
  private recordError(error: string): void {
    this.errorHistory.push({
      timestamp: Date.now(),
      error,
    });
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }
  }
}