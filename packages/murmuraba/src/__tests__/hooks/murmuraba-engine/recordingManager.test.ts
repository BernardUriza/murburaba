/**
 * TDD Tests for RecordingManager - Empty Blob Handling
 */

import { RecordingManager } from '../../../hooks/murmuraba-engine/recordingManager';
import { URLManager } from '../../../hooks/murmuraba-engine/urlManager';
import { ProcessedChunk } from '../../../hooks/murmuraba-engine/types';

describe('RecordingManager - Empty Blob Handling', () => {
  let recordingManager: RecordingManager;
  let urlManager: URLManager;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    urlManager = new URLManager();
    recordingManager = new RecordingManager(urlManager);
    
    // Mock console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    
    // Mock URL methods
    global.URL.createObjectURL = jest.fn(() => `blob:test-${Math.random()}`);
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Blob Size Validation', () => {
    it('should warn when empty blobs are received', async () => {
      let mediaRecorderInstance: any;
      let originalRecorderInstance: any;
      
      // Mock MediaRecorder
      (global.MediaRecorder as any) = jest.fn().mockImplementation((stream, options) => {
        const recorder = {
          start: jest.fn(),
          stop: jest.fn(),
          state: 'inactive',
          ondataavailable: null,
          onstop: null,
          onerror: null,
        };
        
        if (stream === processedStream) {
          mediaRecorderInstance = recorder;
        } else {
          originalRecorderInstance = recorder;
        }
        
        return recorder;
      });

      const processedStream = { getTracks: () => [] } as any;
      const originalStream = { getTracks: () => [] } as any;
      const onChunkReady = jest.fn();

      // Start recording
      await recordingManager.startConcatenatedStreaming(
        processedStream,
        originalStream,
        'audio/webm',
        8,
        onChunkReady
      );

      // Simulate empty blob from MediaRecorder
      if (mediaRecorderInstance?.ondataavailable) {
        mediaRecorderInstance.ondataavailable({ 
          data: new Blob([], { type: 'audio/webm' }) 
        });
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid blob size detected'),
        expect.objectContaining({
          blobSize: 0,
          type: 'processed'
        })
      );
    });

    it('should filter out blobs smaller than MIN_VALID_BLOB_SIZE', async () => {
      let mediaRecorderInstance: any;
      let onStopCallback: any;
      const capturedBlobs: Blob[] = [];
      
      (global.MediaRecorder as any) = jest.fn().mockImplementation((stream) => {
        const recorder = {
          start: jest.fn(),
          stop: jest.fn(() => {
            if (onStopCallback) onStopCallback();
          }),
          state: 'recording',
          ondataavailable: null,
          onstop: null,
          onerror: null,
        };
        
        if (stream === processedStream) {
          mediaRecorderInstance = recorder;
          // Capture onstop callback
          Object.defineProperty(recorder, 'onstop', {
            set: (callback) => { onStopCallback = callback; }
          });
        }
        
        return recorder;
      });

      const processedStream = { getTracks: () => [] } as any;
      const originalStream = { getTracks: () => [] } as any;
      const chunks: ProcessedChunk[] = [];
      const onChunkReady = (chunk: ProcessedChunk) => chunks.push(chunk);

      await recordingManager.startConcatenatedStreaming(
        processedStream,
        originalStream,
        'audio/webm',
        8,
        onChunkReady
      );

      // Send various sized blobs
      if (mediaRecorderInstance?.ondataavailable) {
        // Too small - should be rejected
        mediaRecorderInstance.ondataavailable({ 
          data: new Blob(['x'], { type: 'audio/webm' }) // 1 byte
        });
        
        // Valid size - should be accepted
        mediaRecorderInstance.ondataavailable({ 
          data: new Blob(['x'.repeat(200)], { type: 'audio/webm' }) // 200 bytes
        });
      }

      // Trigger stop to process chunks
      recordingManager.stopRecording();

      // Should have warnings for small blobs
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid blob size detected'),
        expect.objectContaining({
          blobSize: 1
        })
      );
    });

    it('should not create chunks when all blobs are empty', async () => {
      let mediaRecorderInstance: any;
      let originalRecorderInstance: any;
      let onStopCallback: any;
      
      (global.MediaRecorder as any) = jest.fn().mockImplementation((stream) => {
        const recorder = {
          start: jest.fn(),
          stop: jest.fn(() => {
            if (onStopCallback && stream === processedStream) {
              onStopCallback();
            }
          }),
          state: 'recording',
          ondataavailable: null,
          onstop: null,
          onerror: null,
        };
        
        if (stream === processedStream) {
          mediaRecorderInstance = recorder;
          Object.defineProperty(recorder, 'onstop', {
            set: (callback) => { onStopCallback = callback; }
          });
        } else {
          originalRecorderInstance = recorder;
        }
        
        return recorder;
      });

      const processedStream = { getTracks: () => [] } as any;
      const originalStream = { getTracks: () => [] } as any;
      const chunks: ProcessedChunk[] = [];
      const onChunkReady = (chunk: ProcessedChunk) => chunks.push(chunk);

      await recordingManager.startConcatenatedStreaming(
        processedStream,
        originalStream,
        'audio/webm',
        8,
        onChunkReady
      );

      // Send only empty blobs
      if (mediaRecorderInstance?.ondataavailable) {
        mediaRecorderInstance.ondataavailable({ 
          data: new Blob([], { type: 'audio/webm' }) 
        });
      }
      if (originalRecorderInstance?.ondataavailable) {
        originalRecorderInstance.ondataavailable({ 
          data: new Blob([], { type: 'audio/webm' }) 
        });
      }

      // Stop and check
      recordingManager.stopRecording();

      // No chunks should be created
      expect(chunks).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('discarded - no valid blobs collected')
      );
    });

    it('should handle mixed valid and invalid blob sizes correctly', async () => {
      let mediaRecorderInstance: any;
      let originalRecorderInstance: any;
      let processedOnStop: any;
      let originalOnStop: any;
      
      (global.MediaRecorder as any) = jest.fn().mockImplementation((stream) => {
        const recorder = {
          start: jest.fn(),
          stop: jest.fn(() => {
            if (stream === processedStream && processedOnStop) {
              processedOnStop();
            }
          }),
          state: 'recording',
          ondataavailable: null,
          onstop: null,
          onerror: null,
        };
        
        if (stream === processedStream) {
          mediaRecorderInstance = recorder;
          Object.defineProperty(recorder, 'onstop', {
            get: () => processedOnStop,
            set: (callback) => { processedOnStop = callback; }
          });
        } else {
          originalRecorderInstance = recorder;
          Object.defineProperty(recorder, 'onstop', {
            get: () => originalOnStop,
            set: (callback) => { originalOnStop = callback; }
          });
        }
        
        return recorder;
      });

      const processedStream = { getTracks: () => [] } as any;
      const originalStream = { getTracks: () => [] } as any;
      const chunks: ProcessedChunk[] = [];
      const onChunkReady = (chunk: ProcessedChunk) => chunks.push(chunk);

      await recordingManager.startConcatenatedStreaming(
        processedStream,
        originalStream,
        'audio/webm',
        8,
        onChunkReady
      );

      // Send mixed blobs to processed recorder
      if (mediaRecorderInstance?.ondataavailable) {
        // Invalid - too small
        mediaRecorderInstance.ondataavailable({ 
          data: new Blob(['x'], { type: 'audio/webm' }) 
        });
        // Valid
        mediaRecorderInstance.ondataavailable({ 
          data: new Blob(['x'.repeat(500)], { type: 'audio/webm' }) 
        });
        // Invalid - empty
        mediaRecorderInstance.ondataavailable({ 
          data: new Blob([], { type: 'audio/webm' }) 
        });
      }

      // Send valid blob to original recorder
      if (originalRecorderInstance?.ondataavailable) {
        originalRecorderInstance.ondataavailable({ 
          data: new Blob(['x'.repeat(500)], { type: 'audio/webm' }) 
        });
      }

      // Trigger processing
      mediaRecorderInstance.state = 'inactive';
      if (processedOnStop) processedOnStop();

      // Should create chunk with only valid blobs
      expect(chunks).toHaveLength(1);
      expect(chunks[0].processedSize).toBe(500);
      expect(chunks[0].originalSize).toBe(500);
      expect(chunks[0].isValid).toBe(true);
    });
  });
});