import { ProcessedChunk, RecordingState } from './types';
import { URLManager } from './urlManager';
export declare class ChunkManager {
    private urlManager;
    constructor(urlManager: URLManager);
    /**
     * Add a new chunk with memory management
     */
    addChunk(currentState: RecordingState, newChunk: ProcessedChunk): RecordingState;
    /**
     * Toggle chunk playback state
     */
    toggleChunkPlayback(chunks: ProcessedChunk[], chunkId: string, isPlaying: boolean): ProcessedChunk[];
    /**
     * Toggle chunk expansion state
     */
    toggleChunkExpansion(chunks: ProcessedChunk[], chunkId: string): ProcessedChunk[];
    /**
     * Find chunk by ID
     */
    findChunk(chunks: ProcessedChunk[], chunkId: string): ProcessedChunk | undefined;
    /**
     * Clear all chunks
     */
    clearChunks(chunks: ProcessedChunk[]): void;
    /**
     * Calculate average noise reduction
     */
    getAverageNoiseReduction(chunks: ProcessedChunk[]): number;
}
//# sourceMappingURL=chunkManager.d.ts.map