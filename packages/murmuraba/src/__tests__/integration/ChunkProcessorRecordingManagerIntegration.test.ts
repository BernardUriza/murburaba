/**
 * Integration tests for ChunkProcessor and RecordingManager
 * 
 * These tests define HOW the integration SHOULD work:
 * 1. ChunkProcessor accumulates real audio metrics over time periods
 * 2. RecordingManager receives these aggregated metrics when creating ProcessedChunks
 * 3. ProcessedChunk objects contain REAL noise reduction values, not blob-size garbage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkProcessor } from '../../managers/ChunkProcessor';
import { RecordingManager } from '../../hooks/murmuraba-engine/recordingManager';
import { URLManager } from '../../hooks/murmuraba-engine/urlManager';
import { MetricsManager } from '../../managers/MetricsManager';
import { Logger } from '../../core/Logger';
import { ProcessedChunk } from '../../hooks/murmuraba-engine/types';

// Mock the heavy dependencies
vi.mock('../../api', () => ({
  initializeAudioEngine: vi.fn(),
  processStream: vi.fn(),
}));

describe('ChunkProcessor + RecordingManager Integration', () => {
  let chunkProcessor: ChunkProcessor;
  let recordingManager: RecordingManager;
  let urlManager: URLManager;
  let metricsManager: MetricsManager;
  let logger: Logger;
  let mockProcessedStream: MediaStream;
  let mockOriginalStream: MediaStream;

  beforeEach(() => {
    // Setup mocks
    urlManager = new URLManager();
    metricsManager = new MetricsManager();
    logger = new Logger('test', 'info');
    recordingManager = new RecordingManager(urlManager);
    
    chunkProcessor = new ChunkProcessor(
      { chunkDuration: 100 },
      logger,
      metricsManager
    );

    // Mock streams
    mockProcessedStream = new MediaStream();
    mockOriginalStream = new MediaStream();
  });

  describe('🎯 Test 1: ChunkProcessor Metrics Accumulation', () => {
    it('should accumulate metrics over a defined time period', async () => {
      // ARRANGE: Set up metrics accumulation for 8-second periods
      const CHUNK_DURATION = 8000; // 8 seconds
      let accumulatedMetrics: any = null;
      
      // The ChunkProcessor should be able to report aggregated metrics
      chunkProcessor.on('period-complete', (metrics) => {
        accumulatedMetrics = metrics;
      });

      // ACT: Simulate processing audio frames for 8 seconds
      const frameCount = 800; // ~8 seconds of 10ms frames
      for (let i = 0; i < frameCount; i++) {
        const mockFrameData = new Float32Array(480).fill(0.1 + (i * 0.001));
        await chunkProcessor.processFrame(mockFrameData, i * 10);
      }

      // Trigger period completion
      chunkProcessor.completePeriod(CHUNK_DURATION);

      // ASSERT: Should have accumulated metrics for the entire period
      expect(accumulatedMetrics).toBeTruthy();
      expect(accumulatedMetrics.totalFrames).toBe(frameCount);
      expect(accumulatedMetrics.averageNoiseReduction).toBeGreaterThan(0);
      expect(accumulatedMetrics.periodDuration).toBe(CHUNK_DURATION);
      expect(accumulatedMetrics.startTime).toBeDefined();
      expect(accumulatedMetrics.endTime).toBeDefined();
    });

    it('should calculate realistic noise reduction percentages', async () => {
      // ARRANGE: Create audio with clear noise vs clean signal
      const noisyFrames = Array(400).fill(null).map(() => 
        new Float32Array(480).fill(0.8) // High amplitude = noisy
      );
      const cleanFrames = Array(400).fill(null).map(() => 
        new Float32Array(480).fill(0.2) // Low amplitude = clean
      );

      let metricsResult: any = null;
      chunkProcessor.on('period-complete', (metrics) => {
        metricsResult = metrics;
      });

      // ACT: Process noisy frames, then clean frames (simulating noise reduction)
      for (let i = 0; i < noisyFrames.length; i++) {
        await chunkProcessor.processFrame(noisyFrames[i], i * 10, cleanFrames[i]);
      }

      chunkProcessor.completePeriod(8000);

      // ASSERT: Should show meaningful noise reduction
      expect(metricsResult.averageNoiseReduction).toBeGreaterThan(50); // Should show >50% reduction
      expect(metricsResult.averageNoiseReduction).toBeLessThan(100);   // But not impossible values
    });
  });

  describe('🎯 Test 2: RecordingManager Integration', () => {
    it('should receive aggregated metrics from ChunkProcessor', async () => {
      // ARRANGE: RecordingManager should be able to accept metrics from ChunkProcessor
      const processedChunks: ProcessedChunk[] = [];
      const onChunkProcessed = (chunk: ProcessedChunk) => {
        processedChunks.push(chunk);
      };

      // Set up metrics provider (ChunkProcessor)
      const metricsProvider = {
        getAggregatedMetrics: (startTime: number, endTime: number) => ({
          averageNoiseReduction: 67.5,
          totalFrames: 800,
          averageLatency: 1.2,
          periodDuration: endTime - startTime
        })
      };

      recordingManager.setMetricsProvider(metricsProvider);

      // ACT: Start recording and let it create a chunk
      await recordingManager.startCycle(
        mockProcessedStream,
        mockOriginalStream, 
        8000,
        onChunkProcessed
      );

      // Simulate recording completion
      await new Promise(resolve => setTimeout(resolve, 100));
      recordingManager.stopRecording();

      // ASSERT: ProcessedChunk should have REAL metrics
      expect(processedChunks).toHaveLength(1);
      const chunk = processedChunks[0];
      expect(chunk.noiseRemoved).toBe(67.5); // NOT 0, NOT negative garbage
      expect(chunk.metrics.processingLatency).toBe(1.2);
      expect(chunk.metrics.frameCount).toBe(800);
    });

    it('should handle missing metrics gracefully', async () => {
      // ARRANGE: No metrics provider
      const processedChunks: ProcessedChunk[] = [];
      const onChunkProcessed = (chunk: ProcessedChunk) => {
        processedChunks.push(chunk);
      };

      // ACT: Record without metrics provider
      await recordingManager.startCycle(
        mockProcessedStream,
        mockOriginalStream,
        8000, 
        onChunkProcessed
      );

      await new Promise(resolve => setTimeout(resolve, 100));
      recordingManager.stopRecording();

      // ASSERT: Should fall back to safe defaults, NOT negative values
      expect(processedChunks).toHaveLength(1);
      const chunk = processedChunks[0];
      expect(chunk.noiseRemoved).toBe(0); // Safe default
      expect(chunk.noiseRemoved).toBeGreaterThanOrEqual(0); // NEVER negative
    });
  });

  describe('🎯 Test 3: End-to-End Integration', () => {
    it('should flow real metrics from ChunkProcessor to ProcessedChunk', async () => {
      // ARRANGE: Full integration setup
      const processedChunks: ProcessedChunk[] = [];
      let chunkProcessorMetrics: any = null;

      // Connect ChunkProcessor to RecordingManager
      chunkProcessor.on('period-complete', (metrics) => {
        chunkProcessorMetrics = metrics;
        recordingManager.receiveMetrics(metrics);
      });

      const onChunkProcessed = (chunk: ProcessedChunk) => {
        processedChunks.push(chunk);
      };

      // ACT: Simulate the full flow
      // 1. Start recording
      await recordingManager.startCycle(
        mockProcessedStream,
        mockOriginalStream,
        8000,
        onChunkProcessed
      );

      // 2. Process audio frames (simulating real-time processing)
      for (let i = 0; i < 800; i++) {
        const originalFrame = new Float32Array(480).fill(0.8);
        const processedFrame = new Float32Array(480).fill(0.3);
        await chunkProcessor.processFrame(originalFrame, i * 10, processedFrame);
      }

      // 3. Complete the recording period
      chunkProcessor.completePeriod(8000);
      
      // 4. Stop recording
      await new Promise(resolve => setTimeout(resolve, 100));
      recordingManager.stopRecording();

      // ASSERT: The metrics should flow correctly
      expect(chunkProcessorMetrics).toBeTruthy();
      expect(processedChunks).toHaveLength(1);
      
      const chunk = processedChunks[0];
      expect(chunk.noiseRemoved).toBe(chunkProcessorMetrics.averageNoiseReduction);
      expect(chunk.noiseRemoved).toBeGreaterThan(50); // Realistic noise reduction
      expect(chunk.metrics.frameCount).toBe(800);
    });
  });

  describe('🎯 Test 4: Temporal Synchronization', () => {
    it('should maintain precise temporal alignment', async () => {
      // ARRANGE: Set up temporal tracking
      const events: Array<{type: string, timestamp: number}> = [];
      
      chunkProcessor.on('frame-processed', (timestamp) => {
        events.push({type: 'frame', timestamp});
      });

      recordingManager.on('recording-started', (timestamp) => {
        events.push({type: 'recording-start', timestamp});
      });

      recordingManager.on('recording-stopped', (timestamp) => {
        events.push({type: 'recording-stop', timestamp});
      });

      // ACT: Execute synchronized recording and processing
      const startTime = Date.now();
      
      await recordingManager.startCycle(
        mockProcessedStream,
        mockOriginalStream,
        8000,
        () => {}
      );

      // Process frames with precise timing
      for (let i = 0; i < 100; i++) {
        const frameTime = startTime + (i * 10);
        await chunkProcessor.processFrame(
          new Float32Array(480).fill(0.5),
          frameTime
        );
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      recordingManager.stopRecording();

      // ASSERT: Events should be temporally aligned
      const recordingStart = events.find(e => e.type === 'recording-start');
      const recordingStop = events.find(e => e.type === 'recording-stop');
      const frameEvents = events.filter(e => e.type === 'frame');

      expect(recordingStart).toBeTruthy();
      expect(recordingStop).toBeTruthy();
      expect(frameEvents.length).toBe(100);
      
      // All frame events should be between recording start and stop
      frameEvents.forEach(frameEvent => {
        expect(frameEvent.timestamp).toBeGreaterThanOrEqual(recordingStart!.timestamp);
        expect(frameEvent.timestamp).toBeLessThanOrEqual(recordingStop!.timestamp);
      });
    });
  });
});