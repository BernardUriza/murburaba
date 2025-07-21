/**
 * Optimized Audio Converter with caching and worker support
 * Because the original was garbage that blocked the main thread
 */
export declare class OptimizedAudioConverter {
    private static instance;
    private audioContext;
    private cache;
    private conversionQueue;
    private constructor();
    static getInstance(): OptimizedAudioConverter;
    /**
     * Convert to WAV with caching and deduplication
     */
    convertToWav(blob: Blob): Promise<Blob>;
    /**
     * Actual WAV conversion logic
     */
    private performWavConversion;
    /**
     * Optimized WAV encoder using TypedArrays efficiently
     */
    private encodeWavOptimized;
    /**
     * Convert to MP3 with Web Worker support
     */
    convertToMp3(blob: Blob, bitrate?: number): Promise<Blob>;
    /**
     * MP3 conversion in main thread (fallback)
     */
    private convertToMp3MainThread;
    /**
     * MP3 conversion using Web Worker
     */
    private convertToMp3InWorker;
    /**
     * Get best recording format (simplified)
     */
    static getBestRecordingFormat(): string;
    /**
     * Clean up resources
     */
    destroy(): void;
}
export declare function getOptimizedAudioConverter(): OptimizedAudioConverter;
//# sourceMappingURL=audioConverterOptimized.d.ts.map