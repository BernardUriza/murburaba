/**
 * Tests for URLManager - Critical for Memory Leak Prevention
 * MEDICAL GRADE: Ensures no URLs leak in long hospital recordings
 */

import { URLManager } from '../../../hooks/murmuraba-engine/urlManager';

describe('URLManager - Medical Grade Memory Management', () => {
  let urlManager: URLManager;

  beforeEach(() => {
    jest.clearAllMocks();
    urlManager = new URLManager();
  });

  describe('URL Tracking', () => {
    it('should create and track URLs by chunk ID', () => {
      const chunkId = 'chunk-123';
      const blob1 = new Blob(['data1']);
      const blob2 = new Blob(['data2']);

      const url1 = urlManager.createObjectURL(chunkId, blob1);
      const url2 = urlManager.createObjectURL(chunkId, blob2);

      // Verify URLs were created
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
      expect(url1).toMatch(/^blob:mock-url-/);
      expect(url2).toMatch(/^blob:mock-url-/);
      
      // Verify stats
      const stats = urlManager.getStats();
      expect(stats.totalChunks).toBe(1);
      expect(stats.totalUrls).toBe(2);
    });

    it('should track multiple chunks independently', () => {
      urlManager.createObjectURL('chunk-1', new Blob(['1']));
      urlManager.createObjectURL('chunk-2', new Blob(['2']));
      urlManager.createObjectURL('chunk-3', new Blob(['3']));

      const stats = urlManager.getStats();
      expect(stats.totalChunks).toBe(3);
      expect(stats.totalUrls).toBe(3);
    });
  });

  describe('URL Revocation', () => {
    it('should revoke URLs for specific chunk', () => {
      const chunkId = 'chunk-to-revoke';
      
      const url1 = urlManager.createObjectURL(chunkId, new Blob(['1']));
      const url2 = urlManager.createObjectURL(chunkId, new Blob(['2']));
      
      urlManager.revokeChunkUrls(chunkId);

      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url2);
      
      // Verify chunk is removed
      const stats = urlManager.getStats();
      expect(stats.totalChunks).toBe(0);
    });

    it('should handle multiple revocations safely', () => {
      const chunkId = 'chunk-multi-revoke';
      
      urlManager.createObjectURL(chunkId, new Blob(['1']));
      urlManager.createObjectURL(chunkId, new Blob(['2']));
      urlManager.revokeChunkUrls(chunkId);
      
      // Second revocation should be safe
      expect(() => {
        urlManager.revokeChunkUrls(chunkId);
      }).not.toThrow();
    });

    it('should revoke all URLs on revokeAllUrls', () => {
      // Track multiple chunks
      for (let i = 0; i < 10; i++) {
        urlManager.createObjectURL(`chunk-${i}`, new Blob([`processed-${i}`]));
        urlManager.createObjectURL(`chunk-${i}`, new Blob([`original-${i}`]));
      }

      urlManager.revokeAllUrls();

      // Should revoke all 20 URLs (10 chunks × 2 URLs each)
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(20);
    });

    it('should clear internal tracking after revokeAllUrls', () => {
      urlManager.createObjectURL('chunk-1', new Blob(['1']));
      urlManager.createObjectURL('chunk-1', new Blob(['2']));
      urlManager.revokeAllUrls();

      // Reset mock to count new calls
      (URL.revokeObjectURL as jest.Mock).mockClear();

      // Revoking again should not call revokeObjectURL
      urlManager.revokeAllUrls();
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      
      // Verify stats are cleared
      const stats = urlManager.getStats();
      expect(stats.totalChunks).toBe(0);
      expect(stats.totalUrls).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle revoking non-existent chunk', () => {
      expect(() => {
        urlManager.revokeChunkUrls('non-existent-chunk');
      }).not.toThrow();
      
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('should handle very large number of URLs (stress test)', () => {
      const CHUNK_COUNT = 1000;
      
      // Track many chunks
      for (let i = 0; i < CHUNK_COUNT; i++) {
        urlManager.createObjectURL(`chunk-${i}`, new Blob([`processed-${i}`]));
        urlManager.createObjectURL(`chunk-${i}`, new Blob([`original-${i}`]));
      }

      const startTime = Date.now();
      urlManager.revokeAllUrls();
      const endTime = Date.now();

      // Should complete quickly even with many URLs
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(CHUNK_COUNT * 2);
    });
  });
});