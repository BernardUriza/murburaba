export class AudioStreamManager {
  private streams: Map<string, MediaStream> = new Map();
  private sources: Map<string, MediaStreamAudioSourceNode> = new Map();
  
  constructor(private audioContext: AudioContext) {}

  addStream(id: string, stream: MediaStream): MediaStreamAudioSourceNode {
    if (this.streams.has(id)) {
      this.removeStream(id);
    }
    
    this.streams.set(id, stream);
    const source = this.audioContext.createMediaStreamSource(stream);
    this.sources.set(id, source);
    
    return source;
  }

  getStream(id: string): MediaStream | undefined {
    return this.streams.get(id);
  }

  getSource(id: string): MediaStreamAudioSourceNode | undefined {
    return this.sources.get(id);
  }

  removeStream(id: string): void {
    const stream = this.streams.get(id);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.streams.delete(id);
    }
    
    const source = this.sources.get(id);
    if (source) {
      source.disconnect();
      this.sources.delete(id);
    }
  }

  removeAllStreams(): void {
    const ids = Array.from(this.streams.keys());
    ids.forEach(id => this.removeStream(id));
  }

  get size(): number {
    return this.streams.size;
  }
}