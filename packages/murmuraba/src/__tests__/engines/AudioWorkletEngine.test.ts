import { AudioWorkletEngine } from '../../engines/AudioWorkletEngine';

describe('AudioWorkletEngine', () => {
  let originalAudioContext: any;
  let originalAudioWorklet: any;
  let originalBlob: any;
  let originalURL: any;

  beforeEach(() => {
    // Save original values
    originalAudioContext = (global as any).AudioContext;
    originalAudioWorklet = (global as any).AudioWorklet;
    originalBlob = (global as any).Blob;
    originalURL = (global as any).URL;
    
    // Mock Blob
    (global as any).Blob = jest.fn((content, options) => ({
      content,
      options
    }));
    
    // Mock URL
    (global as any).URL = {
      createObjectURL: jest.fn(() => 'blob://mock-url'),
      revokeObjectURL: jest.fn()
    };
  });

  afterEach(() => {
    // Restore original values
    (global as any).AudioContext = originalAudioContext;
    (global as any).AudioWorklet = originalAudioWorklet;
    (global as any).Blob = originalBlob;
    (global as any).URL = originalURL;
  });

  describe('AudioWorklet Support Detection', () => {
    it('should detect when AudioWorklet is supported', () => {
      // Mock AudioContext with audioWorklet support
      const mockAudioContext = {
        audioWorklet: {
          addModule: jest.fn()
        }
      };
      (global as any).AudioContext = jest.fn(() => mockAudioContext);
      (global as any).AudioWorklet = jest.fn();

      const engine = new AudioWorkletEngine();
      expect(engine.isAudioWorkletSupported()).toBe(true);
    });

    it('should detect when AudioWorklet is not supported', () => {
      // Mock AudioContext without audioWorklet
      const mockAudioContext = {};
      (global as any).AudioContext = jest.fn(() => mockAudioContext);
      (global as any).AudioWorklet = undefined;

      const engine = new AudioWorkletEngine();
      expect(engine.isAudioWorkletSupported()).toBe(false);
    });

    it('should handle when AudioContext is not available', () => {
      // Remove AudioContext entirely
      (global as any).AudioContext = undefined;
      (global as any).AudioWorklet = undefined;

      const engine = new AudioWorkletEngine();
      expect(engine.isAudioWorkletSupported()).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should throw error when AudioWorklet is not supported', async () => {
      // Mock no AudioWorklet support
      const mockAudioContext = {};
      (global as any).AudioContext = jest.fn(() => mockAudioContext);
      (global as any).AudioWorklet = undefined;

      const engine = new AudioWorkletEngine();
      await expect(engine.initialize()).rejects.toThrow('AudioWorklet is not supported in this browser');
    });

    it('should initialize successfully when AudioWorklet is supported', async () => {
      // Mock AudioWorklet support
      const mockAddModule = jest.fn().mockResolvedValue(undefined);
      const mockAudioContext = {
        audioWorklet: {
          addModule: mockAddModule
        }
      };
      (global as any).AudioContext = jest.fn(() => mockAudioContext);
      (global as any).AudioWorklet = jest.fn();

      const engine = new AudioWorkletEngine();
      await engine.initialize();

      expect(engine.isInitialized).toBe(true);
      expect(mockAddModule).toHaveBeenCalled();
    });
  });

  describe('AudioWorklet Processor Creation', () => {
    let mockAudioContext: any;
    let mockAddModule: jest.Mock;

    beforeEach(() => {
      mockAddModule = jest.fn().mockResolvedValue(undefined);
      mockAudioContext = {
        audioWorklet: {
          addModule: mockAddModule
        },
        createScriptProcessor: jest.fn(),
        createGain: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          gain: { value: 1 }
        })),
        destination: {}
      };
      (global as any).AudioContext = jest.fn(() => mockAudioContext);
      (global as any).AudioWorklet = jest.fn();
      (global as any).AudioWorkletNode = jest.fn((context, name, options) => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        port: {
          postMessage: jest.fn(),
          onmessage: null
        }
      }));
    });

    it('should create AudioWorkletNode after initialization', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();

      const workletNode = engine.createWorkletNode();
      expect(workletNode).toBeDefined();
      expect((global as any).AudioWorkletNode).toHaveBeenCalledWith(
        mockAudioContext,
        'rnnoise-processor',
        expect.any(Object)
      );
    });

    it('should throw error when creating node before initialization', () => {
      const engine = new AudioWorkletEngine();
      expect(() => engine.createWorkletNode()).toThrow('AudioWorkletEngine not initialized');
    });

    it('should include RNNoise processor code in the module', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();

      // Check that Blob was created with processor code
      expect((global as any).Blob).toHaveBeenCalled();
      const blobCall = (global as any).Blob.mock.calls[0];
      const processorCode = blobCall[0][0];
      
      expect(processorCode).toContain('class RNNoiseProcessor extends AudioWorkletProcessor');
      expect(processorCode).toContain("registerProcessor('rnnoise-processor'");
    });
  });

  describe('Audio Processing', () => {
    let mockAudioContext: any;
    let mockWorkletNode: any;
    let mockScriptProcessor: any;
    let mockOfflineContext: any;

    beforeEach(() => {
      mockScriptProcessor = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        onaudioprocess: null
      };
      
      mockWorkletNode = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        port: {
          postMessage: jest.fn(),
          onmessage: null
        }
      };
      
      mockAudioContext = {
        audioWorklet: {
          addModule: jest.fn().mockResolvedValue(undefined)
        },
        createScriptProcessor: jest.fn(() => mockScriptProcessor),
        createMediaStreamSource: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn()
        })),
        createGain: jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          gain: { value: 1 }
        })),
        destination: {},
        sampleRate: 48000
      };
      
      (global as any).AudioContext = jest.fn(() => mockAudioContext);
      (global as any).AudioWorklet = jest.fn();
      (global as any).AudioWorkletNode = jest.fn(() => mockWorkletNode);
      
      // Mock OfflineAudioContext
      mockOfflineContext = {
        createBuffer: jest.fn(() => ({
          copyToChannel: jest.fn(),
          copyFromChannel: jest.fn((target) => {
            // Fill target with mock processed data
            for (let i = 0; i < target.length; i++) {
              target[i] = Math.sin(2 * Math.PI * i / 480) * 0.5; // Simulated processed audio
            }
          })
        })),
        createBufferSource: jest.fn(() => ({
          buffer: null,
          connect: jest.fn(),
          start: jest.fn()
        })),
        audioWorklet: {
          addModule: jest.fn().mockResolvedValue(undefined)
        },
        destination: {},
        sampleRate: 48000,
        startRendering: jest.fn().mockResolvedValue({
          copyFromChannel: jest.fn((target) => {
            for (let i = 0; i < target.length; i++) {
              target[i] = Math.sin(2 * Math.PI * i / 480) * 0.5;
            }
          })
        })
      };
      
      (global as any).OfflineAudioContext = jest.fn(() => mockOfflineContext);
    });

    it('should process audio buffer through worklet', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      const inputBuffer = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        inputBuffer[i] = Math.sin(2 * Math.PI * i / 480);
      }
      
      const outputBuffer = await engine.processWithWorklet(inputBuffer);
      expect(outputBuffer).toBeInstanceOf(Float32Array);
      expect(outputBuffer.length).toBe(480);
    });

    it('should throw error when processing before initialization', async () => {
      const engine = new AudioWorkletEngine();
      const inputBuffer = new Float32Array(480);
      
      await expect(engine.processWithWorklet(inputBuffer)).rejects.toThrow('AudioWorkletEngine not initialized');
    });

    it('should handle real-time stream processing', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      // Mock MediaStream
      const mockStream = {
        getTracks: jest.fn(() => [{ kind: 'audio' }])
      };
      
      const processor = await engine.createStreamProcessor(mockStream as any);
      expect(processor).toBeDefined();
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream);
    });

    it('should send messages to worklet processor', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();
      const workletNode = engine.createWorkletNode();
      
      engine.sendToWorklet({ type: 'updateSettings', data: { noiseLevel: 0.5 } });
      expect(mockWorkletNode.port.postMessage).toHaveBeenCalledWith({
        type: 'updateSettings',
        data: { noiseLevel: 0.5 }
      });
    });
  });
});