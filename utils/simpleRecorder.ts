/**
 * Simple WAV Recorder using ScriptProcessorNode
 * This provides a fallback recording method that outputs WAV directly
 */

export class SimpleWAVRecorder {
  private audioContext: AudioContext;
  private processor?: ScriptProcessorNode;
  private source?: MediaStreamAudioSourceNode;
  private recording = false;
  private recordedChunks: Float32Array[] = [];
  private sampleRate: number;
  
  constructor(sampleRate = 48000) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
    this.sampleRate = sampleRate;
  }
  
  async startRecording(stream: MediaStream) {
    this.recordedChunks = [];
    this.recording = true;
    
    // Create audio nodes
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    // Process audio
    this.processor.onaudioprocess = (e) => {
      if (!this.recording) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      // Clone the data since the buffer is reused
      const chunk = new Float32Array(inputData.length);
      chunk.set(inputData);
      this.recordedChunks.push(chunk);
    };
    
    // Connect nodes
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }
  
  stopRecording(): Blob {
    this.recording = false;
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = undefined;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = undefined;
    }
    
    // Combine all chunks
    const totalLength = this.recordedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedData = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.recordedChunks) {
      combinedData.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to WAV
    return this.encodeWAV(combinedData);
  }
  
  private encodeWAV(samples: Float32Array): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw pcm)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, this.sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, this.sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);
    
    // write the PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}