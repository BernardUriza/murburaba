/**
 * Audio Format Converter Utility
 * Converts WebM/Opus audio to WAV format for universal browser playback
 */
export declare class AudioConverter {
    private audioContext;
    private createdUrls;
    constructor();
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
     * Convert AudioBuffer to WAV format (MONO only for RNNoise compatibility)
     */
    private audioBufferToWav;
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