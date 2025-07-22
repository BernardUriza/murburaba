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

  constructor(private urlManager: URLManager) {}

  /**
   * Start concatenated streaming for medical-grade recording
   */
  async startConcatenatedStreaming(
    processedStream: MediaStream,
    originalStream: MediaStream,
    mimeType: string,
    chunkDuration: number,
    onChunkReady: (chunk: ProcessedChunk) => void
  ): Promise<void> {
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
        const chunkRecording = this.chunkRecordings.get(chunkId);
        if (chunkRecording) {
          // Only process if we have valid data
          if (chunkRecording.processed.length > 0 || chunkRecording.original.length > 0) {
            this.processChunkRecording(
              chunkId,
              chunkRecording,
              cycleStartTime,
              mimeType,
              onChunkReady
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
      if (this.stopCycleFlag) return;
      
      console.log(`⏹️ ${LOG_PREFIX.CONCAT_STREAM} Stopping cycle #${this.cycleCount}`);
      
      if (this.mediaRecorder?.state === 'recording') {
        this.mediaRecorder.stop();
      }
      
      if (this.originalRecorder?.state === 'recording') {
        this.originalRecorder.stop();
      }
      
      // Start new cycle after a small delay
      setTimeout(startNewRecordingCycle, 500);
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
    onChunkReady: (chunk: ProcessedChunk) => void
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
    
    // Create chunk
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
      noiseRemoved: originalBlob.size > 0 ? 
        ((originalBlob.size - processedBlob.size) / originalBlob.size * 100) : 0,
      originalSize: originalBlob.size,
      processedSize: processedBlob.size,
      metrics: {
        processingLatency: Date.now() - cycleStartTime - actualDuration,
        frameCount: Math.floor(actualDuration / 10),
        inputLevel: 1.0,
        outputLevel: processedBlob.size / originalBlob.size,
        noiseReductionLevel: Math.max(0, Math.min(1, 
          (originalBlob.size - processedBlob.size) / originalBlob.size)),
        timestamp: Date.now(),
        droppedFrames: 0
      }
    };
    
    chunkRecording.finalized = true;
    console.log(`✅ ${LOG_PREFIX.CONCAT_STREAM} Cycle #${this.cycleCount} complete: ${(actualDuration/1000).toFixed(1)}s chunk`);
    
    onChunkReady(newChunk);
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    console.log(`🛑 ${LOG_PREFIX.CONCAT_STREAM} Stopping concatenated streaming...`);
    
    this.stopCycleFlag = true;
    
    if (this.processChunkInterval) {
      clearInterval(this.processChunkInterval);
      this.processChunkInterval = null;
    }
    
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    if (this.originalRecorder?.state === 'recording') {
      this.originalRecorder.stop();
    }
    
    // Clear recordings
    this.chunkRecordings.clear();
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
}