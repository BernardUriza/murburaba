import { EventEmitter } from '../core/EventEmitter';
export class ChunkProcessor extends EventEmitter {
    constructor(sampleRate, config, logger, metricsManager) {
        super();
        this.currentChunk = [];
        this.chunkStartTime = 0;
        this.chunkIndex = 0;
        this.currentSampleCount = 0;
        this.overlapBuffer = [];
        // Metrics accumulation for TDD integration
        this.accumulatedMetrics = {
            totalNoiseReduction: 0,
            frameCount: 0,
            totalLatency: 0,
            periodStartTime: null
        };
        this.logger = logger;
        this.sampleRate = sampleRate;
        this.metricsManager = metricsManager;
        this.config = {
            chunkDuration: config.chunkDuration,
            onChunkProcessed: config.onChunkProcessed || undefined,
            overlap: config.overlap || 0,
        };
        // Calculate samples per chunk
        this.samplesPerChunk = Math.floor((this.config.chunkDuration / 1000) * this.sampleRate);
        this.logger.info(`ChunkProcessor initialized:`, {
            sampleRate: this.sampleRate,
            chunkDuration: this.config.chunkDuration,
            samplesPerChunk: this.samplesPerChunk,
            overlap: this.config.overlap,
        });
    }
    /**
     * Add samples to the current chunk
     */
    addSamples(samples) {
        // Initialize start time on first sample with high-resolution timer
        if (this.chunkStartTime === 0) {
            this.chunkStartTime = performance.now();
        }
        this.currentChunk.push(new Float32Array(samples));
        this.currentSampleCount += samples.length;
        // Check if we have enough samples for a chunk
        while (this.currentSampleCount >= this.samplesPerChunk) {
            this.processCurrentChunk();
        }
    }
    /**
     * Process the current chunk
     */
    processCurrentChunk() {
        const chunkId = `chunk-${this.chunkIndex++}`;
        const endTime = performance.now();
        // Combine all samples into a single array
        const totalSamples = this.extractChunkSamples();
        // Apply overlap if configured
        const processedSamples = this.applyOverlap(totalSamples);
        // Create chunk object
        const chunk = {
            id: chunkId,
            data: processedSamples,
            startTime: this.chunkStartTime,
            endTime: endTime,
            sampleRate: this.sampleRate,
            channelCount: 1,
        };
        // Emit chunk ready event
        this.emit('chunk-ready', chunk);
        // Calculate and emit metrics
        this.emitChunkMetrics(chunk, totalSamples, processedSamples);
        // Reset for next chunk
        this.chunkStartTime = endTime;
    }
    /**
     * Extract samples for current chunk
     */
    extractChunkSamples() {
        const result = new Float32Array(this.samplesPerChunk);
        let offset = 0;
        let remainingSamples = this.samplesPerChunk;
        while (remainingSamples > 0 && this.currentChunk.length > 0) {
            const buffer = this.currentChunk[0];
            const samplesToTake = Math.min(remainingSamples, buffer.length);
            // Copy samples
            result.set(buffer.subarray(0, samplesToTake), offset);
            offset += samplesToTake;
            remainingSamples -= samplesToTake;
            if (samplesToTake === buffer.length) {
                // Used entire buffer
                this.currentChunk.shift();
            }
            else {
                // Partial buffer used, keep remainder
                this.currentChunk[0] = buffer.subarray(samplesToTake);
            }
        }
        this.currentSampleCount -= this.samplesPerChunk;
        return result;
    }
    /**
     * Apply overlap window to smooth chunk transitions
     */
    applyOverlap(samples) {
        if (this.config.overlap === 0) {
            return samples;
        }
        const overlapSamples = Math.floor(this.samplesPerChunk * this.config.overlap);
        const result = new Float32Array(samples.length);
        // Copy main samples
        result.set(samples);
        // Apply overlap from previous chunk
        if (this.overlapBuffer.length > 0) {
            const previousOverlap = this.combineBuffers(this.overlapBuffer);
            const fadeLength = Math.min(overlapSamples, previousOverlap.length);
            // Crossfade between chunks
            for (let i = 0; i < fadeLength; i++) {
                const fadeIn = i / fadeLength;
                const fadeOut = 1 - fadeIn;
                result[i] = result[i] * fadeIn + previousOverlap[i] * fadeOut;
            }
        }
        // Save overlap for next chunk
        this.overlapBuffer = [samples.subarray(samples.length - overlapSamples)];
        return result;
    }
    /**
     * Calculate and emit chunk metrics
     */
    emitChunkMetrics(chunk, originalSamples, processedSamples) {
        // Calculate metrics
        const originalRMS = this.metricsManager.calculateRMS(originalSamples);
        const processedRMS = this.metricsManager.calculateRMS(processedSamples);
        const originalPeak = this.metricsManager.calculatePeak(originalSamples);
        const processedPeak = this.metricsManager.calculatePeak(processedSamples);
        const noiseRemoved = originalRMS > 0
            ? ((originalRMS - processedRMS) / originalRMS) * 100
            : 0;
        const metrics = {
            originalSize: originalSamples.length * 4, // Float32 = 4 bytes
            processedSize: processedSamples.length * 4,
            noiseRemoved: Math.max(0, Math.min(100, noiseRemoved)),
            metrics: {
                noiseReductionLevel: noiseRemoved,
                processingLatency: chunk.endTime - chunk.startTime,
                inputLevel: originalPeak,
                outputLevel: processedPeak,
                timestamp: chunk.endTime,
                frameCount: Math.floor(processedSamples.length / 480), // RNNoise frame size
                droppedFrames: 0,
            },
            duration: this.config.chunkDuration,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
        };
        // Record metrics in metrics manager
        this.metricsManager.recordChunk(metrics);
        // Emit to listeners
        this.emit('chunk-processed', metrics);
        // Call user callback if provided
        if (this.config.onChunkProcessed) {
            try {
                this.config.onChunkProcessed(metrics);
            }
            catch (error) {
                this.logger.error('Error in chunk processed callback:', error);
            }
        }
        this.logger.debug(`Chunk ${chunk.id} processed:`, {
            duration: `${metrics.duration}ms`,
            noiseRemoved: `${metrics.noiseRemoved.toFixed(1)}%`,
            latency: `${metrics.metrics.processingLatency}ms`,
        });
    }
    /**
     * Force process remaining samples as final chunk
     */
    flush() {
        if (this.currentSampleCount > 0) {
            this.logger.info(`Flushing final chunk with ${this.currentSampleCount} samples`);
            // Pad with silence if needed
            const remainingSamples = this.samplesPerChunk - this.currentSampleCount;
            if (remainingSamples > 0) {
                this.addSamples(new Float32Array(remainingSamples));
            }
            this.processCurrentChunk();
        }
        this.reset();
    }
    /**
     * Reset the processor
     */
    reset() {
        this.currentChunk = [];
        this.overlapBuffer = [];
        this.currentSampleCount = 0;
        this.chunkIndex = 0;
        this.chunkStartTime = Date.now();
        this.logger.debug('ChunkProcessor reset');
    }
    /**
     * Combine multiple buffers into one
     */
    combineBuffers(buffers) {
        const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const buffer of buffers) {
            result.set(buffer, offset);
            offset += buffer.length;
        }
        return result;
    }
    /**
     * Get current buffer status
     */
    getStatus() {
        return {
            currentSampleCount: this.currentSampleCount,
            samplesPerChunk: this.samplesPerChunk,
            chunkIndex: this.chunkIndex,
            bufferFillPercentage: (this.currentSampleCount / this.samplesPerChunk) * 100,
        };
    }
    /**
     * TDD Integration: Process individual frame and accumulate metrics
     * This allows RecordingManager integration with real-time metrics
     */
    async processFrame(originalFrame, timestamp, processedFrame) {
        // Set period start time on first frame
        if (this.accumulatedMetrics.periodStartTime === null) {
            this.accumulatedMetrics.periodStartTime = timestamp;
        }
        // Use processedFrame if provided, otherwise assume no processing (original = processed)
        const processed = processedFrame || originalFrame;
        // Calculate noise reduction for this frame
        const originalRMS = this.metricsManager.calculateRMS(originalFrame);
        const processedRMS = this.metricsManager.calculateRMS(processed);
        const frameNoiseReduction = originalRMS > 0
            ? ((originalRMS - processedRMS) / originalRMS) * 100
            : 0;
        // Accumulate metrics
        this.accumulatedMetrics.totalNoiseReduction += Math.max(0, Math.min(100, frameNoiseReduction));
        this.accumulatedMetrics.frameCount++;
        this.accumulatedMetrics.totalLatency += 0.01; // Assume ~0.01ms per frame processing
        // Emit frame-processed event for temporal tracking
        this.emit('frame-processed', timestamp);
        this.logger.debug(`Frame processed: ${frameNoiseReduction.toFixed(1)}% reduction at ${timestamp}ms`);
    }
    /**
     * TDD Integration: Complete current period and emit aggregated metrics
     * This is called when RecordingManager finishes a recording chunk
     */
    completePeriod(duration) {
        const endTime = Date.now();
        const startTime = this.accumulatedMetrics.periodStartTime || (endTime - duration);
        const aggregatedMetrics = {
            averageNoiseReduction: this.accumulatedMetrics.frameCount > 0
                ? this.accumulatedMetrics.totalNoiseReduction / this.accumulatedMetrics.frameCount
                : 0,
            totalFrames: this.accumulatedMetrics.frameCount,
            averageLatency: this.accumulatedMetrics.frameCount > 0
                ? this.accumulatedMetrics.totalLatency / this.accumulatedMetrics.frameCount
                : 0,
            periodDuration: duration,
            startTime,
            endTime
        };
        this.logger.info(`Period complete: ${aggregatedMetrics.totalFrames} frames, ${aggregatedMetrics.averageNoiseReduction.toFixed(1)}% avg reduction`);
        // Emit period-complete event
        this.emit('period-complete', aggregatedMetrics);
        // Reset accumulator for next period
        this.resetAccumulator();
        return aggregatedMetrics;
    }
    /**
     * Reset metrics accumulator for new period
     */
    resetAccumulator() {
        this.accumulatedMetrics = {
            totalNoiseReduction: 0,
            frameCount: 0,
            totalLatency: 0,
            periodStartTime: null
        };
    }
    /**
     * Get current accumulated metrics without completing the period
     */
    getCurrentAccumulatedMetrics() {
        if (this.accumulatedMetrics.frameCount === 0) {
            return null;
        }
        const currentTime = Date.now();
        const startTime = this.accumulatedMetrics.periodStartTime || currentTime;
        return {
            averageNoiseReduction: this.accumulatedMetrics.totalNoiseReduction / this.accumulatedMetrics.frameCount,
            totalFrames: this.accumulatedMetrics.frameCount,
            averageLatency: this.accumulatedMetrics.totalLatency / this.accumulatedMetrics.frameCount,
            periodDuration: currentTime - startTime,
            startTime,
            endTime: currentTime
        };
    }
}
