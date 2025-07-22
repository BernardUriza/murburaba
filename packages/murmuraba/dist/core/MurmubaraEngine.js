import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';
import { Logger } from './Logger';
import { WorkerManager } from '../managers/WorkerManager';
import { MetricsManager } from '../managers/MetricsManager';
import { ChunkProcessor } from '../managers/ChunkProcessor';
import { MurmubaraError, ErrorCodes, } from '../types';
export class MurmubaraEngine extends EventEmitter {
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
            const outputLevel = this.metricsManager.calculateRMS(output);
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
            version: '1.4.0',
            engineVersion: '1.4.0',
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
