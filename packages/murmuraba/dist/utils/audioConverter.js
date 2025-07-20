/**
 * Audio Format Converter Utility
 * Converts WebM/Opus audio to WAV format for universal browser playback
 */
export class AudioConverter {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    /**
     * Convert a Blob from WebM/Opus to WAV format
     */
    async convertToWav(blob) {
        try {
            // First, try to decode the audio data
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
            // Convert to WAV
            const wavBlob = this.audioBufferToWav(audioBuffer);
            console.log('Successfully converted to WAV, size:', wavBlob.size);
            return wavBlob;
        }
        catch (error) {
            console.error('Failed to convert audio:', error);
            throw error;
        }
    }
    /**
     * Convert AudioBuffer to WAV format
     */
    audioBufferToWav(audioBuffer) {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numberOfChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        // RIFF chunk descriptor
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(8, 'WAVE');
        // FMT sub-chunk
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true); // AudioFormat (PCM)
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * numberOfChannels * 2, true); // ByteRate
        view.setUint16(32, numberOfChannels * 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        // Data sub-chunk
        writeString(36, 'data');
        view.setUint32(40, length, true);
        // Write interleaved PCM samples
        let offset = 44;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = audioBuffer.getChannelData(channel)[i];
                const int16 = Math.max(-32768, Math.min(32767, sample * 32768));
                view.setInt16(offset, int16, true);
                offset += 2;
            }
        }
        return new Blob([buffer], { type: 'audio/wav' });
    }
    /**
     * Check if a MIME type is supported for playback
     */
    static canPlayType(mimeType) {
        const audio = new Audio();
        const canPlay = audio.canPlayType(mimeType);
        return canPlay === 'probably' || canPlay === 'maybe';
    }
    /**
     * Get the best supported audio format for recording
     */
    static getBestRecordingFormat() {
        // Try to use WAV if supported by MediaRecorder (rare)
        if (MediaRecorder.isTypeSupported('audio/wav') && this.canPlayType('audio/wav')) {
            return 'audio/wav';
        }
        // Test formats that can both record AND play
        const formats = [
            'audio/webm', // Most compatible WebM
            'audio/webm;codecs=opus', // WebM with Opus codec
            'audio/mp4', // Fallback for Safari/iOS
            'audio/ogg', // Alternative format
            'audio/ogg;codecs=opus' // Ogg with Opus
        ];
        // Find a format that can both record AND play
        for (const format of formats) {
            if (MediaRecorder.isTypeSupported(format) && this.canPlayType(format)) {
                console.log(`Selected recording format: ${format} (can record: yes, can play: yes)`);
                return format;
            }
        }
        // If no format supports both, log what's happening
        console.warn('No format supports both recording and playback!');
        for (const format of formats) {
            const canRecord = MediaRecorder.isTypeSupported(format);
            const canPlay = this.canPlayType(format);
            console.log(`${format} - can record: ${canRecord}, can play: ${canPlay}`);
        }
        // Last resort: use any supported recording format
        for (const format of formats) {
            if (MediaRecorder.isTypeSupported(format)) {
                console.warn(`Using ${format} for recording (playback may fail)`);
                return format;
            }
        }
        return 'audio/webm'; // Final fallback
    }
    /**
     * Convert blob URL to WAV blob URL
     */
    async convertBlobUrl(blobUrl) {
        try {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            // Check if already WAV
            if (blob.type === 'audio/wav') {
                console.log('Audio is already WAV format');
                return blobUrl;
            }
            // Always convert to WAV for maximum compatibility
            console.log('Converting audio from', blob.type, 'to WAV, blob size:', blob.size);
            const wavBlob = await this.convertToWav(blob);
            const wavUrl = URL.createObjectURL(wavBlob);
            console.log('Audio converted successfully to WAV, new size:', wavBlob.size);
            return wavUrl;
        }
        catch (error) {
            console.error('Error converting blob URL:', error);
            console.error('Falling back to original URL');
            // Return original URL as fallback
            return blobUrl;
        }
    }
}
// Singleton instance
let converterInstance = null;
export function getAudioConverter() {
    if (!converterInstance) {
        converterInstance = new AudioConverter();
    }
    return converterInstance;
}
