import { ProcessedChunk } from './types';
export declare class PlaybackManager {
    private audioElements;
    private stateChangeCallback?;
    /**
     * Toggle chunk playback
     */
    toggleChunkPlayback(chunk: ProcessedChunk, audioType: 'processed' | 'original', onPlayStateChange: (chunkId: string, isPlaying: boolean) => void): Promise<void>;
    /**
     * Stop all audio playback
     */
    stopAllAudio(): void;
    /**
     * Stop all audio except for a specific chunk
     */
    private stopAllAudioExceptChunk;
    /**
     * Clean up audio elements for a chunk
     */
    cleanupChunk(chunkId: string): void;
    /**
     * Clean up all audio elements
     */
    cleanup(): void;
}
//# sourceMappingURL=playbackManager.d.ts.map