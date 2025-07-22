/**
 * Smart RNNoise WASM Loader
 * Tries multiple strategies to load WASM without requiring manual file copying
 */
declare global {
    interface Window {
        createRNNWasmModule?: any;
    }
}
export declare function loadEmbeddedRNNoise(): Promise<any>;
export declare function loadWithImportMeta(): Promise<any>;
//# sourceMappingURL=rnnoise-loader.d.ts.map