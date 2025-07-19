'use strict';

var react = require('react');

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
            // Create audio context
            this.audioContext = new AudioContext({ sampleRate: 48000 });
            // Load WASM module
            await this.loadWasmModule();
            // Initialize metrics
            this.metricsManager.startAutoUpdate(100);
            this.stateManager.transitionTo('ready');
            this.emit('initialized');
            this.logger.info('Murmuraba engine initialized successfully');
        }
        catch (error) {
            this.stateManager.transitionTo('error');
            const murmubaraError = new MurmubaraError(ErrorCodes.INITIALIZATION_FAILED, `Initialization failed: ${error instanceof Error ? error.message : String(error)}`, error);
            this.emit('error', murmubaraError);
            throw murmubaraError;
        }
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
        return {
            engineVersion: '2.0.0',
            wasmLoaded: !!this.wasmModule,
            activeProcessors: this.activeStreams.size,
            memoryUsage: performance.memory?.usedJSHeapSize || 0,
            processingTime: this.metricsManager.getMetrics().processingLatency,
            engineState: this.stateManager.getState(),
            errors: this.errorHistory,
        };
    }
    recordError(error) {
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
    const { autoInitialize = false, ...config } = options;
    const [isInitialized, setIsInitialized] = react.useState(false);
    const [isLoading, setIsLoading] = react.useState(false);
    const [error, setError] = react.useState(null);
    const [engineState, setEngineState] = react.useState('uninitialized');
    const [metrics, setMetrics] = react.useState(null);
    const [diagnostics, setDiagnostics] = react.useState(null);
    react.useRef(null);
    const initializePromiseRef = react.useRef(null);
    const initialize = react.useCallback(async () => {
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
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
                setEngineState('error');
                throw err;
            }
            finally {
                setIsLoading(false);
                initializePromiseRef.current = null;
            }
        })();
        return initializePromiseRef.current;
    }, [config, isInitialized]);
    const destroy = react.useCallback(async (force = false) => {
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
    const processStreamWrapper = react.useCallback(async (stream) => {
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
    const processStreamChunkedWrapper = react.useCallback(async (stream, chunkConfig) => {
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
    const updateDiagnostics = react.useCallback(() => {
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
    const resetError = react.useCallback(() => {
        setError(null);
    }, []);
    // Auto-initialize if requested
    react.useEffect(() => {
        if (autoInitialize && !isInitialized && !isLoading) {
            initialize();
        }
    }, [autoInitialize, isInitialized, isLoading, initialize]);
    // Update engine state periodically
    react.useEffect(() => {
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
    react.useEffect(() => {
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

/**
 * Murmuraba v1.2.1
 * Real-time audio noise reduction with advanced chunked processing
 */
// Core exports
// Export version
const VERSION = '1.2.1';
const MURMURABA_VERSION = VERSION;

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
exports.destroyEngine = destroyEngine;
exports.getDiagnostics = getDiagnostics;
exports.getEngine = getEngine;
exports.getEngineStatus = getEngineStatus;
exports.initializeAudioEngine = initializeAudioEngine;
exports.onMetricsUpdate = onMetricsUpdate;
exports.processStream = processStream;
exports.processStreamChunked = processStreamChunked;
exports.useMurmubaraEngine = useMurmubaraEngine;
//# sourceMappingURL=index.js.map
