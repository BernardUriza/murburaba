export declare class AudioStreamManager {
    private audioContext;
    private streams;
    private sources;
    constructor(audioContext: AudioContext);
    addStream(id: string, stream: MediaStream): MediaStreamAudioSourceNode;
    getStream(id: string): MediaStream | undefined;
    getSource(id: string): MediaStreamAudioSourceNode | undefined;
    removeStream(id: string): void;
    removeAllStreams(): void;
    get size(): number;
}
//# sourceMappingURL=AudioStreamManager.d.ts.map