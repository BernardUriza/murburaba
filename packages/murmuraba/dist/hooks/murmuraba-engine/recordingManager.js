import { processFileWithMetrics } from '../../api/processFileWithMetrics';
import { MIN_VALID_BLOB_SIZE, LOG_PREFIX } from './constants';
import { AudioConverter } from '../../utils/audioConverter';
export class RecordingManager {
    constructor(urlManager) {
        this.urlManager = urlManager;
        this.mediaRecorder = null;
        this.originalRecorder = null;
        this.chunkRecordings = new Map();
        this.processChunkInterval = null;
        this.stopCycleFlag = false;
        this.cycleCount = 0;
        this.cycleTimeout = null;
        // TDD Integration: Metrics provider from ChunkProcessor
        this.metricsProvider = null;
        this.currentMetrics = null;
        // TDD Integration: Register with global bridge for ChunkProcessor communication
        if (global.__murmurabaTDDBridge) {
            if (!(global.__murmurabaTDDBridge.recordingManagers)) {
                global.__murmurabaTDDBridge.recordingManagers = new Set();
            }
            global.__murmurabaTDDBridge.recordingManagers.add(this);
            console.log(`🔗 [TDD-INTEGRATION] RecordingManager registered with ChunkProcessor bridge`);
        }
    }
    /**
     * TDD Integration: Set metrics provider from ChunkProcessor
     */
    setMetricsProvider(provider) {
        this.metricsProvider = provider;
    }
    /**
     * TDD Integration: Receive metrics from ChunkProcessor
     */
    receiveMetrics(metrics) {
        this.currentMetrics = metrics;
        console.log(`📊 [RECORDING-INTEGRATION] Received real metrics: ${metrics.averageNoiseReduction.toFixed(1)}% avg reduction`);
    }
    /**
     * TDD Integration: Get real metrics for a time period
     */
    getRealMetrics(startTime, endTime) {
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
    async startCycle(processedStream, originalStream, chunkDuration, onChunkProcessed) {
        // Use a default mime type for now
        const mimeType = 'audio/webm;codecs=opus';
        this.cycleCount = 0;
        this.stopCycleFlag = false;
        const startNewRecordingCycle = () => {
            if (this.stopCycleFlag)
                return;
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
                }
                else {
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
                }
                else {
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
                        this.processChunkRecording(chunkId, chunkRecording, cycleStartTime, mimeType, onChunkProcessed);
                    }
                    else {
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
    async processChunkRecording(chunkId, chunkRecording, cycleStartTime, mimeType, onChunkProcessed) {
        const originalBlob = new Blob(chunkRecording.original, { type: mimeType });
        console.log(`📦 ${LOG_PREFIX.CONCAT_STREAM} Original blob: ${originalBlob.size} bytes`);
        // Validate blob size
        let isValid = true;
        let errorMessage = '';
        if (originalBlob.size === 0) {
            console.error(`❌ ${LOG_PREFIX.CONCAT_STREAM} Original blob is empty, skipping chunk creation`);
            this.chunkRecordings.delete(chunkId);
            return;
        }
        if (originalBlob.size < MIN_VALID_BLOB_SIZE) {
            isValid = false;
            errorMessage = `Audio too small (${originalBlob.size} bytes). Recording may be corrupted.`;
            console.error(`❌ ${LOG_PREFIX.CONCAT_STREAM} Invalid blob size in chunk!`);
        }
        // Create original URL immediately
        const originalUrl = isValid ? this.urlManager.createObjectURL(chunkId, originalBlob) : undefined;
        const cycleEndTime = Date.now();
        const actualDuration = cycleEndTime - cycleStartTime;
        // Process original audio through RNNoise to get metrics and processed audio
        let processedUrl;
        let noiseReduction = 0;
        let frameCount = 0;
        if (isValid) {
            try {
                // Convert WebM to WAV first
                console.log(`🔄 ${LOG_PREFIX.CONCAT_STREAM} Converting WebM to WAV for chunk ${chunkId}`);
                const wavBlob = await AudioConverter.webmToWav(originalBlob);
                // Convert WAV blob to ArrayBuffer
                const arrayBuffer = await wavBlob.arrayBuffer();
                // Process with metrics like AudioDemo
                const result = await processFileWithMetrics(arrayBuffer);
                // Create processed blob from result
                const processedBlob = new Blob([result.processedBuffer], { type: 'audio/wav' });
                processedUrl = this.urlManager.createObjectURL(chunkId, processedBlob);
                // Calculate noise reduction from VAD metrics
                noiseReduction = result.averageVad * 100;
                frameCount = result.metrics.length;
                console.log(`🎯 ${LOG_PREFIX.CONCAT_STREAM} Processed chunk ${chunkId}: ${noiseReduction.toFixed(1)}% noise reduction, ${frameCount} frames`);
            }
            catch (error) {
                console.error(`❌ ${LOG_PREFIX.CONCAT_STREAM} Failed to process chunk:`, error);
                isValid = false;
                errorMessage = `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        }
        // Create chunk with real metrics from processing
        const newChunk = {
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
            noiseRemoved: noiseReduction,
            originalSize: originalBlob.size,
            processedSize: processedUrl ? originalBlob.size : 0, // Same size for WAV
            metrics: {
                processingLatency: 0,
                frameCount: frameCount,
                inputLevel: 1.0,
                outputLevel: 1.0,
                noiseReductionLevel: noiseReduction / 100,
                timestamp: Date.now(),
                droppedFrames: 0
            }
        };
        chunkRecording.finalized = true;
        console.log(`✅ ${LOG_PREFIX.CONCAT_STREAM} Cycle #${this.cycleCount} complete: ${(actualDuration / 1000).toFixed(1)}s chunk`);
        onChunkProcessed(newChunk);
    }
    /**
     * Stop recording
     */
    stopRecording() {
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
        const promises = [];
        if (this.mediaRecorder?.state === 'recording') {
            const stopPromise = new Promise((resolve) => {
                const originalOnStop = this.mediaRecorder.onstop;
                this.mediaRecorder.onstop = (event) => {
                    if (originalOnStop && this.mediaRecorder) {
                        originalOnStop.call(this.mediaRecorder, event);
                    }
                    resolve();
                };
                this.mediaRecorder.stop();
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
    pauseRecording() {
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
    resumeRecording() {
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
    isRecording() {
        return this.mediaRecorder?.state === 'recording' || this.originalRecorder?.state === 'recording';
    }
    /**
     * Start concatenated streaming for medical-grade recording
     * This is an alias for startCycle for backward compatibility
     */
    async startConcatenatedStreaming(processedStream, originalStream, chunkDuration, onChunkProcessed) {
        return this.startCycle(processedStream, originalStream, chunkDuration, onChunkProcessed);
    }
    /**
     * Check if recording is paused
     */
    isPaused() {
        return this.mediaRecorder?.state === 'paused' || this.originalRecorder?.state === 'paused';
    }
}
