/**
 * Smart RNNoise WASM Loader
 * Tries multiple strategies to load WASM without requiring manual file copying
 */
export async function loadEmbeddedRNNoise() {
    console.log('[RNNoise Loader] Starting smart load process...');
    // Strategy 1: Try to use existing global if available
    if (typeof window !== 'undefined' && window.createRNNWasmModule) {
        console.log('[RNNoise Loader] Found existing global module');
        return window.createRNNWasmModule();
    }
    // Strategy 2: Try to load from CDN (fallback)
    try {
        console.log('[RNNoise Loader] Trying CDN load...');
        const cdnUrl = 'https://unpkg.com/@jitsi/rnnoise-wasm@0.2.1/dist/';
        // Load the JS
        const script = document.createElement('script');
        script.src = cdnUrl + 'rnnoise.js';
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        // Initialize with CDN WASM path
        if (window.createRNNWasmModule) {
            return window.createRNNWasmModule({
                locateFile: (filename) => {
                    if (filename.endsWith('.wasm')) {
                        return cdnUrl + filename;
                    }
                    return filename;
                }
            });
        }
    }
    catch (error) {
        console.error('[RNNoise Loader] CDN load failed:', error);
    }
    // Strategy 3: Try to load from package manager CDN
    try {
        console.log('[RNNoise Loader] Trying jsDelivr CDN...');
        const jsDelivrUrl = 'https://cdn.jsdelivr.net/npm/@jitsi/rnnoise-wasm@0.2.1/dist/';
        const script = document.createElement('script');
        script.src = jsDelivrUrl + 'rnnoise.js';
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        if (window.createRNNWasmModule) {
            return window.createRNNWasmModule({
                locateFile: (filename) => {
                    if (filename.endsWith('.wasm')) {
                        return jsDelivrUrl + filename;
                    }
                    return filename;
                }
            });
        }
    }
    catch (error) {
        console.error('[RNNoise Loader] jsDelivr load failed:', error);
    }
    throw new Error('Failed to load RNNoise WASM module from any source');
}
// For environments that support import.meta.resolve (future)
export async function loadWithImportMeta() {
    try {
        // This will work in future versions of bundlers
        const wasmUrl = await import.meta.resolve?.('@jitsi/rnnoise-wasm/dist/rnnoise.wasm');
        if (wasmUrl) {
            const response = await fetch(wasmUrl);
            const wasmBuffer = await response.arrayBuffer();
            const module = await import('@jitsi/rnnoise-wasm');
            return module.default();
        }
    }
    catch (error) {
        console.warn('[RNNoise Loader] import.meta.resolve not supported');
    }
    return null;
}
