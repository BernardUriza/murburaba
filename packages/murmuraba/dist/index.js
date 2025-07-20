'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');

class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(handler);
    }
    off(event, handler) {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.events.delete(event);
            }
        }
    }
    emit(event, ...args) {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                }
                catch (error) {
                    console.error(`Error in event handler for ${String(event)}:`, error);
                }
            });
        }
    }
    once(event, handler) {
        const wrappedHandler = ((...args) => {
            this.off(event, wrappedHandler);
            handler(...args);
        });
        this.on(event, wrappedHandler);
    }
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        }
        else {
            this.events.clear();
        }
    }
    listenerCount(event) {
        const handlers = this.events.get(event);
        return handlers ? handlers.size : 0;
    }
}

class StateManager extends EventEmitter {
    constructor() {
        super(...arguments);
        this.currentState = 'uninitialized';
        this.allowedTransitions = new Map([
            ['uninitialized', ['initializing', 'error']],
            ['initializing', ['ready', 'error']],
            ['ready', ['processing', 'destroying', 'error']],
            ['processing', ['ready', 'paused', 'destroying', 'error']],
            ['paused', ['processing', 'ready', 'destroying', 'error']],
            ['destroying', ['destroyed', 'error']],
            ['destroyed', []],
            ['error', ['initializing', 'destroying']],
        ]);
    }
    getState() {
        return this.currentState;
    }
    canTransitionTo(newState) {
        const allowed = this.allowedTransitions.get(this.currentState) || [];
        return allowed.includes(newState);
    }
    transitionTo(newState) {
        if (!this.canTransitionTo(newState)) {
            console.warn(`Invalid state transition: ${this.currentState} -> ${newState}`);
            return false;
        }
        const oldState = this.currentState;
        this.currentState = newState;
        this.emit('state-change', oldState, newState);
        return true;
    }
    isInState(...states) {
        return states.includes(this.currentState);
    }
    requireState(...states) {
        if (!this.isInState(...states)) {
            throw new Error(`Operation requires state to be one of: ${states.join(', ')}, ` +
                `but current state is: ${this.currentState}`);
        }
    }
    reset() {
        const oldState = this.currentState;
        this.currentState = 'uninitialized';
        if (oldState !== 'uninitialized') {
            this.emit('state-change', oldState, 'uninitialized');
        }
    }
}

class Logger {
    constructor(prefix = '[Murmuraba]') {
        this.level = 'info';
        this.prefix = prefix;
    }
    setLevel(level) {
        this.level = level;
    }
    setLogHandler(handler) {
        this.onLog = handler;
    }
    shouldLog(level) {
        const levels = ['none', 'error', 'warn', 'info', 'debug'];
        const currentIndex = levels.indexOf(this.level);
        const messageIndex = levels.indexOf(level);
        return currentIndex > 0 && messageIndex <= currentIndex;
    }
    log(level, message, data) {
        if (!this.shouldLog(level))
            return;
        const timestamp = new Date().toISOString();
        const formattedMessage = `${this.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
        if (this.onLog) {
            this.onLog(level, formattedMessage, data);
        }
        else {
            const logMethod = level === 'error' ? console.error :
                level === 'warn' ? console.warn :
                    console.log;
            if (data !== undefined) {
                logMethod(formattedMessage, data);
            }
            else {
                logMethod(formattedMessage);
            }
        }
    }
    error(message, data) {
        this.log('error', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
}

class MurmubaraError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'MurmubaraError';
        this.code = code;
        this.details = details;
    }
}
const ErrorCodes = {
    WASM_NOT_LOADED: 'WASM_NOT_LOADED',
    INVALID_STREAM: 'INVALID_STREAM',
    ENGINE_BUSY: 'ENGINE_BUSY',
    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
    PROCESSING_FAILED: 'PROCESSING_FAILED',
    CLEANUP_FAILED: 'CLEANUP_FAILED',
    WORKER_ERROR: 'WORKER_ERROR',
    INVALID_CONFIG: 'INVALID_CONFIG',
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    ALREADY_INITIALIZED: 'ALREADY_INITIALIZED',
};

class WorkerManager {
    constructor(logger) {
        this.workers = new Map();
        this.logger = logger;
    }
    createWorker(id, workerPath) {
        if (this.workers.has(id)) {
            throw new MurmubaraError(ErrorCodes.WORKER_ERROR, `Worker with id ${id} already exists`);
        }
        try {
            const worker = new Worker(workerPath);
            this.workers.set(id, worker);
            this.logger.debug(`Worker created: ${id}`);
            return worker;
        }
        catch (error) {
            this.logger.error(`Failed to create worker: ${id}`, error);
            throw new MurmubaraError(ErrorCodes.WORKER_ERROR, `Failed to create worker: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getWorker(id) {
        return this.workers.get(id);
    }
    sendMessage(id, message) {
        const worker = this.workers.get(id);
        if (!worker) {
            throw new MurmubaraError(ErrorCodes.WORKER_ERROR, `Worker ${id} not found`);
        }
        worker.postMessage(message);
        this.logger.debug(`Message sent to worker ${id}:`, message);
    }
    terminateWorker(id) {
        const worker = this.workers.get(id);
        if (worker) {
            worker.terminate();
            this.workers.delete(id);
            this.logger.debug(`Worker terminated: ${id}`);
        }
    }
    terminateAll() {
        this.logger.info(`Terminating all ${this.workers.size} workers`);
        for (const [id, worker] of this.workers) {
            worker.terminate();
            this.logger.debug(`Worker terminated: ${id}`);
        }
        this.workers.clear();
    }
    getActiveWorkerCount() {
        return this.workers.size;
    }
    getWorkerIds() {
        return Array.from(this.workers.keys());
    }
}

class MetricsManager extends EventEmitter {
    constructor() {
        super(...arguments);
        this.metrics = {
            noiseReductionLevel: 0,
            processingLatency: 0,
            inputLevel: 0,
            outputLevel: 0,
            timestamp: Date.now(),
            frameCount: 0,
            droppedFrames: 0,
        };
        this.frameTimestamps = [];
        this.maxFrameHistory = 100;
    }
    startAutoUpdate(intervalMs = 100) {
        this.stopAutoUpdate();
        this.updateInterval = setInterval(() => {
            this.calculateLatency();
            this.emit('metrics-update', { ...this.metrics });
        }, intervalMs);
    }
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }
    updateInputLevel(level) {
        this.metrics.inputLevel = Math.max(0, Math.min(1, level));
    }
    updateOutputLevel(level) {
        this.metrics.outputLevel = Math.max(0, Math.min(1, level));
    }
    updateNoiseReduction(level) {
        this.metrics.noiseReductionLevel = Math.max(0, Math.min(100, level));
    }
    recordFrame(timestamp = Date.now()) {
        this.frameTimestamps.push(timestamp);
        if (this.frameTimestamps.length > this.maxFrameHistory) {
            this.frameTimestamps.shift();
        }
        this.metrics.frameCount++;
        this.metrics.timestamp = timestamp;
    }
    recordDroppedFrame() {
        this.metrics.droppedFrames++;
    }
    recordChunk(chunk) {
        this.emit('chunk-processed', chunk);
    }
    calculateLatency() {
        if (this.frameTimestamps.length < 2) {
            this.metrics.processingLatency = 0;
            return;
        }
        const deltas = [];
        for (let i = 1; i < this.frameTimestamps.length; i++) {
            deltas.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
        }
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        this.metrics.processingLatency = avgDelta;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    reset() {
        this.metrics = {
            noiseReductionLevel: 0,
            processingLatency: 0,
            inputLevel: 0,
            outputLevel: 0,
            timestamp: Date.now(),
            frameCount: 0,
            droppedFrames: 0,
        };
        this.frameTimestamps = [];
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
}

class ChunkProcessor extends EventEmitter {
    constructor(sampleRate, config, logger, metricsManager) {
        super();
        this.currentChunk = [];
        this.chunkStartTime = Date.now();
        this.chunkIndex = 0;
        this.currentSampleCount = 0;
        this.overlapBuffer = [];
        this.logger = logger;
        this.sampleRate = sampleRate;
        this.metricsManager = metricsManager;
        this.config = {
            chunkDuration: config.chunkDuration,
            onChunkProcessed: config.onChunkProcessed || undefined,
            overlap: config.overlap || 0,
        };
        // Calculate samples per chunk
        this.samplesPerChunk = Math.floor((this.config.chunkDuration / 1000) * this.sampleRate);
        this.logger.info(`ChunkProcessor initialized:`, {
            sampleRate: this.sampleRate,
            chunkDuration: this.config.chunkDuration,
            samplesPerChunk: this.samplesPerChunk,
            overlap: this.config.overlap,
        });
    }
    /**
     * Add samples to the current chunk
     */
    addSamples(samples) {
        // Initialize start time on first sample if not already set
        if (this.chunkStartTime === 0) {
            this.chunkStartTime = Date.now();
        }
        this.currentChunk.push(new Float32Array(samples));
        this.currentSampleCount += samples.length;
        // Check if we have enough samples for a chunk
        while (this.currentSampleCount >= this.samplesPerChunk) {
            this.processCurrentChunk();
        }
    }
    /**
     * Process the current chunk
     */
    processCurrentChunk() {
        const chunkId = `chunk-${this.chunkIndex++}`;
        const endTime = Date.now();
        // Combine all samples into a single array
        const totalSamples = this.extractChunkSamples();
        // Apply overlap if configured
        const processedSamples = this.applyOverlap(totalSamples);
        // Create chunk object
        const chunk = {
            id: chunkId,
            data: processedSamples,
            startTime: this.chunkStartTime,
            endTime: endTime,
            sampleRate: this.sampleRate,
            channelCount: 1,
        };
        // Emit chunk ready event
        this.emit('chunk-ready', chunk);
        // Calculate and emit metrics
        this.emitChunkMetrics(chunk, totalSamples, processedSamples);
        // Reset for next chunk
        this.chunkStartTime = endTime;
    }
    /**
     * Extract samples for current chunk
     */
    extractChunkSamples() {
        const result = new Float32Array(this.samplesPerChunk);
        let offset = 0;
        let remainingSamples = this.samplesPerChunk;
        while (remainingSamples > 0 && this.currentChunk.length > 0) {
            const buffer = this.currentChunk[0];
            const samplesToTake = Math.min(remainingSamples, buffer.length);
            // Copy samples
            result.set(buffer.subarray(0, samplesToTake), offset);
            offset += samplesToTake;
            remainingSamples -= samplesToTake;
            if (samplesToTake === buffer.length) {
                // Used entire buffer
                this.currentChunk.shift();
            }
            else {
                // Partial buffer used, keep remainder
                this.currentChunk[0] = buffer.subarray(samplesToTake);
            }
        }
        this.currentSampleCount -= this.samplesPerChunk;
        return result;
    }
    /**
     * Apply overlap window to smooth chunk transitions
     */
    applyOverlap(samples) {
        if (this.config.overlap === 0) {
            return samples;
        }
        const overlapSamples = Math.floor(this.samplesPerChunk * this.config.overlap);
        const result = new Float32Array(samples.length);
        // Copy main samples
        result.set(samples);
        // Apply overlap from previous chunk
        if (this.overlapBuffer.length > 0) {
            const previousOverlap = this.combineBuffers(this.overlapBuffer);
            const fadeLength = Math.min(overlapSamples, previousOverlap.length);
            // Crossfade between chunks
            for (let i = 0; i < fadeLength; i++) {
                const fadeIn = i / fadeLength;
                const fadeOut = 1 - fadeIn;
                result[i] = result[i] * fadeIn + previousOverlap[i] * fadeOut;
            }
        }
        // Save overlap for next chunk
        this.overlapBuffer = [samples.subarray(samples.length - overlapSamples)];
        return result;
    }
    /**
     * Calculate and emit chunk metrics
     */
    emitChunkMetrics(chunk, originalSamples, processedSamples) {
        // Calculate metrics
        const originalRMS = this.metricsManager.calculateRMS(originalSamples);
        const processedRMS = this.metricsManager.calculateRMS(processedSamples);
        const originalPeak = this.metricsManager.calculatePeak(originalSamples);
        const processedPeak = this.metricsManager.calculatePeak(processedSamples);
        const noiseRemoved = originalRMS > 0
            ? ((originalRMS - processedRMS) / originalRMS) * 100
            : 0;
        const metrics = {
            originalSize: originalSamples.length * 4, // Float32 = 4 bytes
            processedSize: processedSamples.length * 4,
            noiseRemoved: Math.max(0, Math.min(100, noiseRemoved)),
            metrics: {
                noiseReductionLevel: noiseRemoved,
                processingLatency: chunk.endTime - chunk.startTime,
                inputLevel: originalPeak,
                outputLevel: processedPeak,
                timestamp: chunk.endTime,
                frameCount: Math.floor(processedSamples.length / 480), // RNNoise frame size
                droppedFrames: 0,
            },
            duration: this.config.chunkDuration,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
        };
        // Emit to listeners
        this.emit('chunk-processed', metrics);
        // Call user callback if provided
        if (this.config.onChunkProcessed) {
            try {
                this.config.onChunkProcessed(metrics);
            }
            catch (error) {
                this.logger.error('Error in chunk processed callback:', error);
            }
        }
        this.logger.debug(`Chunk ${chunk.id} processed:`, {
            duration: `${metrics.duration}ms`,
            noiseRemoved: `${metrics.noiseRemoved.toFixed(1)}%`,
            latency: `${metrics.metrics.processingLatency}ms`,
        });
    }
    /**
     * Force process remaining samples as final chunk
     */
    flush() {
        if (this.currentSampleCount > 0) {
            this.logger.info(`Flushing final chunk with ${this.currentSampleCount} samples`);
            // Pad with silence if needed
            const remainingSamples = this.samplesPerChunk - this.currentSampleCount;
            if (remainingSamples > 0) {
                this.addSamples(new Float32Array(remainingSamples));
            }
            this.processCurrentChunk();
        }
        this.reset();
    }
    /**
     * Reset the processor
     */
    reset() {
        this.currentChunk = [];
        this.overlapBuffer = [];
        this.currentSampleCount = 0;
        this.chunkIndex = 0;
        this.chunkStartTime = Date.now();
        this.logger.debug('ChunkProcessor reset');
    }
    /**
     * Combine multiple buffers into one
     */
    combineBuffers(buffers) {
        const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const buffer of buffers) {
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }
    /**
     * Get current buffer status
     */
    getStatus() {
        return {
            currentSampleCount: this.currentSampleCount,
            samplesPerChunk: this.samplesPerChunk,
            chunkIndex: this.chunkIndex,
            bufferFillPercentage: (this.currentSampleCount / this.samplesPerChunk) * 100,
        };
    }
}

class MurmubaraEngine extends EventEmitter {
    constructor(config = {}) {
        super();
        this.activeStreams = new Map();
        this.errorHistory = [];
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
        };
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
    setupEventForwarding() {
        this.stateManager.on('state-change', (oldState, newState) => {
            this.logger.info(`State transition: ${oldState} -> ${newState}`);
            this.emit('state-change', oldState, newState);
        });
        this.metricsManager.on('metrics-update', (metrics) => {
            this.emit('metrics-update', metrics);
        });
    }
    setupAutoCleanup() {
        if (!this.config.autoCleanup)
            return;
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
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }
        if (!this.stateManager.canTransitionTo('initializing')) {
            throw new MurmubaraError(ErrorCodes.ALREADY_INITIALIZED, 'Engine is already initialized or in an invalid state');
        }
        this.initPromise = this.performInitialization();
        return this.initPromise;
    }
    async performInitialization() {
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
        }
        catch (error) {
            this.stateManager.transitionTo('error');
            this.recordError(error);
            const murmubaraError = new MurmubaraError(ErrorCodes.INITIALIZATION_FAILED, `Initialization failed: ${error instanceof Error ? error.message : String(error)}`, error);
            this.emit('error', murmubaraError);
            // Try degraded mode if configured
            if (this.config.allowDegraded) {
                this.logger.warn('Attempting degraded mode initialization...');
                await this.initializeDegraded();
            }
            else {
                throw murmubaraError;
            }
        }
    }
    checkEnvironmentSupport() {
        // Check for required APIs
        const hasAudioContext = !!(window.AudioContext ||
            window.webkitAudioContext);
        const hasWebAssembly = !!window.WebAssembly;
        if (!hasAudioContext) {
            this.logger.error('AudioContext API not supported');
        }
        if (!hasWebAssembly) {
            this.logger.error('WebAssembly not supported');
        }
        return hasAudioContext && hasWebAssembly;
    }
    async initializeAudioContext() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass({ sampleRate: 48000 });
            // Resume if suspended (for Chrome autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        }
        catch (error) {
            throw new Error(`Failed to create AudioContext: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async loadWasmModuleWithTimeout(timeoutMs) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`WASM loading timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        try {
            await Promise.race([
                this.loadWasmModule(),
                timeoutPromise
            ]);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
                this.logger.error('WASM module loading timed out');
            }
            throw error;
        }
    }
    recordError(error) {
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
    async initializeDegraded() {
        this.logger.info('Initializing in degraded mode...');
        this.stateManager.transitionTo('degraded');
        // Create minimal audio context
        if (!this.audioContext) {
            try {
                await this.initializeAudioContext();
            }
            catch {
                this.logger.error('Failed to create audio context even in degraded mode');
                return;
            }
        }
        // Engine will work but without noise reduction
        this.emit('degraded-mode');
        this.logger.warn('Engine running in degraded mode - noise reduction disabled');
    }
    async loadWasmModule() {
        this.logger.debug('Loading WASM module...');
        // Load the RNNoise script
        const script = document.createElement('script');
        script.src = '/rnnoise-fixed.js';
        await new Promise((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load RNNoise script'));
            document.head.appendChild(script);
        });
        // Create WASM module
        const createRNNWasmModule = window.createRNNWasmModule;
        if (!createRNNWasmModule) {
            throw new Error('RNNoise WASM module creator not found');
        }
        this.wasmModule = await createRNNWasmModule({
            locateFile: (filename) => {
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
    async warmupModel() {
        this.logger.debug('Warming up noise reduction model...');
        const silentFrame = new Float32Array(480);
        for (let i = 0; i < 10; i++) {
            this.processFrame(silentFrame);
        }
    }
    processFrame(frame) {
        if (!this.wasmModule || !this.rnnoiseState || !this.inputPtr || !this.outputPtr) {
            throw new Error('WASM module not initialized');
        }
        // Copy to WASM heap
        this.wasmModule.HEAPF32.set(frame, this.inputPtr >> 2);
        // Process with RNNoise
        this.wasmModule._rnnoise_process_frame(this.rnnoiseState, this.outputPtr, this.inputPtr);
        // Get output
        const output = new Float32Array(480);
        for (let i = 0; i < 480; i++) {
            output[i] = this.wasmModule.HEAPF32[(this.outputPtr >> 2) + i];
        }
        return output;
    }
    async processStream(stream, chunkConfig) {
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
        }
        catch (error) {
            const murmubaraError = new MurmubaraError(ErrorCodes.PROCESSING_FAILED, `Failed to process stream: ${error instanceof Error ? error.message : String(error)}`, error);
            this.emit('error', murmubaraError);
            throw murmubaraError;
        }
    }
    async createStreamController(stream, streamId, chunkConfig) {
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
        let isPaused = false;
        let isStopped = false;
        const inputBuffer = [];
        const outputBuffer = [];
        // Setup chunk processor if configured
        let chunkProcessor;
        if (chunkConfig) {
            chunkProcessor = new ChunkProcessor(this.audioContext.sampleRate, chunkConfig, this.logger, this.metricsManager);
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
            this.metricsManager.calculateRMS(input);
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
            let totalInputRMS = 0;
            let totalOutputRMS = 0;
            let framesProcessed = 0;
            while (inputBuffer.length >= 480) {
                const frame = new Float32Array(inputBuffer.splice(0, 480));
                const frameInputRMS = this.metricsManager.calculateRMS(frame);
                const processed = this.processFrame(frame);
                const frameOutputRMS = this.metricsManager.calculateRMS(processed);
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
                    output[i] = outputBuffer.shift();
                }
                else {
                    output[i] = 0;
                }
            }
            // Update output metrics
            this.metricsManager.calculateRMS(output);
            const outputPeak = this.metricsManager.calculatePeak(output);
            this.metricsManager.updateOutputLevel(outputPeak);
            // Calculate noise reduction based on actual processed frames
            if (framesProcessed > 0) {
                const avgInputRMS = totalInputRMS / framesProcessed;
                const avgOutputRMS = totalOutputRMS / framesProcessed;
                const reduction = avgInputRMS > 0 ? Math.max(0, (1 - avgOutputRMS / avgInputRMS) * 100) : 0;
                this.metricsManager.updateNoiseReduction(reduction);
            }
        };
        // Connect filters in chain: source -> filters -> processor -> destination
        source.connect(highPassFilter);
        highPassFilter.connect(notchFilter1);
        notchFilter1.connect(notchFilter2);
        notchFilter2.connect(lowShelfFilter);
        lowShelfFilter.connect(processor);
        processor.connect(destination);
        const controller = {
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
            getState: () => controller.processor.state,
        };
        return controller;
    }
    getReductionFactor() {
        switch (this.config.noiseReductionLevel) {
            case 'low': return 0.9;
            case 'medium': return 0.7;
            case 'high': return 0.5;
            case 'auto': return 0.7; // TODO: Implement auto adjustment
            default: return 0.7;
        }
    }
    generateStreamId() {
        return `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    async destroy(force = false) {
        if (!this.stateManager.canTransitionTo('destroying')) {
            if (force) {
                this.logger.warn('Force destroying engine');
            }
            else {
                throw new MurmubaraError(ErrorCodes.CLEANUP_FAILED, 'Cannot destroy engine in current state');
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
                if (this.inputPtr)
                    this.wasmModule._free(this.inputPtr);
                if (this.outputPtr)
                    this.wasmModule._free(this.outputPtr);
                if (this.rnnoiseState)
                    this.wasmModule._rnnoise_destroy(this.rnnoiseState);
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
        }
        catch (error) {
            this.stateManager.transitionTo('error');
            const murmubaraError = new MurmubaraError(ErrorCodes.CLEANUP_FAILED, `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`, error);
            this.emit('error', murmubaraError);
            throw murmubaraError;
        }
    }
    getMetrics() {
        return this.metricsManager.getMetrics();
    }
    onMetricsUpdate(callback) {
        this.on('metrics-update', callback);
    }
    getDiagnostics() {
        const reactVersion = window.React?.version || 'unknown';
        const capabilities = {
            hasWASM: !!window.WebAssembly,
            hasAudioContext: !!(window.AudioContext || window.webkitAudioContext),
            hasWorklet: !!(window.AudioWorkletNode),
            maxChannels: this.audioContext?.destination.maxChannelCount || 0,
        };
        const browserInfo = {
            name: this.getBrowserName(),
            version: this.getBrowserVersion(),
            audioAPIsSupported: this.getAudioAPIsSupported(),
        };
        return {
            version: '1.3.0',
            engineVersion: '2.0.0',
            reactVersion,
            browserInfo,
            wasmLoaded: !!this.wasmModule,
            activeProcessors: this.activeStreams.size,
            memoryUsage: performance.memory?.usedJSHeapSize || 0,
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
        };
    }
    getBrowserName() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome'))
            return 'Chrome';
        if (userAgent.includes('Firefox'))
            return 'Firefox';
        if (userAgent.includes('Safari'))
            return 'Safari';
        if (userAgent.includes('Edge'))
            return 'Edge';
        return 'Unknown';
    }
    getBrowserVersion() {
        const userAgent = navigator.userAgent;
        const match = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/([\d.]+)/);
        return match ? match[2] : 'unknown';
    }
    getAudioAPIsSupported() {
        const apis = [];
        if (window.AudioContext || window.webkitAudioContext)
            apis.push('AudioContext');
        if (window.AudioWorkletNode)
            apis.push('AudioWorklet');
        if (window.webkitAudioContext)
            apis.push('webkitAudioContext');
        if (window.MediaStream)
            apis.push('MediaStream');
        if (window.MediaRecorder)
            apis.push('MediaRecorder');
        return apis;
    }
    async runDiagnosticTests() {
        const report = {
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
        }
        else {
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
        }
        catch (error) {
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
        }
        else {
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
                const output = this.processFrame(testFrame);
                frameTest.passed = output.length === 480;
                frameTest.message = frameTest.passed ? 'Frame processing successful' : 'Invalid output size';
            }
            else {
                frameTest.message = 'Engine not initialized';
            }
        }
        catch (error) {
            frameTest.message = `Failed: ${error instanceof Error ? error.message : String(error)}`;
        }
        frameTest.duration = Date.now() - startFrame;
        report.tests.push(frameTest);
        // Calculate totals
        report.passed = report.tests.filter((t) => t.passed).length;
        report.failed = report.tests.filter((t) => !t.passed).length;
        return report;
    }
}

let globalEngine = null;
async function initializeAudioEngine(config) {
    if (globalEngine) {
        throw new Error('Audio engine is already initialized. Call destroyEngine() first.');
    }
    globalEngine = new MurmubaraEngine(config);
    await globalEngine.initialize();
}
function getEngine() {
    if (!globalEngine) {
        throw new Error('Audio engine not initialized. Call initializeAudioEngine() first.');
    }
    return globalEngine;
}
async function processStream(stream) {
    const engine = getEngine();
    return engine.processStream(stream);
}
async function processStreamChunked(stream, config) {
    const engine = getEngine();
    return engine.processStream(stream, config);
}
async function destroyEngine(options) {
    if (!globalEngine) {
        return;
    }
    await globalEngine.destroy(options?.force || false);
    globalEngine = null;
}
function getEngineStatus() {
    if (!globalEngine) {
        return 'uninitialized';
    }
    return globalEngine.getDiagnostics().engineState;
}
function getDiagnostics() {
    const engine = getEngine();
    return engine.getDiagnostics();
}
function onMetricsUpdate(callback) {
    const engine = getEngine();
    engine.onMetricsUpdate(callback);
}

function useMurmubaraEngine(options = {}) {
    const { autoInitialize = false, fallbackToManual = false, onInitError, react19Mode = false, ...config } = options;
    // Detect React version
    const reactVersion = React.version;
    const isReact19 = reactVersion.startsWith('19') || react19Mode;
    const [isInitialized, setIsInitialized] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [engineState, setEngineState] = React.useState('uninitialized');
    const [metrics, setMetrics] = React.useState(null);
    const [diagnostics, setDiagnostics] = React.useState(null);
    React.useRef(null);
    const initializePromiseRef = React.useRef(null);
    const initialize = React.useCallback(async () => {
        if (initializePromiseRef.current) {
            return initializePromiseRef.current;
        }
        if (isInitialized) {
            return;
        }
        setIsLoading(true);
        setError(null);
        initializePromiseRef.current = (async () => {
            try {
                await initializeAudioEngine(config);
                // Set up metrics listener
                onMetricsUpdate((newMetrics) => {
                    setMetrics(newMetrics);
                });
                setIsInitialized(true);
                setEngineState('ready');
                updateDiagnostics();
            }
            catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                const errorMessage = error.message;
                setError(errorMessage);
                setEngineState('error');
                // Call error callback if provided
                if (onInitError) {
                    onInitError(error);
                }
                // If fallback is enabled and we're in React 19, try manual initialization
                if (fallbackToManual && isReact19) {
                    console.warn('[MurmubaraEngine] Auto-init failed in React 19, attempting manual fallback');
                    // The user can still manually call initialize() later
                }
                else {
                    throw err;
                }
            }
            finally {
                setIsLoading(false);
                initializePromiseRef.current = null;
            }
        })();
        return initializePromiseRef.current;
    }, [config, isInitialized]);
    const destroy = React.useCallback(async (force = false) => {
        if (!isInitialized) {
            return;
        }
        try {
            await destroyEngine({ force });
            setIsInitialized(false);
            setEngineState('destroyed');
            setMetrics(null);
            setDiagnostics(null);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized]);
    const processStreamWrapper = React.useCallback(async (stream) => {
        if (!isInitialized) {
            throw new Error('Engine not initialized');
        }
        try {
            const controller = await processStream(stream);
            updateDiagnostics();
            return controller;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized]);
    const processStreamChunkedWrapper = React.useCallback(async (stream, chunkConfig) => {
        if (!isInitialized) {
            throw new Error('Engine not initialized');
        }
        try {
            const controller = await processStreamChunked(stream, chunkConfig);
            updateDiagnostics();
            return controller;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized]);
    const updateDiagnostics = React.useCallback(() => {
        if (!isInitialized) {
            setDiagnostics(null);
            return null;
        }
        try {
            const diag = getDiagnostics();
            setDiagnostics(diag);
            setEngineState(diag.engineState);
            return diag;
        }
        catch {
            return null;
        }
    }, [isInitialized]);
    const resetError = React.useCallback(() => {
        setError(null);
    }, []);
    // Auto-initialize if requested
    React.useEffect(() => {
        if (autoInitialize && !isInitialized && !isLoading) {
            initialize();
        }
    }, [autoInitialize, isInitialized, isLoading, initialize]);
    // Update engine state periodically
    React.useEffect(() => {
        if (!isInitialized)
            return;
        const interval = setInterval(() => {
            try {
                const status = getEngineStatus();
                setEngineState(status);
            }
            catch {
                // Engine might be destroyed
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isInitialized]);
    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (isInitialized) {
                destroy(true).catch(console.error);
            }
        };
    }, []);
    return {
        // State
        isInitialized,
        isLoading,
        error,
        engineState,
        metrics,
        diagnostics,
        // Actions
        initialize,
        destroy,
        processStream: processStreamWrapper,
        processStreamChunked: processStreamChunkedWrapper,
        // Utility
        getDiagnostics: updateDiagnostics,
        resetError,
    };
}

class RNNoiseEngine {
    constructor() {
        this.name = 'RNNoise';
        this.description = 'Neural network-based noise suppression';
        this.isInitialized = false;
        this.module = null;
        this.state = null;
        this.inputPtr = 0;
        this.outputPtr = 0;
    }
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('[RNNoiseEngine] Starting initialization...');
        // Load script
        const script = document.createElement('script');
        script.src = '/rnnoise-fixed.js';
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        // Create module
        const createRNNWasmModule = window.createRNNWasmModule;
        this.module = await createRNNWasmModule({
            locateFile: (filename) => {
                if (filename.endsWith('.wasm')) {
                    return `/dist/${filename}`;
                }
                return filename;
            }
        });
        // Create state
        this.state = this.module._rnnoise_create(0);
        if (!this.state) {
            throw new Error('Failed to create RNNoise state');
        }
        // Allocate memory for float32 samples
        this.inputPtr = this.module._malloc(480 * 4);
        this.outputPtr = this.module._malloc(480 * 4);
        // Warm up
        const silentFrame = new Float32Array(480);
        for (let i = 0; i < 10; i++) {
            this.module.HEAPF32.set(silentFrame, this.inputPtr >> 2);
            this.module._rnnoise_process_frame(this.state, this.outputPtr, this.inputPtr);
        }
        this.isInitialized = true;
        console.log('[RNNoiseEngine] Initialization complete!');
    }
    process(inputBuffer) {
        if (!this.isInitialized) {
            throw new Error('RNNoiseEngine not initialized');
        }
        if (inputBuffer.length !== 480) {
            throw new Error('RNNoise requires exactly 480 samples per frame');
        }
        // Copy to WASM heap
        this.module.HEAPF32.set(inputBuffer, this.inputPtr >> 2);
        // Process with RNNoise
        this.module._rnnoise_process_frame(this.state, this.outputPtr, this.inputPtr);
        // Get output
        const outputData = new Float32Array(480);
        for (let i = 0; i < 480; i++) {
            outputData[i] = this.module.HEAPF32[(this.outputPtr >> 2) + i];
        }
        return outputData;
    }
    cleanup() {
        if (this.module && this.state) {
            this.module._free(this.inputPtr);
            this.module._free(this.outputPtr);
            this.module._rnnoise_destroy(this.state);
            this.state = null;
            this.module = null;
            this.isInitialized = false;
        }
    }
}

function createAudioEngine(config) {
    switch (config.engineType) {
        case 'rnnoise':
            return new RNNoiseEngine();
        case 'speex':
            throw new Error('Speex engine not implemented yet');
        case 'custom':
            throw new Error('Custom engine not implemented yet');
        default:
            throw new Error(`Unknown engine type: ${config.engineType}`);
    }
}

const useAudioEngine = (config = { engineType: 'rnnoise' }) => {
    console.warn('[Murmuraba] useAudioEngine is deprecated. Please use useMurmubaraEngine instead for better React 19 compatibility.');
    const [isInitialized, setIsInitialized] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const audioContextRef = React.useRef(null);
    const processorRef = React.useRef(null);
    const engineRef = React.useRef(null);
    const engineDataRef = React.useRef(null);
    const metricsRef = React.useRef({
        inputSamples: 0,
        outputSamples: 0,
        silenceFrames: 0,
        activeFrames: 0,
        totalInputEnergy: 0,
        totalOutputEnergy: 0,
        peakInput: 0,
        peakOutput: 0,
        startTime: 0,
        totalFrames: 0
    });
    const initializeAudioEngine = async () => {
        if (isInitialized || isLoading)
            return;
        setIsLoading(true);
        setError(null);
        try {
            console.log('[AudioEngine] Creating audio engine with config:', config);
            // Create engine instance
            const engine = createAudioEngine(config);
            await engine.initialize();
            engineRef.current = engine;
            // Initialize engine-specific data
            engineDataRef.current = {
                inputBuffer: [],
                outputBuffer: [],
                energyHistory: new Array(20).fill(0),
                energyIndex: 0
            };
            console.log('[AudioEngine] Engine ready for processing');
            // Create audio context
            audioContextRef.current = new AudioContext({ sampleRate: 48000 });
            // Create processor
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                const output = e.outputBuffer.getChannelData(0);
                if (!engineRef.current || !engineDataRef.current) {
                    output.set(input);
                    return;
                }
                // Track input metrics
                metricsRef.current.inputSamples += input.length;
                // Add to input buffer
                for (let i = 0; i < input.length; i++) {
                    engineDataRef.current.inputBuffer.push(input[i]);
                    metricsRef.current.peakInput = Math.max(metricsRef.current.peakInput, Math.abs(input[i]));
                }
                // Process chunks of 480 samples
                while (engineDataRef.current.inputBuffer.length >= 480) {
                    const frame = engineDataRef.current.inputBuffer.splice(0, 480);
                    const floatFrame = new Float32Array(frame);
                    // Process with engine
                    const outputData = engineRef.current.process(floatFrame);
                    // Calculate frame energy for gating
                    const frameEnergy = calculateRMS(floatFrame);
                    const outputEnergy = calculateRMS(outputData);
                    // Track frame metrics
                    metricsRef.current.totalFrames++;
                    metricsRef.current.totalInputEnergy += frameEnergy;
                    metricsRef.current.totalOutputEnergy += outputEnergy;
                    // Update energy history
                    engineDataRef.current.energyHistory[engineDataRef.current.energyIndex] = frameEnergy;
                    engineDataRef.current.energyIndex = (engineDataRef.current.energyIndex + 1) % 20;
                    // Calculate average energy
                    const avgEnergy = engineDataRef.current.energyHistory.reduce((a, b) => a + b) / 20;
                    // Simple energy-based gating
                    let processedFrame = outputData;
                    const silenceThreshold = 0.001;
                    const speechThreshold = 0.005;
                    let wasSilenced = false;
                    if (avgEnergy < silenceThreshold) {
                        // Very quiet - attenuate heavily
                        processedFrame = processedFrame.map(s => s * 0.1);
                        wasSilenced = true;
                        metricsRef.current.silenceFrames++;
                    }
                    else if (avgEnergy < speechThreshold) {
                        // Quiet - moderate attenuation
                        const factor = (avgEnergy - silenceThreshold) / (speechThreshold - silenceThreshold);
                        const attenuation = 0.1 + 0.9 * factor;
                        processedFrame = processedFrame.map(s => s * attenuation);
                        metricsRef.current.activeFrames++;
                    }
                    else {
                        metricsRef.current.activeFrames++;
                    }
                    // Additional noise gate based on RNNoise output vs input ratio
                    const reductionRatio = outputEnergy / (frameEnergy + 0.0001);
                    if (reductionRatio < 0.3 && avgEnergy < speechThreshold) {
                        // RNNoise reduced significantly - likely noise
                        processedFrame = processedFrame.map(s => s * reductionRatio);
                        if (!wasSilenced)
                            metricsRef.current.silenceFrames++;
                    }
                    // Log occasionally
                    if (Math.random() < 0.02) {
                        const gateStatus = avgEnergy < silenceThreshold ? 'SILENCE' :
                            avgEnergy < speechThreshold ? 'TRANSITION' : 'SPEECH';
                        console.log('[AudioEngine]', '\n  Status:', gateStatus, '\n  Avg Energy:', avgEnergy.toFixed(6), '\n  Frame Energy:', frameEnergy.toFixed(6), '\n  Engine Reduction:', ((1 - reductionRatio) * 100).toFixed(1) + '%', '\n  Gate Applied:', avgEnergy < speechThreshold ? 'Yes' : 'No');
                    }
                    // Add to output buffer
                    for (let i = 0; i < 480; i++) {
                        engineDataRef.current.outputBuffer.push(processedFrame[i]);
                    }
                }
                // Output
                for (let i = 0; i < output.length; i++) {
                    if (engineDataRef.current.outputBuffer.length > 0) {
                        const sample = engineDataRef.current.outputBuffer.shift();
                        output[i] = sample;
                        metricsRef.current.outputSamples++;
                        metricsRef.current.peakOutput = Math.max(metricsRef.current.peakOutput, Math.abs(sample));
                    }
                    else {
                        output[i] = 0;
                    }
                }
            };
            processorRef.current = processor;
            setIsInitialized(true);
            console.log('[AudioEngine] Initialization complete!');
        }
        catch (err) {
            console.error('[AudioEngine] Error:', err);
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    };
    const resetMetrics = () => {
        metricsRef.current = {
            inputSamples: 0,
            outputSamples: 0,
            silenceFrames: 0,
            activeFrames: 0,
            totalInputEnergy: 0,
            totalOutputEnergy: 0,
            peakInput: 0,
            peakOutput: 0,
            startTime: Date.now(),
            totalFrames: 0
        };
    };
    const getMetrics = () => {
        const metrics = metricsRef.current;
        const processingTime = Date.now() - metrics.startTime;
        const avgInputEnergy = metrics.totalFrames > 0 ? metrics.totalInputEnergy / metrics.totalFrames : 0;
        const avgOutputEnergy = metrics.totalFrames > 0 ? metrics.totalOutputEnergy / metrics.totalFrames : 0;
        // Calculate noise reduction differently - compare silence frames to total frames
        // and consider the energy reduction ratio
        const energyReduction = avgInputEnergy > 0 ? Math.abs(avgInputEnergy - avgOutputEnergy) / avgInputEnergy : 0;
        const silenceRatio = metrics.totalFrames > 0 ? metrics.silenceFrames / metrics.totalFrames : 0;
        // Combine both metrics for a more accurate noise reduction estimate
        const noiseReduction = ((energyReduction * 0.5) + (silenceRatio * 0.5)) * 100;
        return {
            inputSamples: metrics.inputSamples,
            outputSamples: metrics.outputSamples,
            noiseReductionLevel: Math.max(0, Math.min(100, noiseReduction)),
            silenceFrames: metrics.silenceFrames,
            activeFrames: metrics.activeFrames,
            averageInputEnergy: avgInputEnergy,
            averageOutputEnergy: avgOutputEnergy,
            peakInputLevel: metrics.peakInput,
            peakOutputLevel: metrics.peakOutput,
            processingTimeMs: processingTime,
            chunkOffset: 0,
            totalFramesProcessed: metrics.totalFrames
        };
    };
    const processStream = async (stream) => {
        if (!isInitialized) {
            await initializeAudioEngine();
        }
        if (!audioContextRef.current || !processorRef.current) {
            throw new Error('Not initialized');
        }
        // Reset metrics when starting new stream
        resetMetrics();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const destination = audioContextRef.current.createMediaStreamDestination();
        source.connect(processorRef.current);
        processorRef.current.connect(destination);
        return destination.stream;
    };
    const cleanup = () => {
        if (processorRef.current) {
            processorRef.current.disconnect();
        }
        if (engineRef.current) {
            engineRef.current.cleanup();
            engineRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };
    return {
        isInitialized,
        isLoading,
        error,
        processStream,
        cleanup,
        initializeAudioEngine,
        getMetrics,
        resetMetrics
    };
};
function calculateRMS(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
        sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
}

/**
 * Murmuraba v1.2.1
 * Real-time audio noise reduction with advanced chunked processing
 */
// Core exports
// Export version
const VERSION = '1.3.0';
const MURMURABA_VERSION = VERSION;
// Default export for easier usage
var index = {
    useMurmubaraEngine,
    useAudioEngine,
    MurmubaraEngine
};

exports.ErrorCodes = ErrorCodes;
exports.EventEmitter = EventEmitter;
exports.Logger = Logger;
exports.MURMURABA_VERSION = MURMURABA_VERSION;
exports.MetricsManager = MetricsManager;
exports.MurmubaraEngine = MurmubaraEngine;
exports.MurmubaraError = MurmubaraError;
exports.StateManager = StateManager;
exports.VERSION = VERSION;
exports.WorkerManager = WorkerManager;
exports.default = index;
exports.destroyEngine = destroyEngine;
exports.getDiagnostics = getDiagnostics;
exports.getEngine = getEngine;
exports.getEngineStatus = getEngineStatus;
exports.initializeAudioEngine = initializeAudioEngine;
exports.onMetricsUpdate = onMetricsUpdate;
exports.processStream = processStream;
exports.processStreamChunked = processStreamChunked;
exports.useAudioEngine = useAudioEngine;
exports.useMurmubaraEngine = useMurmubaraEngine;
//# sourceMappingURL=index.js.map
