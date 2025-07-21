import { AudioConverter } from '../../utils/audioConverter';
import { DEFAULT_MP3_BITRATE, LOG_PREFIX } from './constants';
export class AudioExporter {
    constructor() {
        this.audioConverter = null;
    }
    setAudioConverter(converter) {
        this.audioConverter = converter;
    }
    /**
     * Export chunk as WAV
     */
    async exportChunkAsWav(chunk, audioType) {
        const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl;
        if (!audioUrl) {
            throw new Error(`No ${audioType} audio URL available for chunk ${chunk.id}`);
        }
        console.log(`📦 ${LOG_PREFIX.EXPORT} Exporting chunk ${chunk.id} as WAV (${audioType})...`);
        const response = await fetch(audioUrl);
        const webmBlob = await response.blob();
        if (!this.audioConverter) {
            throw new Error('Audio converter not initialized');
        }
        return AudioConverter.webmToWav(webmBlob);
    }
    /**
     * Export chunk as MP3
     */
    async exportChunkAsMp3(chunk, audioType, bitrate = DEFAULT_MP3_BITRATE) {
        const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl;
        if (!audioUrl) {
            throw new Error(`No ${audioType} audio URL available for chunk ${chunk.id}`);
        }
        console.log(`📦 ${LOG_PREFIX.EXPORT} Exporting chunk ${chunk.id} as MP3 (${audioType}, ${bitrate}kbps)...`);
        const response = await fetch(audioUrl);
        const webmBlob = await response.blob();
        return AudioConverter.webmToMp3(webmBlob, bitrate);
    }
    /**
     * Download chunk in specified format
     */
    async downloadChunk(chunk, format, audioType) {
        let blob;
        let filename;
        const timestamp = new Date(chunk.startTime).toISOString().replace(/:/g, '-').split('.')[0];
        const prefix = audioType === 'processed' ? 'enhanced' : 'original';
        if (format === 'webm') {
            const audioUrl = audioType === 'processed' ? chunk.processedAudioUrl : chunk.originalAudioUrl;
            if (!audioUrl) {
                throw new Error(`No ${audioType} audio URL available`);
            }
            const response = await fetch(audioUrl);
            blob = await response.blob();
            filename = `${prefix}_${timestamp}.webm`;
        }
        else if (format === 'wav') {
            blob = await this.exportChunkAsWav(chunk, audioType);
            filename = `${prefix}_${timestamp}.wav`;
        }
        else if (format === 'mp3') {
            blob = await this.exportChunkAsMp3(chunk, audioType);
            filename = `${prefix}_${timestamp}.mp3`;
        }
        else {
            throw new Error(`Unsupported format: ${format}`);
        }
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        console.log(`✅ ${LOG_PREFIX.EXPORT} Downloaded ${filename}`);
    }
}
