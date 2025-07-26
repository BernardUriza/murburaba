import { ProcessedChunk, ProcessingMetrics } from '../../types';

export interface AudioProcessingOptions {
  enableVAD?: boolean;
  chunkDuration?: number;
  outputFormat?: 'wav' | 'webm' | 'raw';
  enableAGC?: boolean;
  noiseReductionLevel?: 'low' | 'medium' | 'high' | 'auto';
}

export interface AudioProcessingResult {
  chunks: ProcessedChunk[];
  processedBuffer: ArrayBuffer;
  averageVad: number;
  totalDuration: number;
  metadata: {
    sampleRate: number;
    channels: number;
    originalDuration: number;
  };
}

export interface IAudioProcessor {
  processFile(
    file: File | ArrayBuffer,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult>;
  
  processStream(
    stream: MediaStream,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult>;
  
  processRecording(
    duration: number,
    options?: AudioProcessingOptions
  ): Promise<AudioProcessingResult>;
  
  onProgress(callback: (progress: number) => void): () => void;
  onMetrics(callback: (metrics: ProcessingMetrics) => void): () => void;
  onChunk(callback: (chunk: ProcessedChunk) => void): () => void;
  
  cancel(): void;
  isProcessing(): boolean;
}