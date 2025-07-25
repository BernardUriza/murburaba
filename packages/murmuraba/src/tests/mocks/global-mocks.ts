/**
 * Global mocks for browser APIs
 * Used across all test suites
 */

import { vi } from 'vitest';

// Mock AudioContext
export class MockAudioContext {
  state: AudioContextState = 'running';
  sampleRate = 48000;
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  
  createGain = vi.fn(() => ({
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  createScriptProcessor = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  
  close = vi.fn();
  resume = vi.fn();
  suspend = vi.fn();
}

// Mock MediaStream
export class MockMediaStream {
  id = 'mock-stream-id';
  active = true;
  
  private tracks: MediaStreamTrack[] = [];
  
  constructor() {
    // Add a default audio track
    this.tracks.push({
      kind: 'audio',
      id: 'audio-track-1',
      enabled: true,
      label: 'Mock Audio Track',
      muted: false,
      readyState: 'live',
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaStreamTrack);
  }
  
  getTracks = () => [...this.tracks];
  getAudioTracks = () => this.tracks.filter(t => t.kind === 'audio');
  getVideoTracks = () => this.tracks.filter(t => t.kind === 'video');
  addTrack = vi.fn();
  removeTrack = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

// Mock MediaRecorder
export class MockMediaRecorder {
  state: RecordingState = 'inactive';
  stream: MediaStream;
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(stream: MediaStream, options?: any) {
    this.stream = stream;
  }
  
  start = vi.fn(() => {
    this.state = 'recording';
    // Simulate data available after a delay
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({
          data: new Blob([new ArrayBuffer(1024)], { type: 'audio/webm' })
        });
      }
    }, 100);
  });
  
  stop = vi.fn(() => {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  });
  
  pause = vi.fn(() => {
    this.state = 'paused';
  });
  
  resume = vi.fn(() => {
    this.state = 'recording';
  });
  
  static isTypeSupported = vi.fn((type: string) => {
    return ['audio/webm', 'audio/webm;codecs=opus'].includes(type);
  });
}

// Mock fetch for WASM loading
export const mockFetch = vi.fn((url: string) => {
  if (url.includes('.wasm')) {
    return Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
  }
  return Promise.reject(new Error('Not found'));
});

// Mock WebAssembly
export const mockWebAssembly = {
  instantiate: vi.fn(() => Promise.resolve({
    instance: {
      exports: {
        _rnnoise_create: vi.fn(() => 1),
        _rnnoise_destroy: vi.fn(),
        _rnnoise_process_frame: vi.fn(() => 1),
        _rnnoise_get_size: vi.fn(() => 480),
        _malloc: vi.fn((size: number) => 1000),
        _free: vi.fn(),
        memory: {
          buffer: new ArrayBuffer(65536),
        },
      },
    },
  })),
  Module: vi.fn(),
};

// Mock AudioWorklet
export class MockAudioWorklet {
  addModule = vi.fn(() => Promise.resolve());
}

// Mock AudioWorkletNode
export class MockAudioWorkletNode {
  port = {
    postMessage: vi.fn(),
    onmessage: null as any,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  
  connect = vi.fn();
  disconnect = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  
  constructor(context: any, name: string, options?: any) {
    // Constructor implementation
  }
}

// Install global mocks
export function installGlobalMocks() {
  // Define window on global if it doesn't exist
  if (typeof window === 'undefined') {
    Object.defineProperty(global, 'window', {
      writable: true,
      value: global,
    });
  }
  
  // Define AudioContext on global
  Object.defineProperty(global, 'AudioContext', {
    writable: true,
    value: MockAudioContext,
  });
  
  // Define MediaStream on global
  Object.defineProperty(global, 'MediaStream', {
    writable: true,
    value: MockMediaStream,
  });
  
  // Define MediaRecorder on global
  Object.defineProperty(global, 'MediaRecorder', {
    writable: true,
    value: MockMediaRecorder,
  });
  
  // Mock fetch
  Object.defineProperty(global, 'fetch', {
    writable: true,
    value: mockFetch,
  });
  
  // Mock WebAssembly
  Object.defineProperty(global, 'WebAssembly', {
    writable: true,
    value: mockWebAssembly,
  });
  
  // Mock AudioWorkletNode
  Object.defineProperty(global, 'AudioWorkletNode', {
    writable: true,
    value: MockAudioWorkletNode,
  });
  
  // Mock document
  if (typeof document === 'undefined') {
    Object.defineProperty(global, 'document', {
      writable: true,
      value: {
        createElement: vi.fn(() => ({
          setAttribute: vi.fn(),
          getAttribute: vi.fn(),
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          style: {},
        })),
      },
    });
  }
  
  // Mock performance
  Object.defineProperty(global, 'performance', {
    writable: true,
    value: {
      now: vi.fn(() => Date.now()),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000,
      },
    },
  });
}

// Uninstall global mocks (for cleanup)
export function uninstallGlobalMocks() {
  // Reset all mocks
  vi.clearAllMocks();
}