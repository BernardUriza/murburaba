import { MAX_CHUNKS_IN_MEMORY, CHUNKS_TO_KEEP_ON_OVERFLOW, LOG_PREFIX } from './constants';
export class ChunkManager {
    constructor(urlManager) {
        this.urlManager = urlManager;
    }
    /**
     * Add a new chunk with memory management
     */
    addChunk(currentState, newChunk) {
        let updatedChunks = [...currentState.chunks, newChunk];
        // CRITICAL FOR MEDICAL APP: Prevent memory overflow during long recordings
        if (updatedChunks.length > MAX_CHUNKS_IN_MEMORY) {
            console.warn(`⚠️ ${LOG_PREFIX.MEDICAL_MEMORY} Chunk limit reached (${MAX_CHUNKS_IN_MEMORY}). Removing oldest chunks...`);
            // Remove oldest chunks and revoke their URLs
            const chunksToRemove = updatedChunks.slice(0, updatedChunks.length - CHUNKS_TO_KEEP_ON_OVERFLOW);
            chunksToRemove.forEach(chunk => {
                this.urlManager.revokeChunkUrls(chunk.id);
            });
            updatedChunks = updatedChunks.slice(-CHUNKS_TO_KEEP_ON_OVERFLOW);
        }
        return {
            ...currentState,
            chunks: updatedChunks
        };
    }
    /**
     * Toggle chunk playback state
     */
    toggleChunkPlayback(chunks, chunkId, isPlaying) {
        return chunks.map(chunk => ({
            ...chunk,
            isPlaying: chunk.id === chunkId ? isPlaying : false
        }));
    }
    /**
     * Toggle chunk expansion state
     */
    toggleChunkExpansion(chunks, chunkId) {
        return chunks.map(chunk => ({
            ...chunk,
            isExpanded: chunk.id === chunkId ? !chunk.isExpanded : false
        }));
    }
    /**
     * Find chunk by ID
     */
    findChunk(chunks, chunkId) {
        return chunks.find(c => c.id === chunkId);
    }
    /**
     * Clear all chunks
     */
    clearChunks(chunks) {
        // Revoke all URLs before clearing
        chunks.forEach(chunk => {
            this.urlManager.revokeChunkUrls(chunk.id);
        });
    }
    /**
     * Revoke URLs for all chunks
     */
    revokeChunkUrls(chunks) {
        chunks.forEach(chunk => {
            this.urlManager.revokeChunkUrls(chunk.id);
        });
    }
    /**
     * Calculate average noise reduction
     */
    getAverageNoiseReduction(chunks) {
        const validChunks = chunks.filter(c => c.isValid !== false);
        if (validChunks.length === 0)
            return 0;
        const sum = validChunks.reduce((acc, chunk) => acc + chunk.noiseRemoved, 0);
        return sum / validChunks.length;
    }
}
