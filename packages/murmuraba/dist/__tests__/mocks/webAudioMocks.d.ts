export declare const createMockAudioContext: () => {
    currentTime: number;
    sampleRate: number;
    state: AudioContextState;
    baseLatency: number;
    outputLatency: number;
    destination: {
        maxChannelCount: number;
        numberOfInputs: number;
        numberOfOutputs: number;
        channelCount: number;
        channelCountMode: ChannelCountMode;
        channelInterpretation: ChannelInterpretation;
    };
    listener: {
        positionX: {
            value: number;
        };
        positionY: {
            value: number;
        };
        positionZ: {
            value: number;
        };
        forwardX: {
            value: number;
        };
        forwardY: {
            value: number;
        };
        forwardZ: {
            value: number;
        };
        upX: {
            value: number;
        };
        upY: {
            value: number;
        };
        upZ: {
            value: number;
        };
    };
    createGain: import("vitest").Mock<() => {
        gain: {
            value: number;
            setValueAtTime: import("vitest").Mock<(...args: any[]) => any>;
            linearRampToValueAtTime: import("vitest").Mock<(...args: any[]) => any>;
            exponentialRampToValueAtTime: import("vitest").Mock<(...args: any[]) => any>;
            setTargetAtTime: import("vitest").Mock<(...args: any[]) => any>;
            setValueCurveAtTime: import("vitest").Mock<(...args: any[]) => any>;
            cancelScheduledValues: import("vitest").Mock<(...args: any[]) => any>;
            cancelAndHoldAtTime: import("vitest").Mock<(...args: any[]) => any>;
        };
        connect: import("vitest").Mock<(...args: any[]) => any>;
        disconnect: import("vitest").Mock<(...args: any[]) => any>;
        numberOfInputs: number;
        numberOfOutputs: number;
        channelCount: number;
        channelCountMode: ChannelCountMode;
        channelInterpretation: ChannelInterpretation;
        context: any;
    }>;
    createAnalyser: import("vitest").Mock<() => {
        fftSize: number;
        frequencyBinCount: number;
        minDecibels: number;
        maxDecibels: number;
        smoothingTimeConstant: number;
        getByteFrequencyData: import("vitest").Mock<(array: Uint8Array) => void>;
        getByteTimeDomainData: import("vitest").Mock<(array: Uint8Array) => void>;
        getFloatFrequencyData: import("vitest").Mock<(...args: any[]) => any>;
        getFloatTimeDomainData: import("vitest").Mock<(...args: any[]) => any>;
        connect: import("vitest").Mock<(...args: any[]) => any>;
        disconnect: import("vitest").Mock<(...args: any[]) => any>;
    }>;
    createScriptProcessor: import("vitest").Mock<() => {
        bufferSize: number;
        numberOfInputs: number;
        numberOfOutputs: number;
        onaudioprocess: any;
        connect: import("vitest").Mock<(...args: any[]) => any>;
        disconnect: import("vitest").Mock<(...args: any[]) => any>;
    }>;
    createMediaStreamSource: import("vitest").Mock<() => {
        connect: import("vitest").Mock<(...args: any[]) => any>;
        disconnect: import("vitest").Mock<(...args: any[]) => any>;
        mediaStream: null;
    }>;
    createBuffer: import("vitest").Mock<(channels: number, length: number, sampleRate: number) => {
        numberOfChannels: number;
        length: number;
        sampleRate: number;
        duration: number;
        getChannelData: import("vitest").Mock<() => Float32Array<ArrayBuffer>>;
    }>;
    decodeAudioData: import("vitest").Mock<(...args: any[]) => any>;
    close: import("vitest").Mock<(...args: any[]) => any>;
    suspend: import("vitest").Mock<(...args: any[]) => any>;
    resume: import("vitest").Mock<(...args: any[]) => any>;
    addEventListener: import("vitest").Mock<(...args: any[]) => any>;
    removeEventListener: import("vitest").Mock<(...args: any[]) => any>;
    dispatchEvent: import("vitest").Mock<(...args: any[]) => any>;
};
export declare class MockMediaStream implements MediaStream {
    active: boolean;
    id: string;
    private tracks;
    constructor(tracks?: MediaStreamTrack[]);
    getTracks(): MediaStreamTrack[];
    getAudioTracks(): MediaStreamTrack[];
    getVideoTracks(): MediaStreamTrack[];
    addTrack(track: MediaStreamTrack): void;
    removeTrack(track: MediaStreamTrack): void;
    clone(): MediaStream;
    getTrackById(id: string): MediaStreamTrack | null;
    addEventListener: import("vitest").Mock<(...args: any[]) => any>;
    removeEventListener: import("vitest").Mock<(...args: any[]) => any>;
    dispatchEvent: import("vitest").Mock<(...args: any[]) => any>;
    onaddtrack: null;
    onremovetrack: null;
}
export declare class MockMediaRecorder implements MediaRecorder {
    state: RecordingState;
    stream: MediaStream;
    mimeType: string;
    videoBitsPerSecond: number;
    audioBitsPerSecond: number;
    ondataavailable: ((event: BlobEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onpause: ((event: Event) => void) | null;
    onresume: ((event: Event) => void) | null;
    onstart: ((event: Event) => void) | null;
    onstop: ((event: Event) => void) | null;
    private intervalId?;
    private chunkCount;
    constructor(stream: MediaStream, options?: MediaRecorderOptions);
    start(timeslice?: number): void;
    stop(): void;
    pause(): void;
    resume(): void;
    requestData(): void;
    private generateDataChunk;
    static isTypeSupported(mimeType: string): boolean;
    addEventListener: import("vitest").Mock<(...args: any[]) => any>;
    removeEventListener: import("vitest").Mock<(...args: any[]) => any>;
    dispatchEvent: import("vitest").Mock<(...args: any[]) => any>;
}
export declare const setupMediaDevicesMock: () => void;
export declare const setupAllAudioMocks: () => void;
//# sourceMappingURL=webAudioMocks.d.ts.map