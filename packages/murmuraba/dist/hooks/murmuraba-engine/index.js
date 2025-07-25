import { useMurmubaraEngine as useMurmubaraEngineInternal } from './useMurmubaraEngine';
/**
 * Public version of useMurmubaraEngine that omits internal recording functions
 * External users should use processFileWithMetrics('Use.Mic') for recording
 */
export function useMurmubaraEngine(options = {}) {
    const internalHook = useMurmubaraEngineInternal(options);
    // Return hook without internal recording functions
    const { _internal_startRecording, _internal_stopRecording, _internal_pauseRecording, _internal_resumeRecording, _internal_clearRecordings, ...publicAPI } = internalHook;
    return publicAPI;
}
// Internal export for processFileWithMetrics to use
export { useMurmubaraEngine as useMurmubaraEngineInternal } from './useMurmubaraEngine';
// Constant exports for external use
export { MAX_CHUNKS_IN_MEMORY, CHUNKS_TO_KEEP_ON_OVERFLOW, DEFAULT_CHUNK_DURATION, DEFAULT_MP3_BITRATE, SUPPORTED_MIME_TYPES } from './constants';
