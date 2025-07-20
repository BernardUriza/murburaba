/**
 * Audio Format Converter Utility
 * Converts WebM/Opus audio to WAV format for universal browser playback
 */

export class AudioConverter {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  /**
   * Convert a Blob from WebM/Opus to WAV format
   */
  async convertToWav(blob: Blob): Promise<Blob> {
    try {
      // First, try to decode the audio data
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV
      const wavBlob = this.audioBufferToWav(audioBuffer);
      return wavBlob;
    } catch (error) {
      console.error('Failed to convert audio:', error);
      // Return original blob if conversion fails
      return blob;
    }
  }
  
  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
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
  static canPlayType(mimeType: string): boolean {
    const audio = new Audio();
    const canPlay = audio.canPlayType(mimeType);
    return canPlay === 'probably' || canPlay === 'maybe';
  }
  
  /**
   * Get the best supported audio format for recording
   */
  static getBestRecordingFormat(): string {
    // Prefer formats with better browser playback support
    const formats = [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus'
    ];
    
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format) && this.canPlayType(format)) {
        return format;
      }
    }
    
    // Fallback to any supported format
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) {
        return format;
      }
    }
    
    return 'audio/webm'; // Final fallback
  }
  
  /**
   * Convert blob URL to WAV blob URL
   */
  async convertBlobUrl(blobUrl: string): Promise<string> {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      
      // Always convert to WAV for maximum compatibility
      console.log('Converting audio from', blob.type, 'to WAV');
      
      const wavBlob = await this.convertToWav(blob);
      const wavUrl = URL.createObjectURL(wavBlob);
      
      console.log('Audio converted successfully to WAV');
      return wavUrl;
    } catch (error) {
      console.error('Error converting blob URL:', error);
      // Return original URL as fallback
      return blobUrl;
    }
  }
}

// Singleton instance
let converterInstance: AudioConverter | null = null;

export function getAudioConverter(): AudioConverter {
  if (!converterInstance) {
    converterInstance = new AudioConverter();
  }
  return converterInstance;
}