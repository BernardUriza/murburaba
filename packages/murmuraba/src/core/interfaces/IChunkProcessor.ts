import { ProcessedChunk, ChunkMetrics } from '../../types';

export interface ChunkProcessorOptions {
  chunkDuration: number;
  overlap?: number;
  enableVAD?: boolean;
  vadThreshold?: number;
}

export interface IChunkProcessor {
  startProcessing(stream: MediaStream, options: ChunkProcessorOptions): Promise<void>;
  stopProcessing(): Promise<void>;
  pauseProcessing(): void;
  resumeProcessing(): void;
  getProcessedChunks(): ProcessedChunk[];
  onChunkProcessed(callback: (chunk: ProcessedChunk) => void): () => void;
  onProcessingComplete(callback: () => void): () => void;
  isProcessing(): boolean;
  getProgress(): { processed: number; total: number };
}
