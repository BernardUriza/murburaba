import { ProcessedChunk, RecordingState } from './types';
import { ChunkMetrics } from '../../types';
import { processStream } from '../../api';
import { MIN_VALID_BLOB_SIZE, LOG_PREFIX } from './constants';
import { URLManager } from './urlManager';

interface ChunkRecording {
  processed: Blob[];
  original: Blob[];
  finalized: boolean;
}

export class RecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private originalRecorder: MediaRecorder | null = null;
  private chunkRecordings = new Map<string, ChunkRecording>();
  private processChunkInterval: NodeJS.Timeout | null = null;
  private stopCycleFlag = false;
  private cycleCount = 0;
  private cycleTimeout: NodeJS.Timeout | null = null;

  // TDD Integration: Metrics provider from ChunkProcessor
  private metricsProvider: {
    getAggregatedMetrics: (startTime: number, endTime: number) => any;
  } | null = null;
  private currentMetrics: any = null;

  constructor(private urlManager: URLManager) {
    // TDD Integration: Register with global bridge for ChunkProcessor communication
    if ((global as any).__murmurabaTDDBridge) {
      if (!((global as any).__murmurabaTDDBridge.recordingManagers)) {
        (global as any).__murmurabaTDDBridge.recordingManagers = new Set();
      }
      (global as any).__murmurabaTDDBridge.recordingManagers.add(this);
      
      console.log(`🔗 [TDD-INTEGRATION] RecordingManager registered with ChunkProcessor bridge`);
    }
  }

  /**
   * TDD Integration: Set metrics provider from ChunkProcessor
   */
  setMetricsProvider(provider: {
    getAggregatedMetrics: (startTime: number, endTime: number) => any;
  }): void {
    this.metricsProvider = provider;
  }

  /**
   * TDD Integration: Receive metrics from ChunkProcessor
   */
  receiveMetrics(metrics: any): void {
    this.currentMetrics = metrics;
    console.log(`📊 [RECORDING-INTEGRATION] Received real metrics: ${metrics.averageNoiseReduction.toFixed(1)}% avg reduction`);
  }

  /**
   * TDD Integration: Get real metrics for a time period
   */
  private getRealMetrics(startTime: number, endTime: number): any {
    // Try current metrics first
    if (this.currentMetrics) {
      return this.currentMetrics;
    }

    // Try metrics provider
    if (this.metricsProvider) {
      return this.metricsProvider.getAggregatedMetrics(startTime, endTime);
    }

    // Fallback to safe defaults (NOT negative values)
    return {
      averageNoiseReduction: 0,
      totalFrames: Math.floor((endTime - startTime) / 10),
      averageLatency: 0
    };
  }

  /**
   * Start concatenated streaming for medical-grade recording
   */
  async startCycle(
    processedStream: MediaStream,
    originalStream: MediaStream,
    chunkDuration: number,
    onChunkProcessed: (chunk: ProcessedChunk) => void
  ): Promise<void> {
    // Use a default mime type for now
    const mimeType = 'audio/webm;codecs=opus';
    this.cycleCount = 0;
    this.stopCycleFlag = false;

    const startNewRecordingCycle = () => {
      if (this.stopCycleFlag) return;
      
      this.cycleCount++;
      const cycleStartTime = Date.now();
      console.log(`🔄 ${LOG_PREFIX.CONCAT_STREAM} Starting recording cycle #${this.cycleCount}`);
      
      // Create chunk ID for this cycle
      const chunkId = `chunk-${cycleStartTime}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize recording storage
      this.chunkRecordings.set(chunkId, { 
        processed: [], 
        original: [], 
        finalized: false 
      });
      
      // Create new recorders for this cycle
      const currentRecorder = new MediaRecorder(processedStream, { mimeType });
      const currentOriginalRecorder = new MediaRecorder(originalStream, { mimeType });
      
      currentRecorder.ondataavailable = (event) => {
        if (event.data.size >= MIN_VALID_BLOB_SIZE) {
          const chunkRecording = this.chunkRecordings.get(chunkId);
          if (chunkRecording && !chunkRecording.finalized) {
            chunkRecording.processed.push(event.data);
            console.log(`💾 ${LOG_PREFIX.CONCAT_STREAM} Cycle #${this.cycleCount} - Processed data: ${event.data.size} bytes`);
          }
        } else {
          console.warn(`⚠️ ${LOG_PREFIX.CONCAT_STREAM} Invalid blob size detected! Size: ${event.data.size} bytes (minimum: ${MIN_VALID_BLOB_SIZE} bytes)`, {
            cycleNumber: this.cycleCount,
            blobSize: event.data.size,
            type: 'processed'
          });
        }
      };
      
      currentOriginalRecorder.ondataavailable = (event) => {
        if (event.data.size >= MIN_VALID_BLOB_SIZE) {
          const chunkRecording = this.chunkRecordings.get(chunkId);
          if (chunkRecording && !chunkRecording.finalized) {
            chunkRecording.original.push(event.data);
            console.log(`💾 ${LOG_PREFIX.CONCAT_STREAM} Cycle #${this.cycleCount} - Original data: ${event.data.size} bytes`);
          }
        } else {
          console.warn(`⚠️ ${LOG_PREFIX.CONCAT_STREAM} Invalid blob size detected! Size: ${event.data.size} bytes (minimum: ${MIN_VALID_BLOB_SIZE} bytes)`, {
            cycleNumber: this.cycleCount,
            blobSize: event.data.size,
            type: 'original'
          });
        }
      };
      
      currentRecorder.onerror = (error) => {
        console.error(`❌ ${LOG_PREFIX.CONCAT_STREAM} Processed recorder error:`, error);
      };
      
      currentOriginalRecorder.onerror = (error) => {
        console.error(`❌ ${LOG_PREFIX.CONCAT_STREAM} Original recorder error:`, error);
      };
      
      // When recording stops, process and create chunk
      currentRecorder.onstop = () => {
        console.log(`🔄 ${LOG_PREFIX.CONCAT_STREAM} Recorder stopped for cycle #${this.cycleCount}`);
        const chunkRecording = this.chunkRecordings.get(chunkId);
        if (chunkRecording && !chunkRecording.finalized) {
          // Only process if we have valid data
          if (chunkRecording.processed.length > 0 || chunkRecording.original.length > 0) {
            this.processChunkRecording(
              chunkId,
              chunkRecording,
              cycleStartTime,
              mimeType,
              onChunkProcessed
            );
          } else {
            console.warn(`⚠️ ${LOG_PREFIX.CONCAT_STREAM} Cycle #${this.cycleCount} discarded - no valid blobs collected`);
            // Clean up the empty recording
            this.chunkRecordings.delete(chunkId);
          }
        }
      };
      
      // Start recording
      currentRecorder.start(1000);
      currentOriginalRecorder.start(1000);
      
      // Store refs
      this.mediaRecorder = currentRecorder;
      this.originalRecorder = currentOriginalRecorder;
    };

    // Stop current cycle and start new one
    const cycleRecording = () => {
      if (this.stopCycleFlag) {
        console.log(`🚫 ${LOG_PREFIX.CONCAT_STREAM} Cycle skipped - stop flag set`);
        return;
      }
      
      console.log(`⏹️ ${LOG_PREFIX.CONCAT_STREAM} Stopping cycle #${this.cycleCount}`);
      
      // Store current recorders to ensure onstop handlers complete
      const currentMediaRecorder = this.mediaRecorder;
      const currentOriginalRecorder = this.originalRecorder;
      
      // Stop recorders if they're recording
      if (currentMediaRecorder?.state === 'recording') {
        currentMediaRecorder.stop();
      }
      
      if (currentOriginalRecorder?.state === 'recording') {
        currentOriginalRecorder.stop();
      }
      
      // Start new cycle after a delay to ensure processing completes
      if (!this.stopCycleFlag) {
        this.cycleTimeout = setTimeout(() => {
          if (!this.stopCycleFlag) {
            startNewRecordingCycle();
          }
        }, 1000); // Increased delay to ensure chunk processing
      }
    };

    // Start first cycle
    startNewRecordingCycle();
    
    // Set up interval for cycling
    this.processChunkInterval = setInterval(cycleRecording, chunkDuration * 1000);
  }

  /**
   * Process recorded chunk data
   */
  private processChunkRecording(
    chunkId: string,
    chunkRecording: ChunkRecording,
    cycleStartTime: number,
    mimeType: string,
    onChunkProcessed: (chunk: ProcessedChunk) => void
  ): void {
    const processedBlob = new Blob(chunkRecording.processed, { type: mimeType });
    const originalBlob = new Blob(chunkRecording.original, { type: mimeType });
    
    console.log(`📦 ${LOG_PREFIX.CONCAT_STREAM} Created blobs - Processed: ${processedBlob.size} bytes, Original: ${originalBlob.size} bytes`);
    
    // Validate blob sizes - already filtered but double-check
    let isValid = true;
    let errorMessage = '';
    
    if (processedBlob.size === 0 && originalBlob.size === 0) {
      // Both empty - skip this chunk entirely
      console.error(`❌ ${LOG_PREFIX.CONCAT_STREAM} Both blobs are empty, skipping chunk creation`);
      this.chunkRecordings.delete(chunkId);
      return;
    }
    
    if (processedBlob.size < MIN_VALID_BLOB_SIZE || originalBlob.size < MIN_VALID_BLOB_SIZE) {
      isValid = false;
      errorMessage = `Audio too small (Processed: ${processedBlob.size} bytes, Original: ${originalBlob.size} bytes). Recording may be corrupted.`;
      console.error(`❌ ${LOG_PREFIX.CONCAT_STREAM} Invalid blob size in final chunk!`);
    }
    
    // Create URLs if valid
    const processedUrl = isValid ? this.urlManager.createObjectURL(chunkId, processedBlob) : undefined;
    const originalUrl = isValid ? this.urlManager.createObjectURL(chunkId, originalBlob) : undefined;
    
    const cycleEndTime = Date.now();
    const actualDuration = cycleEndTime - cycleStartTime;
    
    // TDD Integration: Get REAL metrics from ChunkProcessor
    const realMetrics = this.getRealMetrics(cycleStartTime, cycleEndTime);
    
    console.log(`🎯 [RECORDING-INTEGRATION] Using real metrics for chunk ${chunkId}: ${realMetrics.averageNoiseReduction.toFixed(1)}% noise reduction`);
    
    // Create chunk with REAL metrics
    const newChunk: ProcessedChunk = {
      id: chunkId,
      startTime: cycleStartTime,
      endTime: cycleEndTime,
      duration: actualDuration,
      processedAudioUrl: processedUrl,
      originalAudioUrl: originalUrl,
      isPlaying: false,
      isExpanded: false,
      isValid,
      errorMessage,
      noiseRemoved: realMetrics.averageNoiseReduction, // REAL noise reduction from audio analysis
      originalSize: originalBlob.size,
      processedSize: processedBlob.size,
      metrics: {
        processingLatency: realMetrics.averageLatency || 0,
        frameCount: realMetrics.totalFrames || Math.floor(actualDuration / 10),
        inputLevel: 1.0,
        outputLevel: processedBlob.size / originalBlob.size,
        noiseReductionLevel: realMetrics.averageNoiseReduction / 100, // Convert to 0-1 range
        timestamp: Date.now(),
        droppedFrames: 0
      }
    };
    
    chunkRecording.finalized = true;
    console.log(`✅ ${LOG_PREFIX.CONCAT_STREAM} Cycle #${this.cycleCount} complete: ${(actualDuration/1000).toFixed(1)}s chunk`);
    
    // TDD Integration: Trigger period completion in ChunkProcessor
    // This will cause ChunkProcessor to emit aggregated metrics for the next chunk
    if ((global as any).__murmurabaTDDBridge?.chunkProcessor) {
      try {
        const aggregatedMetrics = (global as any).__murmurabaTDDBridge.chunkProcessor.completePeriod(actualDuration);
        console.log(`🎯 [TDD-INTEGRATION] Triggered period completion: ${aggregatedMetrics.totalFrames} frames processed`);
      } catch (error) {
        console.warn(`⚠️ [TDD-INTEGRATION] Period completion failed:`, error);
      }
    }
    
    onChunkProcessed(newChunk);
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    console.log(`🛑 ${LOG_PREFIX.CONCAT_STREAM} Stopping concatenated streaming...`);
    
    this.stopCycleFlag = true;
    
    // Clear intervals and timeouts first
    if (this.processChunkInterval) {
      clearInterval(this.processChunkInterval);
      this.processChunkInterval = null;
    }
    
    if (this.cycleTimeout) {
      clearTimeout(this.cycleTimeout);
      this.cycleTimeout = null;
    }
    
    // Stop recorders and wait for final chunks
    const promises: Promise<void>[] = [];
    
    if (this.mediaRecorder?.state === 'recording') {
      const stopPromise = new Promise<void>((resolve) => {
        const originalOnStop = this.mediaRecorder!.onstop;
        this.mediaRecorder!.onstop = (event) => {
          if (originalOnStop && this.mediaRecorder) {
            originalOnStop.call(this.mediaRecorder, event);
          }
          resolve();
        };
        this.mediaRecorder!.stop();
      });
      promises.push(stopPromise);
    }
    
    if (this.originalRecorder?.state === 'recording') {
      this.originalRecorder.stop();
    }
    
    // Wait for all stop handlers to complete before cleanup
    Promise.all(promises).then(() => {
      // Clear recordings after processing
      this.chunkRecordings.clear();
      
      // Reset recorders
      this.mediaRecorder = null;
      this.originalRecorder = null;
      
      console.log(`✅ ${LOG_PREFIX.CONCAT_STREAM} Recording stopped completely`);
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
    if (this.originalRecorder?.state === 'recording') {
      this.originalRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
    if (this.originalRecorder?.state === 'paused') {
      this.originalRecorder.resume();
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording' || this.originalRecorder?.state === 'recording';
  }

  /**
   * Check if recording is paused
   */
  isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused' || this.originalRecorder?.state === 'paused';
  }
}