/**
 * Medical-grade recording constants for hospital use
 * These values are optimized for long medical consultations
 */
export declare const MAX_CHUNKS_IN_MEMORY = 100;
export declare const CHUNKS_TO_KEEP_ON_OVERFLOW = 90;
export declare const MIN_VALID_BLOB_SIZE = 100;
export declare const DEFAULT_CHUNK_DURATION = 8;
export declare const RECORDING_UPDATE_INTERVAL = 100;
export declare const DEFAULT_MP3_BITRATE = 128;
export declare const SUPPORTED_MIME_TYPES: {
    readonly WEBM: "audio/webm";
    readonly MP3: "audio/mp3";
    readonly WAV: "audio/wav";
};
export declare const LOG_PREFIX: {
    readonly LIFECYCLE: "[LIFECYCLE]";
    readonly CONCAT_STREAM: "[CONCAT-STREAM]";
    readonly MEDICAL_MEMORY: "[MEDICAL-MEMORY]";
    readonly ERROR: "[ERROR]";
    readonly EXPORT: "[EXPORT]";
    readonly RECORDING: "[RECORDING]";
};
//# sourceMappingURL=constants.d.ts.map