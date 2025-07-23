import { getEngine } from '../api';

export interface ProcessingMetrics {
  vad: number;
  frame: number;
  timestamp: number;
  rms: number;
}

export interface ProcessFileWithMetricsResult {
  processedBuffer: ArrayBuffer;
  metrics: ProcessingMetrics[];
  averageVad: number;
}

/**
 * Process audio file and capture VAD metrics frame by frame
 */
export async function processFileWithMetrics(
  arrayBuffer: ArrayBuffer,
  onFrameProcessed?: (metrics: ProcessingMetrics) => void
): Promise<ProcessFileWithMetricsResult> {
  const engine = getEngine();
  const metrics: ProcessingMetrics[] = [];
  let frameCount = 0;
  let totalVad = 0;
  
  // Hook into the engine's frame processing
  const originalProcessFrame = engine['processFrame'].bind(engine);
  engine['processFrame'] = function(frame: Float32Array) {
    const result = originalProcessFrame(frame);
    
    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    const rms = Math.sqrt(sum / frame.length);
    
    const metric: ProcessingMetrics = {
      vad: result.vad,
      frame: frameCount++,
      timestamp: Date.now(),
      rms
    };
    
    metrics.push(metric);
    totalVad += result.vad;
    
    if (onFrameProcessed) {
      onFrameProcessed(metric);
    }
    
    return result;
  };
  
  try {
    // Process the file
    const processedBuffer = await engine.processFile(arrayBuffer);
    
    // Restore original method
    engine['processFrame'] = originalProcessFrame;
    
    const averageVad = metrics.length > 0 ? totalVad / metrics.length : 0;
    
    return {
      processedBuffer,
      metrics,
      averageVad
    };
  } catch (error) {
    // Restore original method on error
    engine['processFrame'] = originalProcessFrame;
    throw error;
  }
}