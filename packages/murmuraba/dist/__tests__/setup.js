"use strict";
/**
 * Test Setup for Medical-Grade Audio Recording
 * Critical for ensuring reliability in hospital environments
 */
// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
    state: 'running',
    sampleRate: 48000,
    currentTime: 0,
    createMediaStreamSource: jest.fn(),
    createScriptProcessor: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        onaudioprocess: null,
    })),
    createAnalyser: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: jest.fn(),
    })),
    close: jest.fn().mockResolvedValue(undefined),
    decodeAudioData: jest.fn().mockResolvedValue({
        duration: 10,
        length: 480000,
        numberOfChannels: 2,
        sampleRate: 48000,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(480000)),
    }),
}));
// Mock MediaStream
global.MediaStream = jest.fn().mockImplementation(() => ({
    active: true,
    id: 'mock-stream-id',
    getTracks: jest.fn().mockReturnValue([
        {
            kind: 'audio',
            enabled: true,
            readyState: 'live',
            stop: jest.fn(),
            clone: jest.fn().mockReturnValue({
                kind: 'audio',
                enabled: true,
                readyState: 'live',
                stop: jest.fn(),
            }),
        },
    ]),
    clone: jest.fn().mockReturnThis(),
}));
// Mock MediaRecorder
const MediaRecorderMock = jest.fn().mockImplementation(() => ({
    state: 'inactive',
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    requestData: jest.fn(),
    ondataavailable: null,
    onerror: null,
    onstop: null,
}));
// Add static method using Object.assign
Object.assign(MediaRecorderMock, {
    isTypeSupported: jest.fn().mockReturnValue(true),
});
global.MediaRecorder = MediaRecorderMock;
// Mock getUserMedia - use Object.defineProperty to avoid read-only error
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
        getUserMedia: jest.fn().mockResolvedValue(new MediaStream()),
        enumerateDevices: jest.fn().mockResolvedValue([]),
    },
    writable: true,
    configurable: true,
});
// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => `blob:mock-url-${Math.random()}`);
global.URL.revokeObjectURL = jest.fn();
// Mock Blob with arrayBuffer method
class MockBlob extends Blob {
    arrayBuffer() {
        return Promise.resolve(new ArrayBuffer(1024));
    }
}
global.Blob = MockBlob;
// Mock fetch for blob operations
global.fetch = jest.fn().mockImplementation((url) => {
    if (url.startsWith('blob:')) {
        return Promise.resolve({
            blob: jest.fn().mockResolvedValue(new MockBlob(['mock audio data'], { type: 'audio/webm' })),
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
        });
    }
    return Promise.reject(new Error('Not found'));
});
// Mock performance API - extend Performance interface for TypeScript
Object.defineProperty(global.performance, 'memory', {
    value: {
        usedJSHeapSize: 1000000,
        jsHeapSizeLimit: 2000000,
    },
    writable: true,
    configurable: true,
});
// Suppress console logs during tests unless debugging
if (process.env.DEBUG !== 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
}
// Mock lamejs for MP3 encoding
jest.mock('lamejs', () => ({
    Mp3Encoder: jest.fn().mockImplementation(() => ({
        encodeBuffer: jest.fn().mockReturnValue(new Int8Array(100)),
        flush: jest.fn().mockReturnValue(new Int8Array(50)),
    })),
}));
// Add custom matchers
expect.extend({
    toBeValidChunk(received) {
        const pass = received &&
            typeof received.id === 'string' &&
            typeof received.startTime === 'number' &&
            typeof received.endTime === 'number' &&
            received.endTime > received.startTime;
        return {
            pass,
            message: () => pass
                ? `expected ${received} not to be a valid chunk`
                : `expected ${received} to be a valid chunk with id, startTime, and endTime`,
        };
    },
});
