/**
 * Audio Format Converter Utility
 * Converts WebM/Opus audio to WAV format for universal browser playback
 */
export declare class AudioConverter {
    private audioContext;
    private createdUrls;
    constructor();
    /**
     * Convert Float32Array audio to Int16Array
     */
    float32ToInt16(input: Float32Array): Int16Array;
    /**
     * Convert Int16Array audio to Float32Array
     */
    int16ToFloat32(input: Int16Array): Float32Array;
    /**
     * Interleave two mono channels into stereo
     */
    interleaveChannels(left: Float32Array, right: Float32Array): Float32Array;
    /**
     * Deinterleave stereo into two mono channels
     */
    deinterleaveChannels(input: Float32Array): {
        left: Float32Array;
        right: Float32Array;
    };
    /**
     * Mix multi-channel audio to mono
     */
    mixToMono(input: Float32Array, channels?: number): Float32Array;
    /**
     * Convert a Blob from WebM/Opus to WAV format
     */
    convertToWav(blob: Blob): Promise<Blob>;
    /**
     * Convert WebM blob to WAV blob (static method for easy use)
     */
    static webmToWav(webmBlob: Blob): Promise<Blob>;
    /**
     * Convert WebM to MP3 using lamejs
     */
    static webmToMp3(webmBlob: Blob, bitrate?: number): Promise<Blob>;
    /**
     * Convert Float32Array to Blob in specified format
     */
    float32ArrayToBlob(audioData: Float32Array, sampleRate: number, format: 'wav' | 'webm' | 'raw'): Promise<Blob>;
    /**
     * Convert AudioBuffer to WAV format (MONO only for RNNoise compatibility)
     */
    audioBufferToWav(audioBuffer: AudioBuffer): Blob;
    /**
     * Check if a MIME type is supported for playback
     */
    static canPlayType(mimeType: string): boolean;
    /**
     * Get the best supported audio format for recording
     */
    static getBestRecordingFormat(): string;
    /**
     * Convert blob URL to WAV blob URL
     */
    convertBlobUrl(blobUrl: string): Promise<string>;
    /**
     * CRITICAL FOR MEDICAL APP: Clean up all created URLs to prevent memory leaks
     * Must be called when the converter is no longer needed
     */
    destroy(): void;
}
export declare function getAudioConverter(): AudioConverter;
/**
 * CRITICAL FOR MEDICAL APP: Destroy the singleton and clean up all resources
 * Must be called when the application is shutting down or during cleanup
 */
export declare function destroyAudioConverter(): void;
//# sourceMappingURL=audioConverter.d.ts.map