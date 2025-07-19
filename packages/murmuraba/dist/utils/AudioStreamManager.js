export class AudioStreamManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.streams = new Map();
        this.sources = new Map();
    }
    addStream(id, stream) {
        if (this.streams.has(id)) {
            this.removeStream(id);
        }
        this.streams.set(id, stream);
        const source = this.audioContext.createMediaStreamSource(stream);
        this.sources.set(id, source);
        return source;
    }
    getStream(id) {
        return this.streams.get(id);
    }
    getSource(id) {
        return this.sources.get(id);
    }
    removeStream(id) {
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
    removeAllStreams() {
        const ids = Array.from(this.streams.keys());
        ids.forEach(id => this.removeStream(id));
    }
    get size() {
        return this.streams.size;
    }
}
