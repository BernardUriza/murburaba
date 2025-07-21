/**
 * Optimized Audio Converter with caching and worker support
 * Because the original was garbage that blocked the main thread
 */

import { AudioCache, getBlobHash } from './performance';

// Lazy load heavy dependencies
let lamejsModule: any = null;
const loadLamejs = async () => {
  if (!lamejsModule) {
    lamejsModule = await import('lamejs');
  }
  return lamejsModule;
};

export class OptimizedAudioConverter {
  private static instance: OptimizedAudioConverter;
  private audioContext: AudioContext;
  private cache: AudioCache;
  private conversionQueue: Map<string, Promise<Blob>>;
  
  private constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.cache = new AudioCache(50, 30); // 50 items, 30 min TTL
    this.conversionQueue = new Map();
  }
  
  static getInstance(): OptimizedAudioConverter {
    if (!OptimizedAudioConverter.instance) {
      OptimizedAudioConverter.instance = new OptimizedAudioConverter();
    }
    return OptimizedAudioConverter.instance;
  }
  
  /**
   * Convert to WAV with caching and deduplication
   */
  async convertToWav(blob: Blob): Promise<Blob> {
    // Check cache first
    const hash = await getBlobHash(blob);
    const cached = this.cache.get(hash);
    if (cached) {
      console.log('WAV conversion cache hit');
      return cached;
    }
    
    // Check if already converting this blob
    if (this.conversionQueue.has(hash)) {
      console.log('WAV conversion already in progress, waiting...');
      return this.conversionQueue.get(hash)!;
    }
    
    // Start conversion
    const conversionPromise = this.performWavConversion(blob);
    this.conversionQueue.set(hash, conversionPromise);
    
    try {
      const result = await conversionPromise;
      this.cache.set(hash, result);
      return result;
    } finally {
      this.conversionQueue.delete(hash);
    }
  }
  
  /**
   * Actual WAV conversion logic
   */
  private async performWavConversion(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    
    // Use a copy to avoid detached buffer issues
    const bufferCopy = arrayBuffer.slice(0);
    const audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
    
    // Use optimized WAV encoding
    return this.encodeWavOptimized(audioBuffer);
  }
  
  /**
   * Optimized WAV encoder using TypedArrays efficiently
   */
  private encodeWavOptimized(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    // Calculate sizes
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBuffer.length * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // Write RIFF header
    const encoder = new WavEncoder(view);
    encoder.writeString(0, 'RIFF');
    encoder.writeUint32(4, 36 + dataSize);
    encoder.writeString(8, 'WAVE');
    
    // Write fmt chunk
    encoder.writeString(12, 'fmt ');
    encoder.writeUint32(16, 16); // fmt chunk size
    encoder.writeUint16(20, format);
    encoder.writeUint16(22, numberOfChannels);
    encoder.writeUint32(24, sampleRate);
    encoder.writeUint32(28, byteRate);
    encoder.writeUint16(32, blockAlign);
    encoder.writeUint16(34, bitDepth);
    
    // Write data chunk
    encoder.writeString(36, 'data');
    encoder.writeUint32(40, dataSize);
    
    // Optimized interleaving using pre-allocated buffer
    const int16Buffer = new Int16Array(buffer, 44);
    let writeIndex = 0;
    
    // Get all channel data at once
    const channelData = Array.from({ length: numberOfChannels }, 
      (_, i) => audioBuffer.getChannelData(i)
    );
    
    // Interleave samples
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        int16Buffer[writeIndex++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  /**
   * Convert to MP3 with Web Worker support
   */
  async convertToMp3(blob: Blob, bitrate: number = 128): Promise<Blob> {
    // Check cache
    const hash = await getBlobHash(blob);
    const cacheKey = `${hash}-mp3-${bitrate}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Check if Worker is available
    if (typeof Worker !== 'undefined' && window.location.protocol !== 'file:') {
      try {
        return await this.convertToMp3InWorker(blob, bitrate);
      } catch (e) {
        console.warn('Worker MP3 conversion failed, falling back to main thread:', e);
      }
    }
    
    // Fallback to main thread
    const result = await this.convertToMp3MainThread(blob, bitrate);
    this.cache.set(cacheKey, result);
    return result;
  }
  
  /**
   * MP3 conversion in main thread (fallback)
   */
  private async convertToMp3MainThread(blob: Blob, bitrate: number): Promise<Blob> {
    const lamejs = await loadLamejs();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    // Use mono for better performance
    const samples = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    
    // Convert float32 to int16 more efficiently
    const pcmData = new Int16Array(samples);
    for (let i = 0; i < samples; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = s * (s < 0 ? 0x8000 : 0x7FFF);
    }
    
    // Encode with larger block size for efficiency
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, bitrate);
    const blockSize = 1152 * 4; // Larger blocks = fewer iterations
    const mp3Chunks: Int8Array[] = [];
    
    for (let i = 0; i < samples; i += blockSize) {
      const chunk = pcmData.subarray(i, Math.min(i + blockSize, samples));
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) mp3Chunks.push(mp3buf);
    }
    
    // Flush
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Chunks.push(mp3buf);
    
    // Combine efficiently
    const totalLength = mp3Chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of mp3Chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new Blob([output], { type: 'audio/mp3' });
  }
  
  /**
   * MP3 conversion using Web Worker
   */
  private async convertToMp3InWorker(blob: Blob, bitrate: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/audio-converter.worker.js');
      
      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.blob);
        }
        worker.terminate();
      };
      
      worker.onerror = (error) => {
        reject(error);
        worker.terminate();
      };
      
      worker.postMessage({ blob, bitrate, type: 'mp3' });
    });
  }
  
  /**
   * Get best recording format (simplified)
   */
  static getBestRecordingFormat(): string {
    // Prefer webm for better compatibility
    const formats = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        return format;
      }
    }
    
    // Fallback
    return 'audio/webm';
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.cache.clear();
    this.conversionQueue.clear();
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

/**
 * Helper class for WAV encoding
 */
class WavEncoder {
  constructor(private view: DataView) {}
  
  writeString(offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      this.view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
  
  writeUint32(offset: number, value: number): void {
    this.view.setUint32(offset, value, true);
  }
  
  writeUint16(offset: number, value: number): void {
    this.view.setUint16(offset, value, true);
  }
}

// Export singleton getter
export function getOptimizedAudioConverter(): OptimizedAudioConverter {
  return OptimizedAudioConverter.getInstance();
}