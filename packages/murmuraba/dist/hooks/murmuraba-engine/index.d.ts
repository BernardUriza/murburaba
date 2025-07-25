import type { UseMurmubaraEngineOptions, UseMurmubaraEngineReturn } from './types';
/**
 * Public version of useMurmubaraEngine that omits internal recording functions
 * External users should use processFileWithMetrics('Use.Mic') for recording
 */
export declare function useMurmubaraEngine(options?: UseMurmubaraEngineOptions): UseMurmubaraEngineReturn;
export type { ProcessedChunk, RecordingState, UseMurmubaraEngineOptions, UseMurmubaraEngineReturn } from './types';
export { useMurmubaraEngine as useMurmubaraEngineInternal } from './useMurmubaraEngine';
export { MAX_CHUNKS_IN_MEMORY, CHUNKS_TO_KEEP_ON_OVERFLOW, DEFAULT_CHUNK_DURATION, DEFAULT_MP3_BITRATE, SUPPORTED_MIME_TYPES } from './constants';
//# sourceMappingURL=index.d.ts.map