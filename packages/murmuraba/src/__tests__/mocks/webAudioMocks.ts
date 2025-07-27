import { vi } from 'vitest';

// Web Audio API mocks
export const setupAllAudioMocks = () => {
  // AudioContext mock
  const mockAudioContext = {
    state: 'running',
    sampleRate: 48000,
    currentTime: vi.fn(() => Date.now() / 1000),
    createAnalyser: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      frequencyBinCount: 1024,
      fftSize: 2048,
      getFloatFrequencyData: vi.fn(),
      getByteFrequencyData: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      frequency: { value: 350 },
      Q: { value: 1 },
      type: 'lowpass',
    })),
    createBuffer: vi.fn((channels, length, sampleRate) => ({
      length,
      sampleRate,
      numberOfChannels: channels,
      getChannelData: vi.fn(_channel => new Float32Array(length)),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    })),
    createBufferSource: vi.fn(() => ({
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    })),
    createChannelMerger: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createChannelSplitter: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createConstantSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      offset: { value: 0 },
    })),
    createConvolver: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      buffer: null,
      normalize: true,
    })),
    createDelay: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      delayTime: { value: 0 },
    })),
    createDynamicsCompressor: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      threshold: { value: -24 },
      knee: { value: 30 },
      ratio: { value: 12 },
      attack: { value: 0.003 },
      release: { value: 0.25 },
    })),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 },
    })),
    createIIRFilter: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFrequencyResponse: vi.fn(),
    })),
    createMediaElementSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      mediaElement: null,
    })),
    createMediaStreamDestination: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      stream: new MediaStream(),
    })),
    createMediaStreamSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      mediaStream: null,
    })),
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { value: 440 },
      detune: { value: 0 },
      type: 'sine',
      onended: null,
    })),
    createPanner: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      coneInnerAngle: 360,
      coneOuterAngle: 360,
      coneOuterGain: 0,
      distanceModel: 'inverse',
      maxDistance: 10000,
      orientationX: { value: 1 },
      orientationY: { value: 0 },
      orientationZ: { value: 0 },
      panningModel: 'equalpower',
      positionX: { value: 0 },
      positionY: { value: 0 },
      positionZ: { value: 0 },
      refDistance: 1,
      rolloffFactor: 1,
    })),
    createPeriodicWave: vi.fn(() => ({})),
    createScriptProcessor: vi.fn((bufferSize = 4096) => {
      console.warn('Mock: ScriptProcessor is deprecated, use AudioWorklet instead');
      return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        onaudioprocess: null,
        bufferSize,
        // Simulate processing events for legacy tests
        _simulateProcessing: vi.fn(() => {
          const mockEvent = {
            inputBuffer: {
              getChannelData: vi.fn(() => new Float32Array(bufferSize)),
              numberOfChannels: 1,
              length: bufferSize,
              sampleRate: 48000,
            },
            outputBuffer: {
              getChannelData: vi.fn(() => new Float32Array(bufferSize)),
              numberOfChannels: 1,
              length: bufferSize,
              sampleRate: 48000,
            },
          };
          return mockEvent;
        }),
      };
    }),
    createStereoPanner: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      pan: { value: 0 },
    })),
    createWaveShaper: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      curve: null,
      oversample: 'none',
    })),
    decodeAudioData: vi.fn(_buffer => {
      return Promise.resolve({
        length: 1024,
        sampleRate: 48000,
        numberOfChannels: 1,
        getChannelData: vi.fn(() => new Float32Array(1024)),
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn(),
      });
    }),
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    createMediaStreamTrackSource: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    destination: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
    },
    listener: {
      forwardX: { value: 0 },
      forwardY: { value: 0 },
      forwardZ: { value: -1 },
      positionX: { value: 0 },
      positionY: { value: 0 },
      positionZ: { value: 0 },
      upX: { value: 0 },
      upY: { value: 1 },
      upZ: { value: 0 },
    },
    onstatechange: null,
    audioWorklet: {
      addModule: vi.fn(moduleURL => {
        // Simulate successful worklet loading
        console.log(`Mock: AudioWorklet module loaded: ${moduleURL}`);
        return Promise.resolve();
      }),
    },
  };

  // Mock AudioContext constructor
  (global as any).AudioContext = vi.fn(() => mockAudioContext) as any;
  (global as any).webkitAudioContext = vi.fn(() => mockAudioContext) as any;

  // AudioWorkletNode mock
  const createMockAudioWorkletNode = (context: any, name: string, options?: any) => {
    const mockNode = {
      context,
      numberOfInputs: options?.numberOfInputs || 1,
      numberOfOutputs: options?.numberOfOutputs || 1,
      channelCount: 1,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
      connect: vi.fn(),
      disconnect: vi.fn(),
      port: {
        postMessage: vi.fn(message => {
          console.log(`Mock: AudioWorkletNode received message:`, message);
          // Simulate async response from worklet
          setTimeout(() => {
            if (mockNode.port.onmessage) {
              mockNode.port.onmessage({
                data: {
                  type: 'metrics',
                  inputLevel: Math.random() * 0.5,
                  outputLevel: Math.random() * 0.4,
                  vad: Math.random() * 0.8,
                  noiseReduction: Math.random() * 30,
                },
              } as any);
            }
          }, 10);
        }),
        onmessage: null as any,
        start: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      onprocessorerror: null,
      parameters: new Map(),
    };
    return mockNode;
  };

  (global as any).AudioWorkletNode = vi.fn(createMockAudioWorkletNode) as any;

  // MediaRecorder mock
  const mockMediaRecorder = {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    requestData: vi.fn(),
    ondataavailable: null,
    onstop: null,
    onstart: null,
    onpause: null,
    onresume: null,
    onerror: null,
    state: 'inactive',
    mimeType: 'audio/webm',
    videoBitsPerSecond: 0,
    audioBitsPerSecond: 128000,
    stream: new MediaStream(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
  global.MediaRecorder.isTypeSupported = vi.fn(() => true);

  // MediaStream mock
  const mockMediaStream = () => ({
    id: `stream-${Math.random()}`,
    active: true,
    getTracks: vi.fn(() => []),
    getAudioTracks: vi.fn(() => [
      {
        id: 'audio-track-1',
        kind: 'audio',
        label: 'Mock Audio Track',
        enabled: true,
        muted: false,
        readyState: 'live',
        stop: vi.fn(),
        clone: vi.fn(),
      },
    ]),
    getVideoTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(() => mockMediaStream()),
    onaddtrack: null,
    onremovetrack: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  global.MediaStream = vi.fn(mockMediaStream) as any;

  // Navigator.mediaDevices mock
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn(constraints => {
        console.log('Mock: getUserMedia called with constraints:', constraints);
        const stream = mockMediaStream();

        // Simulate constraint validation for audio
        if (constraints?.audio) {
          const audioConstraints = constraints.audio;
          if (typeof audioConstraints === 'object') {
            // Mock constraint application
            if (audioConstraints.sampleRate && audioConstraints.sampleRate !== 48000) {
              console.warn(
                `Mock: Requested sampleRate ${audioConstraints.sampleRate}, using 48000`
              );
            }
            if (audioConstraints.echoCancellation === false) {
              console.log('Mock: Echo cancellation disabled');
            }
            if (audioConstraints.noiseSuppression === false) {
              console.log('Mock: Noise suppression disabled');
            }
            if (audioConstraints.autoGainControl === false) {
              console.log('Mock: Auto gain control disabled');
            }
          }
        }

        return Promise.resolve(stream);
      }),
      getDisplayMedia: vi.fn(() => Promise.resolve(mockMediaStream())),
      enumerateDevices: vi.fn(() =>
        Promise.resolve([
          {
            deviceId: 'default',
            kind: 'audioinput',
            label: 'Default - Mock Microphone (Built-in)',
            groupId: 'group1',
          },
          {
            deviceId: 'communications',
            kind: 'audioinput',
            label: 'Communications - Mock Microphone (Built-in)',
            groupId: 'group1',
          },
        ])
      ),
      getSupportedConstraints: vi.fn(() => ({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: true,
        sampleSize: true,
        channelCount: true,
      })),
    },
    writable: true,
    configurable: true,
  });

  // Audio element mock
  const mockAudio = () => ({
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    load: vi.fn(),
    canPlayType: vi.fn((type: string) => {
      if (type.includes('wav') || type.includes('mp3')) return 'probably';
      if (type.includes('webm') || type.includes('ogg')) return 'maybe';
      return '';
    }),
    currentTime: 0,
    duration: 0,
    paused: true,
    ended: false,
    volume: 1,
    muted: false,
    playbackRate: 1,
    src: '',
    crossOrigin: null,
    loop: false,
    autoplay: false,
    controls: false,
    onloadeddata: null,
    oncanplay: null,
    oncanplaythrough: null,
    onplay: null,
    onpause: null,
    onended: null,
    onerror: null,
    ontimeupdate: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  (global as any).Audio = vi.fn(mockAudio) as any;

  // OfflineAudioContext mock
  const mockOfflineAudioContext = (
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ) => ({
    ...mockAudioContext,
    length,
    startRendering: vi.fn(() =>
      Promise.resolve({
        length,
        sampleRate,
        numberOfChannels,
        getChannelData: vi.fn(() => new Float32Array(length)),
      })
    ),
    suspend: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    oncomplete: null,
  });

  (global as any).OfflineAudioContext = vi.fn(mockOfflineAudioContext) as any;
  (global as any).webkitOfflineAudioContext = vi.fn(mockOfflineAudioContext) as any;

  // WebAssembly mock for WASM-based engines
  if (typeof global.WebAssembly === 'undefined') {
    (global as any).WebAssembly = {
      instantiate: vi.fn(() =>
        Promise.resolve({
          instance: {
            exports: {
              _malloc: vi.fn(() => 1024), // Mock memory pointer
              _free: vi.fn(),
              _rnnoise_create: vi.fn(() => 2048), // Mock RNNoise state pointer
              _rnnoise_destroy: vi.fn(),
              _rnnoise_process_frame: vi.fn(() => Math.random() * 0.8), // Mock VAD
              HEAPF32: new Float32Array(4096),
              HEAP16: new Int16Array(2048),
              memory: {
                buffer: new ArrayBuffer(65536),
              },
            },
          },
          module: {},
        })
      ),
      compile: vi.fn(() => Promise.resolve({})),
      compileStreaming: vi.fn(() => Promise.resolve({})),
      instantiateStreaming: vi.fn(() =>
        Promise.resolve({
          instance: { exports: {} },
          module: {},
        })
      ),
      Module: vi.fn(),
      Memory: vi.fn(),
      Table: vi.fn(),
      CompileError: Error,
      RuntimeError: Error,
      LinkError: Error,
    };
  }

  // Blob and URL mock for worklet loading
  if (typeof global.Blob === 'undefined') {
    (global as any).Blob = vi.fn((content, options) => ({
      size: content?.[0]?.length || 0,
      type: options?.type || 'text/plain',
      stream: vi.fn(),
      text: vi.fn(() => Promise.resolve(content?.[0] || '')),
      arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
    }));
  }

  if (typeof global.URL === 'undefined') {
    (global as any).URL = {
      createObjectURL: vi.fn(_blob => `blob:mock-${Math.random()}`),
      revokeObjectURL: vi.fn(),
    };
  }
};
