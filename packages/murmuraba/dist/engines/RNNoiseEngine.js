export class RNNoiseEngine {
    constructor(config) {
        this.name = 'RNNoise';
        this.description = 'Neural network-based noise suppression';
        this.isInitialized = false;
        this.module = null;
        this.state = null;
        this.inputPtr = 0;
        this.outputPtr = 0;
        this.config = {
            wasmPath: config?.wasmPath || '',
            scriptPath: config?.scriptPath || ''
        };
    }
    async initialize() {
        if (this.isInitialized)
            return;
        console.log('[RNNoiseEngine] Starting initialization...');
        try {
            // Try to import directly from node_modules
            const rnnoise = await import('@jitsi/rnnoise-wasm');
            // Initialize the module
            this.module = await rnnoise.default();
        }
        catch (error) {
            console.error('[RNNoiseEngine] Failed to load from import, trying script tag...', error);
            // Fallback to script tag if import fails
            const script = document.createElement('script');
            script.src = this.config.scriptPath || '/rnnoise-fixed.js';
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
                        return this.config.wasmPath ?
                            `${this.config.wasmPath}/${filename}` :
                            `/dist/${filename}`;
                    }
                    return filename;
                }
            });
        }
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
