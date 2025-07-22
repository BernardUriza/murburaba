import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
// Modern Web Audio API mocks
const createMockAudioContext = () => ({
    state: 'running',
    sampleRate: 48000,
    currentTime: 0,
    createMediaStreamSource: vi.fn(),
    createScriptProcessor: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null,
    })),
    createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
    })),
    close: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockResolvedValue({
        duration: 10,
        length: 480000,
        numberOfChannels: 2,
        sampleRate: 48000,
        getChannelData: vi.fn().mockReturnValue(new Float32Array(480000)),
    }),
});
global.AudioContext = vi.fn().mockImplementation(createMockAudioContext);
// Modern MediaStream mock
class MockMediaStream {
    constructor() {
        this.active = true;
        this.id = `stream-${crypto.randomUUID()}`;
        this.getTracks = vi.fn().mockReturnValue([
            {
                kind: 'audio',
                enabled: true,
                readyState: 'live',
                stop: vi.fn(),
                clone: vi.fn().mockReturnValue({
                    kind: 'audio',
                    enabled: true,
                    readyState: 'live',
                    stop: vi.fn(),
                }),
            },
        ]);
        this.clone = vi.fn().mockImplementation(() => {
            const cloned = new MockMediaStream();
            cloned.id = `stream-clone-${crypto.randomUUID()}`;
            return cloned;
        });
    }
}
global.MediaStream = MockMediaStream;
// Modern MediaRecorder mock
class MockMediaRecorder {
    constructor() {
        this.state = 'inactive';
        this.start = vi.fn();
        this.stop = vi.fn();
        this.pause = vi.fn();
        this.resume = vi.fn();
        this.requestData = vi.fn();
        this.ondataavailable = null;
        this.onerror = null;
        this.onstop = null;
        // Auto-trigger stop after start for testing
        this.start.mockImplementation(() => {
            this.state = 'recording';
        });
        this.stop.mockImplementation(() => {
            this.state = 'inactive';
            if (this.onstop) {
                setTimeout(() => this.onstop(), 0);
            }
        });
    }
}
MockMediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);
global.MediaRecorder = MockMediaRecorder;
// Modern getUserMedia mock
if (!global.navigator) {
    global.navigator = {};
}
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockImplementation(() => Promise.resolve(new MockMediaStream())),
        enumerateDevices: vi.fn().mockResolvedValue([]),
    },
    writable: true,
    configurable: true,
});
// Modern URL mocks
let urlCounter = 0;
global.URL.createObjectURL = vi.fn(() => {
    // Always return consistent format for tests
    return `blob:mock-url-${urlCounter++}`;
});
global.URL.revokeObjectURL = vi.fn();
// Modern Blob mock
class MockBlob extends Blob {
    arrayBuffer() {
        return Promise.resolve(new ArrayBuffer(1024));
    }
}
global.Blob = MockBlob;
// Modern fetch mock for blob operations
global.fetch = vi.fn().mockImplementation((url) => {
    if (url.startsWith('blob:')) {
        return Promise.resolve({
            ok: true,
            blob: vi.fn().mockResolvedValue(new MockBlob(['mock audio data'], { type: 'audio/webm' })),
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        });
    }
    return Promise.reject(new Error('Not found'));
});
// Modern performance.memory mock
Object.defineProperty(global.performance, 'memory', {
    value: {
        usedJSHeapSize: 1000000,
        jsHeapSizeLimit: 2000000,
    },
    writable: true,
    configurable: true,
});
// Mock lamejs for MP3 encoding
vi.mock('lamejs', () => ({
    Mp3Encoder: vi.fn().mockImplementation(() => ({
        encodeBuffer: vi.fn().mockReturnValue(new Int8Array(100)),
        flush: vi.fn().mockReturnValue(new Int8Array(50)),
    })),
}));
// Mock console methods
global.console = {
    ...console,
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
};
// Custom matchers for Vitest
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
