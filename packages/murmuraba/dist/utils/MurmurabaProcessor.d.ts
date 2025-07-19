import { AudioEngine, ProcessingMetrics } from '../engines/types';
export declare class MurmurabaProcessor {
    private frameSize;
    private audioContext;
    private processor;
    private engine;
    private inputBuffer;
    private outputBuffer;
    private metrics;
    constructor(frameSize?: number);
    initialize(engine: AudioEngine, sampleRate?: number): Promise<void>;
    private processAudio;
    private calculateRMS;
    connectStream(stream: MediaStream): MediaStreamAudioDestinationNode;
    getMetrics(): ProcessingMetrics;
    resetMetrics(): void;
    cleanup(): void;
}
//# sourceMappingURL=MurmurabaProcessor.d.ts.map