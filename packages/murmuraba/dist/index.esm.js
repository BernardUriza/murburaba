import { useState, useRef } from 'react';

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
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const engineRef = useRef(null);
    const engineDataRef = useRef(null);
    const metricsRef = useRef({
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

class MurmurabaProcessor {
    constructor(frameSize = 480) {
        this.frameSize = frameSize;
        this.audioContext = null;
        this.processor = null;
        this.engine = null;
        this.inputBuffer = [];
        this.outputBuffer = [];
        this.metrics = {
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
    }
    async initialize(engine, sampleRate = 48000) {
        if (!engine.isInitialized) {
            await engine.initialize();
        }
        this.engine = engine;
        this.audioContext = new AudioContext({ sampleRate });
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.processor.onaudioprocess = (e) => this.processAudio(e);
    }
    processAudio(e) {
        if (!this.engine)
            return;
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        // Add to input buffer
        for (let i = 0; i < input.length; i++) {
            this.inputBuffer.push(input[i]);
            this.metrics.inputSamples++;
            this.metrics.peakInput = Math.max(this.metrics.peakInput, Math.abs(input[i]));
        }
        // Process frames
        while (this.inputBuffer.length >= this.frameSize) {
            const frame = new Float32Array(this.inputBuffer.splice(0, this.frameSize));
            const processedFrame = this.engine.process(frame);
            // Update metrics
            this.metrics.totalFrames++;
            const inputEnergy = this.calculateRMS(frame);
            const outputEnergy = this.calculateRMS(processedFrame);
            this.metrics.totalInputEnergy += inputEnergy;
            this.metrics.totalOutputEnergy += outputEnergy;
            if (outputEnergy < 0.001) {
                this.metrics.silenceFrames++;
            }
            else {
                this.metrics.activeFrames++;
            }
            // Add to output buffer
            for (let i = 0; i < processedFrame.length; i++) {
                this.outputBuffer.push(processedFrame[i]);
            }
        }
        // Output
        for (let i = 0; i < output.length; i++) {
            if (this.outputBuffer.length > 0) {
                const sample = this.outputBuffer.shift();
                output[i] = sample;
                this.metrics.outputSamples++;
                this.metrics.peakOutput = Math.max(this.metrics.peakOutput, Math.abs(sample));
            }
            else {
                output[i] = 0;
            }
        }
    }
    calculateRMS(frame) {
        let sum = 0;
        for (let i = 0; i < frame.length; i++) {
            sum += frame[i] * frame[i];
        }
        return Math.sqrt(sum / frame.length);
    }
    connectStream(stream) {
        if (!this.audioContext || !this.processor) {
            throw new Error('Processor not initialized');
        }
        const source = this.audioContext.createMediaStreamSource(stream);
        const destination = this.audioContext.createMediaStreamDestination();
        source.connect(this.processor);
        this.processor.connect(destination);
        return destination;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    resetMetrics() {
        this.metrics = {
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
    }
    cleanup() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.engine) {
            this.engine.cleanup();
            this.engine = null;
        }
    }
}

class AudioStreamManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.streams = new Map();
        this.sources = new Map();
    }
    addStream(id, stream) {
        if (this.streams.has(id)) {
            this.removeStream(id);
        }
        this.streams.set(id, stream);
        const source = this.audioContext.createMediaStreamSource(stream);
        this.sources.set(id, source);
        return source;
    }
    getStream(id) {
        return this.streams.get(id);
    }
    getSource(id) {
        return this.sources.get(id);
    }
    removeStream(id) {
        const stream = this.streams.get(id);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            this.streams.delete(id);
        }
        const source = this.sources.get(id);
        if (source) {
            source.disconnect();
            this.sources.delete(id);
        }
    }
    removeAllStreams() {
        const ids = Array.from(this.streams.keys());
        ids.forEach(id => this.removeStream(id));
    }
    get size() {
        return this.streams.size;
    }
}

// Main exports
// Constants
const MURMURABA_VERSION = '0.1.0';
const SUPPORTED_ENGINES = ['rnnoise', 'speex', 'custom'];

export { AudioStreamManager, MURMURABA_VERSION, MurmurabaProcessor, RNNoiseEngine, SUPPORTED_ENGINES, createAudioEngine, useAudioEngine };
//# sourceMappingURL=index.esm.js.map
