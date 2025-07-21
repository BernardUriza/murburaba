/**
 * Medical-grade URL management to prevent memory leaks
 * Critical for long recording sessions in hospitals
 */
export declare class URLManager {
    private objectUrls;
    constructor();
    /**
     * Create and track an object URL
     */
    createObjectURL(chunkId: string, blob: Blob): string;
    /**
     * Revoke all URLs for a specific chunk
     */
    revokeChunkUrls(chunkId: string): void;
    /**
     * Revoke all tracked URLs (for cleanup)
     */
    revokeAllUrls(): void;
    /**
     * Get statistics about tracked URLs
     */
    getStats(): {
        totalChunks: number;
        totalUrls: number;
    };
}
//# sourceMappingURL=urlManager.d.ts.map