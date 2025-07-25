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
      getChannelData: vi.fn((channel) => new Float32Array(length)),
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
    createScriptProcessor: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null,
      bufferSize: 4096,
    })),
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
    decodeAudioData: vi.fn((buffer) => {
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
      addModule: vi.fn(() => Promise.resolve()),
    },
  };

  // Mock AudioContext constructor
  (global as any).AudioContext = vi.fn(() => mockAudioContext) as any;
  (global as any).webkitAudioContext = vi.fn(() => mockAudioContext) as any;

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
    getAudioTracks: vi.fn(() => [{
      id: 'audio-track-1',
      kind: 'audio',
      label: 'Mock Audio Track',
      enabled: true,
      muted: false,
      readyState: 'live',
      stop: vi.fn(),
      clone: vi.fn(),
    }]),
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
      getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream())),
      getDisplayMedia: vi.fn(() => Promise.resolve(mockMediaStream())),
      enumerateDevices: vi.fn(() => Promise.resolve([
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
      ])),
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
  const mockOfflineAudioContext = (numberOfChannels: number, length: number, sampleRate: number) => ({
    ...mockAudioContext,
    length,
    startRendering: vi.fn(() => Promise.resolve({
      length,
      sampleRate,
      numberOfChannels,
      getChannelData: vi.fn(() => new Float32Array(length)),
    })),
    suspend: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    oncomplete: null,
  });

  (global as any).OfflineAudioContext = vi.fn(mockOfflineAudioContext) as any;
  (global as any).webkitOfflineAudioContext = vi.fn(mockOfflineAudioContext) as any;
};