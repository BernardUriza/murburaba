import { AudioResampler } from '../utils/AudioResampler'
import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { Logger } from './Logger';
import { WorkerManager } from '../managers/WorkerManager';
import { MetricsManager } from '../managers/MetricsManager';
import { ChunkProcessor } from '../managers/ChunkProcessor';
import { SimpleAGC } from '../utils/SimpleAGC';
import {
  MurmubaraConfig,
  EngineEvents,
  StreamController,
  DiagnosticInfo,
  DiagnosticReport,
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
  private agcEnabled = true;
  private agc?: SimpleAGC;
  
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
      allowDegraded: config.allowDegraded ?? false,
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
      
      // Check environment support first
      if (!this.checkEnvironmentSupport()) {
        throw new Error('Environment not supported: Missing required APIs');
      }
      
      // Create audio context with fallbacks
      this.stateManager.transitionTo('creating-context');
      await this.initializeAudioContext();
      
      // Load WASM module with timeout
      this.stateManager.transitionTo('loading-wasm');
      await this.loadWasmModuleWithTimeout(5000);
      
      // Initialize metrics
      this.metricsManager.startAutoUpdate(100);
      
      this.stateManager.transitionTo('ready');
      this.emit('initialized');
      this.logger.info('Murmuraba engine initialized successfully');
      
    } catch (error) {
      this.stateManager.transitionTo('error');
      this.recordError(error);
      
      const murmubaraError = new MurmubaraError(
        ErrorCodes.INITIALIZATION_FAILED,
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      this.emit('error', murmubaraError);
      
      // Try degraded mode if configured
      if (this.config.allowDegraded) {
        this.logger.warn('Attempting degraded mode initialization...');
        await this.initializeDegraded();
      } else {
        throw murmubaraError;
      }
    }
  }
  
  private checkEnvironmentSupport(): boolean {
    // Check for required APIs
    const hasAudioContext = !!(
      window.AudioContext || 
      (window as any).webkitAudioContext
    );
    const hasWebAssembly = !!window.WebAssembly;
    
    if (!hasAudioContext) {
      this.logger.error('AudioContext API not supported');
    }
    if (!hasWebAssembly) {
      this.logger.error('WebAssembly not supported');
    }
    
    return hasAudioContext && hasWebAssembly;
  }
  
  private async initializeAudioContext(): Promise<void> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 48000 });
      
      // Resume if suspended (for Chrome autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      throw new Error(`Failed to create AudioContext: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async loadWasmModuleWithTimeout(timeoutMs: number): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`WASM loading timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    try {
      await Promise.race([
        this.loadWasmModule(),
        timeoutPromise
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        this.logger.error('WASM module loading timed out');
      }
      throw error;
    }
  }
  
  private recordError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.errorHistory.push({
      timestamp: Date.now(),
      error: errorMessage
    });
    
    // Keep only last 10 errors
    if (this.errorHistory.length > 10) {
      this.errorHistory.shift();
    }
  }
  
  private async initializeDegraded(): Promise<void> {
    this.logger.info('Initializing in degraded mode...');
    this.stateManager.transitionTo('degraded');
    
    // Create minimal audio context
    if (!this.audioContext) {
      try {
        await this.initializeAudioContext();
      } catch {
        this.logger.error('Failed to create audio context even in degraded mode');
        return;
      }
    }
    
    // Engine will work but without noise reduction
    this.emit('degraded-mode');
    this.logger.warn('Engine running in degraded mode - noise reduction disabled');
  }
  
  private async loadWasmModule(): Promise<void> {
    this.logger.debug('Loading WASM module...');
    
    // Check WebAssembly support
    if (typeof WebAssembly === 'undefined') {
      throw new Error('WebAssembly is not supported in this environment');
    }
    
    try {
      // Load the RNNoise script
      const script = document.createElement('script');
      script.src = '/rnnoise-fixed.js';
      
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load RNNoise script from /rnnoise-fixed.js'));
        document.head.appendChild(script);
      });
      
      // Create WASM module
      const createRNNWasmModule = (window as any).createRNNWasmModule;
      if (!createRNNWasmModule) {
        throw new Error('RNNoise WASM module creator not found on window object');
      }
      
      try {
        this.wasmModule = await createRNNWasmModule({
          locateFile: (filename: string) => {
            // If it's the WASM file, ensure correct path
            if (filename.endsWith('.wasm')) {
              const path = `/dist/${filename}`;
              this.logger.debug(`WASM file requested: ${filename}, returning path: ${path}`);
              return path;
            }
            return filename;
          }
        });
      } catch (wasmError: any) {
        const errorMsg = wasmError?.message || String(wasmError);
        
        // Check for the specific WASM loading error
        if (errorMsg.includes('Aborted') && errorMsg.includes('wasm')) {
          throw new Error(
            `Failed to load WASM file. This usually means the rnnoise.wasm file is not accessible at /dist/rnnoise.wasm. ` +
            `Please ensure: 1) The file exists in the public/dist directory, 2) Your server is configured to serve .wasm files with the correct MIME type (application/wasm). ` +
            `Original error: ${errorMsg}`
          );
        }
        
        throw new Error(`Failed to initialize WASM module: ${errorMsg}`);
      }
      
      // Create RNNoise state
      this.rnnoiseState = this.wasmModule._rnnoise_create(0);
      if (!this.rnnoiseState) {
        throw new Error('Failed to create RNNoise state');
      }
    } catch (error) {
      // Re-throw with proper context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unexpected error loading WASM: ${String(error)}`);
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
    
    try {
      for (let i = 0; i < 10; i++) {
        const { output, vad } = this.processFrame(silentFrame);
        // Silent frame should have VAD close to 0
        if (i === 9) {
          this.logger.debug(`Warmup complete. Silent frame VAD: ${vad.toFixed(3)}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to warm up model, continuing in degraded mode');
    }
  }
  
  private processFrame(frame: Float32Array): { output: Float32Array; vad: number } {
    // REGLA 1: Verificar 480 samples exactos
    if (frame.length !== 480) {
      throw new Error(`Frame must be exactly 480 samples, got ${frame.length}`);
    }
    
    // Check if we're in degraded mode (no WASM)
    if (!this.wasmModule || !this.rnnoiseState) {
      // In degraded mode, just pass through the audio with basic processing
      const output = new Float32Array(frame.length);
      
      // Simple noise gate as fallback
      const threshold = 0.01;
      let voiceActivity = 0;
      
      for (let i = 0; i < frame.length; i++) {
        const sample = frame[i];
        if (Math.abs(sample) < threshold) {
          output[i] = sample * 0.1; // Reduce quiet sounds
        } else {
          output[i] = sample;
          voiceActivity += Math.abs(sample);
        }
      }
      
      // Fake VAD for degraded mode
      const vad = Math.min(1.0, voiceActivity / frame.length / 0.1);
      return { output, vad };
    }
    
    // Normal WASM processing
    if (!this.inputPtr || !this.outputPtr) {
      throw new Error('WASM module not properly initialized');
    }
    
    // REGLA 15: Verificar datos válidos (no NaN, no undefined)
    for (let i = 0; i < frame.length; i++) {
      if (isNaN(frame[i]) || frame[i] === undefined) {
        throw new Error(`Invalid sample at index ${i}: ${frame[i]}`);
      }
    }
    
    // REGLA 6: ESCALAR CORRECTAMENTE - Entrada: valor * 32768
    const scaledInput = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      scaledInput[i] = frame[i] * 32768.0;
    }
    
    // REGLA 7: Escribir en HEAPF32
    this.wasmModule.HEAPF32.set(scaledInput, this.inputPtr >> 2);
    
    // REGLA 11: CAPTURAR EL VAD! Process with RNNoise
    // REGLA 13: Procesar in-place (usar mismo puntero para entrada y salida)
    const vad = this.wasmModule._rnnoise_process_frame(
      this.rnnoiseState,
      this.inputPtr,  // In-place: output = input
      this.inputPtr   // In-place: usar mismo buffer
    );
    
    // Get output from the same buffer (in-place processing)
    const scaledOutput = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      scaledOutput[i] = this.wasmModule.HEAPF32[(this.inputPtr >> 2) + i];
    }
    
    // REGLA 6: ESCALAR CORRECTAMENTE - Salida: valor / 32768
    const output = new Float32Array(480);
    for (let i = 0; i < 480; i++) {
      output[i] = scaledOutput[i] / 32768.0;
    }
    
    // Log VAD for debugging
    if (vad > 0.5) {
      this.logger.debug(`🎤 VOICE DETECTED: VAD=${vad.toFixed(3)}`);
    }
    
    return { output, vad };
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
    
    // Create pre-filters for medical equipment noise
    const notchFilter1 = this.audioContext.createBiquadFilter();
    notchFilter1.type = 'notch';
    notchFilter1.frequency.value = 1000; // Common medical equipment beep frequency
    notchFilter1.Q.value = 30; // Narrow notch
    
    const notchFilter2 = this.audioContext.createBiquadFilter();
    notchFilter2.type = 'notch';
    notchFilter2.frequency.value = 2000; // Harmonics of beeps
    notchFilter2.Q.value = 30;
    
    const highPassFilter = this.audioContext.createBiquadFilter();
    highPassFilter.type = 'highpass';
    highPassFilter.frequency.value = 80; // Remove low-frequency rumble from machines
    highPassFilter.Q.value = 0.7;
    
    const lowShelfFilter = this.audioContext.createBiquadFilter();
    lowShelfFilter.type = 'lowshelf';
    lowShelfFilter.frequency.value = 200; // Reduce echo/room resonance
    lowShelfFilter.gain.value = -3; // Gentle reduction
    
    // Create AGC if enabled
    let agc: SimpleAGC | undefined;
    if (this.agcEnabled) {
      agc = new SimpleAGC(this.audioContext, 0.3);
      this.agc = agc;
    }
    
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

      // TDD Integration: Forward period-complete events for RecordingManager integration
      chunkProcessor.on('period-complete', (aggregatedMetrics) => {
        this.logger.info(`🎯 [TDD-INTEGRATION] Period complete: ${aggregatedMetrics.totalFrames} frames, ${aggregatedMetrics.averageNoiseReduction.toFixed(1)}% avg reduction`);
        
        // Make aggregated metrics available to RecordingManager
        // This will be accessed via the global bridge
        if ((global as any).__murmurabaTDDBridge) {
          (global as any).__murmurabaTDDBridge.notifyMetrics(aggregatedMetrics);
        }
      });

      // TDD Integration: Store ChunkProcessor reference globally for RecordingManager access  
      (global as any).__murmurabaTDDBridge = {
        chunkProcessor,
        notifyMetrics: (metrics: any) => {
          // Broadcast to all registered RecordingManager instances
          if ((global as any).__murmurabaTDDBridge.recordingManagers) {
            (global as any).__murmurabaTDDBridge.recordingManagers.forEach((rm: any) => {
              rm.receiveMetrics(metrics);
            });
          }
        },
        recordingManagers: new Set()
      };
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
      
      // Update AGC if enabled
      if (agc && !isPaused && !isStopped) {
        agc.updateGain();
      }
      
      // Add to buffer
      for (let i = 0; i < input.length; i++) {
        inputBuffer.push(input[i]);
      }
      
      // If using chunk processing, add samples to chunk processor
      if (chunkProcessor && !isPaused && !isStopped) {
        chunkProcessor.addSamples(input);
        
        // TDD Integration: Also process frame for real-time metrics accumulation
        // This feeds data to our TDD integration system
        const timestamp = Date.now();
        chunkProcessor.processFrame(input, timestamp, output).catch(err => {
          this.logger.debug('TDD frame processing error:', err);
        });
      }
      
      // Process frames
      let totalInputRMS = 0;
      let totalOutputRMS = 0;
      let framesProcessed = 0;
      
      while (inputBuffer.length >= 480) {
        const frame = new Float32Array(inputBuffer.splice(0, 480));
        const frameInputRMS = this.metricsManager.calculateRMS(frame);
        
        const { output: processed, vad } = this.processFrame(frame);
        const frameOutputRMS = this.metricsManager.calculateRMS(processed);
        
        // Update VAD metrics
        this.metricsManager.updateVAD(vad);
        
        // Apply noise reduction level adjustment
        const reductionFactor = this.getReductionFactor();
        for (let i = 0; i < processed.length; i++) {
          processed[i] *= reductionFactor;
          outputBuffer.push(processed[i]);
        }
        
        // Accumulate RMS values for accurate noise reduction calculation
        totalInputRMS += frameInputRMS;
        totalOutputRMS += frameOutputRMS * reductionFactor; // Account for reduction factor
        framesProcessed++;
        
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
      
      // Track AGC gain for metrics if enabled
      if (agc) {
        const currentGain = agc.getCurrentGain();
        // This gain info will be used for diagnostics
        this.logger.debug(`AGC gain: ${currentGain.toFixed(2)}x`);
      }
      
      // Calculate noise reduction based on actual processed frames
      if (framesProcessed > 0) {
        const avgInputRMS = totalInputRMS / framesProcessed;
        const avgOutputRMS = totalOutputRMS / framesProcessed;
        const reduction = avgInputRMS > 0 ? Math.max(0, (1 - avgOutputRMS / avgInputRMS) * 100) : 0;
        this.metricsManager.updateNoiseReduction(reduction);
      }
    };
    
    // Connect filters in chain: source -> filters -> (AGC) -> processor -> destination
    source.connect(highPassFilter);
    highPassFilter.connect(notchFilter1);
    notchFilter1.connect(notchFilter2);
    notchFilter2.connect(lowShelfFilter);
    
    if (agc) {
      // With AGC: lowShelfFilter -> AGC -> processor
      agc.connect(lowShelfFilter, processor);
    } else {
      // Without AGC: lowShelfFilter -> processor
      lowShelfFilter.connect(processor);
    }
    
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
  
  
  // AGC Methods for TDD
  isAGCEnabled(): boolean {
    return this.agcEnabled;
  }
  
  setAGCEnabled(enabled: boolean): void {
    this.agcEnabled = enabled;
  }
  
  getAGCConfig(): { targetLevel: number; maxGain: number; enabled: boolean } {
    return {
      targetLevel: 0.3,
      maxGain: 6.0,
      enabled: this.agcEnabled
    };
  }
  
  // Public method to get reduction factor for testing
  getReductionFactor(level?: string): number {
    const targetLevel = level || this.config.noiseReductionLevel;
    // Adjusted factors to preserve volume when using AGC
    switch (targetLevel) {
      case 'low': return 1.0;
      case 'medium': return 0.9;
      case 'high': return 0.8;
      case 'auto': return 0.9;
      default: return 0.9;
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
        try {
          if (controller && typeof controller.stop === 'function') {
            controller.stop();
          }
        } catch (error) {
          this.logger.warn(`Failed to stop stream ${id}:`, error);
        }
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
        try {
          await this.audioContext.close();
        } catch (error) {
          this.logger.warn('Failed to close audio context:', error);
          // Re-throw to maintain expected error behavior for tests
          throw error;
        }
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
  
  isActive(): boolean {
    return this.activeStreams.size > 0;
  }
  
  getDiagnostics(): DiagnosticInfo {
    const reactVersion = (window as any).React?.version || 'unknown';
    const capabilities = {
      hasWASM: !!window.WebAssembly,
      hasAudioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
      hasWorklet: !!(window.AudioWorkletNode),
      maxChannels: this.audioContext?.destination.maxChannelCount || 0,
    };
    
    const browserInfo = {
      name: this.getBrowserName(),
      version: this.getBrowserVersion(),
      audioAPIsSupported: this.getAudioAPIsSupported(),
    };
    
    return {
      version: '1.4.0',
      engineVersion: '1.4.0',
      reactVersion,
      browserInfo,
      wasmLoaded: !!this.wasmModule,
      activeProcessors: this.activeStreams.size,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      processingTime: this.metricsManager.getMetrics().processingLatency,
      engineState: this.stateManager.getState(),
      capabilities,
      errors: this.errorHistory,
      initializationLog: [], // TODO: Implement log history tracking
      performanceMetrics: {
        wasmLoadTime: 0, // TODO: Track actual load times
        contextCreationTime: 0,
        totalInitTime: 0,
      },
      systemInfo: {
        memory: (performance as any).memory?.usedJSHeapSize,
      },
    };
  }
  
  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
  
  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/([\d.]+)/);
    return match ? match[2] : 'unknown';
  }
  
  private getAudioAPIsSupported(): string[] {
    const apis: string[] = [];
    if (window.AudioContext || (window as any).webkitAudioContext) apis.push('AudioContext');
    if (window.AudioWorkletNode) apis.push('AudioWorklet');
    if ((window as any).webkitAudioContext) apis.push('webkitAudioContext');
    if (window.MediaStream) apis.push('MediaStream');
    if (window.MediaRecorder) apis.push('MediaRecorder');
    return apis;
  }
  
  async runDiagnosticTests(): Promise<DiagnosticReport> {
    const report: DiagnosticReport = {
      timestamp: Date.now(),
      tests: [],
      passed: 0,
      failed: 0,
      warnings: 0,
    };
    
    // Test 1: Environment Support
    const envTest = {
      name: 'Environment Support',
      passed: false,
      message: '',
      duration: 0,
    };
    const startEnv = Date.now();
    if (this.checkEnvironmentSupport()) {
      envTest.passed = true;
      envTest.message = 'All required APIs are supported';
    } else {
      envTest.message = 'Missing required APIs';
    }
    envTest.duration = Date.now() - startEnv;
    report.tests.push(envTest);
    
    // Test 2: Audio Context Creation
    const audioTest = {
      name: 'Audio Context Creation',
      passed: false,
      message: '',
      duration: 0,
    };
    const startAudio = Date.now();
    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }
      audioTest.passed = true;
      audioTest.message = `Audio context created (state: ${this.audioContext?.state})`;
    } catch (error) {
      audioTest.message = `Failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    audioTest.duration = Date.now() - startAudio;
    report.tests.push(audioTest);
    
    // Test 3: WASM Module Loading
    const wasmTest = {
      name: 'WASM Module Loading',
      passed: false,
      message: '',
      duration: 0,
    };
    const startWasm = Date.now();
    if (this.wasmModule) {
      wasmTest.passed = true;
      wasmTest.message = 'WASM module already loaded';
    } else {
      wasmTest.message = 'WASM module not loaded (run initialize first)';
    }
    wasmTest.duration = Date.now() - startWasm;
    report.tests.push(wasmTest);
    
    // Test 4: Frame Processing
    const frameTest = {
      name: 'Frame Processing',
      passed: false,
      message: '',
      duration: 0,
    };
    const startFrame = Date.now();
    try {
      if (this.wasmModule && this.rnnoiseState) {
        const testFrame = new Float32Array(480);
        const { output } = this.processFrame(testFrame);
        frameTest.passed = output.length === 480;
        frameTest.message = frameTest.passed ? 'Frame processing successful' : 'Invalid output size';
      } else {
        frameTest.message = 'Engine not initialized';
      }
    } catch (error) {
      frameTest.message = `Failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    frameTest.duration = Date.now() - startFrame;
    report.tests.push(frameTest);
    
    // Calculate totals
    report.passed = report.tests.filter((t: any) => t.passed).length;
    report.failed = report.tests.filter((t: any) => !t.passed).length;
    
    return report;
  }

  /**
   * Process a WAV file with RNNoise
   * @param arrayBuffer WAV file as ArrayBuffer
   * @returns Processed WAV file as ArrayBuffer
   */
  async processFile(arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    this.stateManager.requireState('ready', 'processing');
    
    this.logger.info('Processing WAV file...');
    const startTime = Date.now();
    
    // Parse WAV header
    const dataView = new DataView(arrayBuffer);
    
    // Verify RIFF header
    const riff = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3)
    );
    if (riff !== 'RIFF') {
      throw new Error('Not a valid WAV file: missing RIFF header');
    }
    
    // Verify WAVE format
    const wave = String.fromCharCode(
      dataView.getUint8(8),
      dataView.getUint8(9),
      dataView.getUint8(10),
      dataView.getUint8(11)
    );
    if (wave !== 'WAVE') {
      throw new Error('Not a valid WAV file: missing WAVE format');
    }
    
    // Find fmt chunk
    let fmtOffset = 12;
    let fmtFound = false;
    while (fmtOffset < dataView.byteLength - 8) {
      const chunkId = String.fromCharCode(
        dataView.getUint8(fmtOffset),
        dataView.getUint8(fmtOffset + 1),
        dataView.getUint8(fmtOffset + 2),
        dataView.getUint8(fmtOffset + 3)
      );
      const chunkSize = dataView.getUint32(fmtOffset + 4, true);
      
      if (chunkId === 'fmt ') {
        fmtFound = true;
        break;
      }
      fmtOffset += 8 + chunkSize;
    }
    
    if (!fmtFound) {
      throw new Error('Invalid WAV file: fmt chunk not found');
    }
    
    // Parse fmt chunk
    const audioFormat = dataView.getUint16(fmtOffset + 8, true);
    const numChannels = dataView.getUint16(fmtOffset + 10, true);
    const sampleRate = dataView.getUint32(fmtOffset + 12, true);
    const bitsPerSample = dataView.getUint16(fmtOffset + 22, true);
    
    // Verify format
    if (audioFormat !== 1) {
      throw new Error(`Unsupported audio format: ${audioFormat}. Only PCM (format 1) is supported`);
    }
    if (numChannels !== 1) {
      throw new Error(`Unsupported channel count: ${numChannels}. Only mono (1 channel) is supported`);
    }
    
    if (bitsPerSample !== 16) {
      throw new Error(`Unsupported bit depth: ${bitsPerSample}. Only 16-bit is supported`);
    }
    
    this.logger.info(`WAV format verified: PCM 16-bit mono ${sampleRate}Hz`);
    
    // Find data chunk
    let dataOffset = fmtOffset + 8 + dataView.getUint32(fmtOffset + 4, true);
    let dataFound = false;
    let dataSize = 0;
    
    while (dataOffset < dataView.byteLength - 8) {
      const chunkId = String.fromCharCode(
        dataView.getUint8(dataOffset),
        dataView.getUint8(dataOffset + 1),
        dataView.getUint8(dataOffset + 2),
        dataView.getUint8(dataOffset + 3)
      );
      dataSize = dataView.getUint32(dataOffset + 4, true);
      
      if (chunkId === 'data') {
        dataFound = true;
        dataOffset += 8; // Skip chunk header
        break;
      }
      dataOffset += 8 + dataSize;
    }
    
    if (!dataFound) {
      throw new Error('Invalid WAV file: data chunk not found');
    }
    
    // Extract PCM data
    let pcmData = new Int16Array(arrayBuffer, dataOffset, dataSize / 2);
    let workingSampleRate = sampleRate;
    
    // Resample to 48kHz if needed (RNNoise requires 48kHz)
    const resamplingResult = AudioResampler.resampleToRNNoiseRate(pcmData, sampleRate, this.logger);
    pcmData = resamplingResult.resampledData;
    workingSampleRate = resamplingResult.outputSampleRate;
    
    const numSamples = pcmData.length;
    const numFrames = Math.floor(numSamples / 480);
    
    this.logger.info(`Processing ${numSamples} samples (${numFrames} frames of 480 samples) at ${workingSampleRate}Hz`);
    
    // Process audio in 480-sample frames
    const processedSamples = new Float32Array(numFrames * 480);
    let totalVAD = 0;
    let voiceFrames = 0;
    
    for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
      const frameStart = frameIndex * 480;
      const frame = new Float32Array(480);
      
      // Convert PCM16 to Float32
      for (let i = 0; i < 480; i++) {
        frame[i] = pcmData[frameStart + i] / 32768.0;
      }
      
      // Calculate input RMS
      const inputRMS = this.metricsManager.calculateRMS(frame);
      
      // Process frame with RNNoise
      const { output, vad } = this.processFrame(frame);
      
      // Calculate output RMS
      const outputRMS = this.metricsManager.calculateRMS(output);
      const noiseReduction = inputRMS > 0 ? Math.max(0, (1 - outputRMS / inputRMS) * 100) : 0;
      
      // Log frame metrics
      this.logger.debug(
        `Frame ${frameIndex + 1}/${numFrames}: VAD=${vad.toFixed(3)}, ` +
        `InputRMS=${inputRMS.toFixed(4)}, OutputRMS=${outputRMS.toFixed(4)}, ` +
        `NoiseReduction=${noiseReduction.toFixed(1)}%`
      );
      
      // Track voice activity
      totalVAD += vad;
      if (vad > 0.5) voiceFrames++;
      
      // Apply noise reduction level adjustment
      const reductionFactor = this.getReductionFactor();
      
      // Store processed samples
      for (let i = 0; i < 480; i++) {
        processedSamples[frameStart + i] = output[i] * reductionFactor;
      }
    }
    
    // Convert Float32 back to PCM16
    const processedPCM = new Int16Array(processedSamples.length);
    for (let i = 0; i < processedSamples.length; i++) {
      // Clamp to [-1, 1] range
      const clamped = Math.max(-1, Math.min(1, processedSamples[i]));
      processedPCM[i] = Math.round(clamped * 32767);
    }
    
    // Create output WAV buffer
    const outputSize = 44 + processedPCM.length * 2; // WAV header + PCM data
    const outputBuffer = new ArrayBuffer(outputSize);
    const outputView = new DataView(outputBuffer);
    
    // Write WAV header
    // RIFF chunk
    outputView.setUint8(0, 0x52); // 'R'
    outputView.setUint8(1, 0x49); // 'I'
    outputView.setUint8(2, 0x46); // 'F'
    outputView.setUint8(3, 0x46); // 'F'
    outputView.setUint32(4, outputSize - 8, true); // File size - 8
    outputView.setUint8(8, 0x57);  // 'W'
    outputView.setUint8(9, 0x41);  // 'A'
    outputView.setUint8(10, 0x56); // 'V'
    outputView.setUint8(11, 0x45); // 'E'
    
    // fmt chunk
    outputView.setUint8(12, 0x66); // 'f'
    outputView.setUint8(13, 0x6D); // 'm'
    outputView.setUint8(14, 0x74); // 't'
    outputView.setUint8(15, 0x20); // ' '
    outputView.setUint32(16, 16, true); // fmt chunk size
    outputView.setUint16(20, 1, true); // PCM format
    outputView.setUint16(22, 1, true); // Mono
    outputView.setUint32(24, 48000, true); // Sample rate
    outputView.setUint32(28, 48000 * 2, true); // Byte rate
    outputView.setUint16(32, 2, true); // Block align
    outputView.setUint16(34, 16, true); // Bits per sample
    
    // data chunk
    outputView.setUint8(36, 0x64); // 'd'
    outputView.setUint8(37, 0x61); // 'a'
    outputView.setUint8(38, 0x74); // 't'
    outputView.setUint8(39, 0x61); // 'a'
    outputView.setUint32(40, processedPCM.length * 2, true); // Data size
    
    // Write PCM data
    const outputPCMView = new Int16Array(outputBuffer, 44);
    outputPCMView.set(processedPCM);
    
    // Log summary
    const averageVAD = totalVAD / numFrames;
    const voicePercentage = (voiceFrames / numFrames) * 100;
    const processingTime = Date.now() - startTime;
    
    this.logger.info(
      `File processing complete: ${numFrames} frames processed in ${processingTime}ms. ` +
      `Average VAD: ${averageVAD.toFixed(3)}, Voice frames: ${voicePercentage.toFixed(1)}%`
    );
    
    return outputBuffer;
  }
}