import { ProcessedChunk } from './types';
import { AudioConverter } from '../../utils/audioConverter';
export declare class AudioExporter {
    private audioConverter;
    setAudioConverter(converter: AudioConverter): void;
    /**
     * Export chunk as WAV
     */
    exportChunkAsWav(chunk: ProcessedChunk, audioType: 'processed' | 'original'): Promise<Blob>;
    /**
     * Export chunk as MP3
     */
    exportChunkAsMp3(chunk: ProcessedChunk, audioType: 'processed' | 'original', bitrate?: number): Promise<Blob>;
    /**
     * Download chunk in specified format
     */
    downloadChunk(chunk: ProcessedChunk, format: 'webm' | 'wav' | 'mp3', audioType: 'processed' | 'original'): Promise<void>;
}
//# sourceMappingURL=audioExporter.d.ts.map