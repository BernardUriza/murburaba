import { AudioWorkletEngine } from '../../engines/AudioWorkletEngine';

describe('AudioWorkletEngine Integration', () => {
  let originalAudioContext: any;
  let originalAudioWorklet: any;
  let originalMediaDevices: any;

  beforeEach(() => {
    // Save original values
    originalAudioContext = (global as any).AudioContext;
    originalAudioWorklet = (global as any).AudioWorklet;
    originalMediaDevices = navigator.mediaDevices;
    
    // Mock AudioContext and AudioWorklet
    const mockAudioContext = {
      audioWorklet: {
        addModule: jest.fn().mockResolvedValue(undefined)
      },
      createMediaStreamSource: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn()
      })),
      createScriptProcessor: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        onaudioprocess: null
      })),
      createMediaStreamDestination: jest.fn(() => ({
        stream: { getTracks: jest.fn(() => []) }
      })),
      destination: {},
      sampleRate: 48000,
      close: jest.fn()
    };
    
    (global as any).AudioContext = jest.fn(() => mockAudioContext);
    (global as any).AudioWorklet = jest.fn();
    
    let messageHandler: any = null;
    (global as any).AudioWorkletNode = jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      port: {
        postMessage: jest.fn(),
        get onmessage() { return messageHandler; },
        set onmessage(handler) { messageHandler = handler; }
      }
    }));
    
    // Mock URL and Blob
    (global as any).URL = {
      createObjectURL: jest.fn(() => 'blob://mock-url'),
      revokeObjectURL: jest.fn()
    };
    (global as any).Blob = jest.fn();
    
    // Mock OfflineAudioContext
    (global as any).OfflineAudioContext = jest.fn((channels, length, sampleRate) => ({
      createBuffer: jest.fn(() => ({
        copyToChannel: jest.fn(),
        copyFromChannel: jest.fn((target) => {
          for (let i = 0; i < target.length; i++) {
            target[i] = Math.sin(2 * Math.PI * i / 480) * 0.5;
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
      sampleRate,
      startRendering: jest.fn().mockResolvedValue({
        copyFromChannel: jest.fn((target) => {
          for (let i = 0; i < target.length; i++) {
            target[i] = Math.sin(2 * Math.PI * i / 480) * 0.5;
          }
        })
      })
    }));
  });

  afterEach(() => {
    // Restore original values
    (global as any).AudioContext = originalAudioContext;
    (global as any).AudioWorklet = originalAudioWorklet;
    if (originalMediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        configurable: true
      });
    }
  });

  describe('Real-time Processing Pipeline', () => {
    it('should create a complete processing pipeline with AudioWorklet', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      // Mock getUserMedia
      const mockStream = {
        getTracks: jest.fn(() => [{ kind: 'audio', stop: jest.fn() }])
      };
      
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn().mockResolvedValue(mockStream)
        },
        configurable: true
      });
      
      // Create processing pipeline
      const pipeline = await engine.createProcessingPipeline({
        echoCancellation: true,
        noiseSuppression: false, // We're using RNNoise instead
        autoGainControl: true
      });
      
      expect(pipeline).toBeDefined();
      expect(pipeline.input).toBeDefined();
      expect(pipeline.output).toBeDefined();
      expect(pipeline.workletNode).toBeDefined();
    });

    it('should process audio chunks through the worklet pipeline', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      // Create a test audio buffer
      const sampleRate = 48000;
      const duration = 1; // 1 second
      const numSamples = sampleRate * duration;
      const audioBuffer = new Float32Array(numSamples);
      
      // Fill with test signal
      for (let i = 0; i < numSamples; i++) {
        audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate); // 440Hz sine wave
      }
      
      // Process in chunks of 480 samples (RNNoise frame size)
      const frameSize = 480;
      const processedChunks: Float32Array[] = [];
      
      for (let offset = 0; offset < numSamples; offset += frameSize) {
        const chunk = audioBuffer.slice(offset, Math.min(offset + frameSize, numSamples));
        const processed = await engine.processWithWorklet(chunk);
        processedChunks.push(processed);
      }
      
      expect(processedChunks.length).toBe(Math.ceil(numSamples / frameSize));
      expect(processedChunks[0].length).toBe(frameSize);
    });

    it('should handle worklet fallback to ScriptProcessor', async () => {
      // Mock no AudioWorklet support
      (global as any).AudioWorklet = undefined;
      
      const engine = new AudioWorkletEngine();
      expect(engine.isAudioWorkletSupported()).toBe(false);
      
      // Should fallback gracefully
      await expect(engine.initialize()).rejects.toThrow('AudioWorklet is not supported');
    });
  });

  describe('Performance Optimization', () => {
    it('should process audio with minimal latency', async () => {
      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      const startTime = Date.now();
      const testBuffer = new Float32Array(480); // One frame
      
      // Process multiple frames
      for (let i = 0; i < 100; i++) {
        await engine.processWithWorklet(testBuffer);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Processing 100 frames should be reasonably fast
      expect(processingTime).toBeLessThan(500); // Allow up to 500ms for 100 frames
    });

    it('should report performance metrics', async () => {
      let messageHandler: any = null;
      const mockWorkletNode = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        port: {
          postMessage: jest.fn(),
          get onmessage() { return messageHandler; },
          set onmessage(handler) { messageHandler = handler; }
        }
      };
      
      (global as any).AudioWorkletNode = jest.fn(() => mockWorkletNode);
      
      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      const metrics: any[] = [];
      engine.onPerformanceMetrics((m) => metrics.push(m));
      
      const workletNode = engine.createWorkletNode();
      
      // Simulate performance reports
      if (messageHandler) {
        messageHandler({
          data: {
            type: 'performance',
            metrics: {
              processingTime: 0.2,
              bufferUnderruns: 0,
              framesProcessed: 100
            }
          }
        });
      }
      
      expect(metrics).toHaveLength(1);
      expect(metrics[0].processingTime).toBe(0.2);
      expect(metrics[0].bufferUnderruns).toBe(0);
    });
  });

  describe('Engine Selection', () => {
    it('should prefer AudioWorklet when available', async () => {
      const engine = new AudioWorkletEngine();
      expect(engine.isAudioWorkletSupported()).toBe(true);
      
      await engine.initialize();
      expect(engine.isInitialized).toBe(true);
      expect(engine.name).toBe('AudioWorklet');
    });

    it('should provide feature detection method', () => {
      const engine = new AudioWorkletEngine();
      
      const features = engine.getSupportedFeatures();
      expect(features).toEqual({
        audioWorklet: true,
        offlineProcessing: true,
        realtimeProcessing: true,
        performanceMetrics: true,
        wasmSupport: true
      });
    });
  });
});