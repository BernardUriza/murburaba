/**
 * Audio Format Converter Utility
 * Converts WebM/Opus audio to WAV format for universal browser playback
 */
export declare class AudioConverter {
    private audioContext;
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
     * Convert AudioBuffer to WAV format
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
}
export declare function getAudioConverter(): AudioConverter;
//# sourceMappingURL=audioConverter.d.ts.map