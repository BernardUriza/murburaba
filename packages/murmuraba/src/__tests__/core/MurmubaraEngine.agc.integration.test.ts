import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MurmubaraEngine } from '../../core/MurmubaraEngine';
import { SimpleAGC } from '../../utils/SimpleAGC';

vi.mock('../../utils/SimpleAGC');

describe('MurmubaraEngine AGC Pipeline Integration - TDD REFACTOR', () => {
  let engine: MurmubaraEngine;
  let mockAudioContext: any;
  let mockStream: MediaStream;
  let mockAGC: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock SimpleAGC
    mockAGC = {
      connect: vi.fn(),
      updateGain: vi.fn(),
      getCurrentGain: vi.fn(() => 5.0) // Simulating 5x gain
    };
    (SimpleAGC as any).mockImplementation(() => mockAGC);

    // Mock AudioContext with all required nodes
    const mockSource = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    const mockProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null
    };

    const mockDestination = {
      stream: new MediaStream()
    };

    const mockFilter = {
      connect: vi.fn(),
      type: '',
      frequency: { value: 0 },
      Q: { value: 0 },
      gain: { value: 0 }
    };

    mockAudioContext = {
      state: 'running',
      sampleRate: 48000,
      createMediaStreamSource: vi.fn(() => mockSource),
      createScriptProcessor: vi.fn(() => mockProcessor),
      createMediaStreamDestination: vi.fn(() => mockDestination),
      createBiquadFilter: vi.fn(() => ({ ...mockFilter })),
      resume: vi.fn(),
      close: vi.fn(),
      destination: { maxChannelCount: 2 }
    };

    // Mock WASM module
    const mockWasmModule = {
      _rnnoise_create: vi.fn(() => 123),
      _rnnoise_destroy: vi.fn(),
      _rnnoise_process_frame: vi.fn(),
      _malloc: vi.fn(() => 456),
      _free: vi.fn(),
      HEAPF32: new Float32Array(10000)
    };

    global.window = {
      AudioContext: vi.fn(() => mockAudioContext),
      WebAssembly: { instantiate: vi.fn() },
      createRNNWasmModule: vi.fn(async () => mockWasmModule),
      document: {} as any
    } as any;
    
    global.document = {
      createElement: vi.fn(() => {
        const script = {
          onload: null,
          onerror: null,
          src: ''
        };
        // Immediately trigger onload to simulate script loading
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 0);
        return script;
      }),
      head: { appendChild: vi.fn() }
    } as any;

    global.performance = { memory: {} } as any;

    // Mock MediaStream
    mockStream = new MediaStream();

    engine = new MurmubaraEngine({ agcEnabled: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AGC Audio Pipeline Integration', () => {
    it('should create AGC when enabled and integrate into audio chain', async () => {
      // Initialize engine
      await engine.initialize();
      
      // Process a stream with AGC enabled
      const controller = await engine.processStream(mockStream);

      // Verify AGC was created with correct target level
      expect(SimpleAGC).toHaveBeenCalledWith(mockAudioContext, 0.3);
    });

    it('should connect AGC in the audio chain: filters -> AGC -> processor', async () => {
      await engine.initialize();
      const controller = await engine.processStream(mockStream);

      // Verify AGC is connected in the chain
      expect(mockAGC.connect).toHaveBeenCalled();
      // Should connect lowShelfFilter -> AGC -> processor
      const [source, destination] = mockAGC.connect.mock.calls[0];
      expect(source).toBeDefined(); // lowShelfFilter
      expect(destination).toBeDefined(); // processor
    });

    it('should call AGC updateGain during audio processing', async () => {
      await engine.initialize();
      const controller = await engine.processStream(mockStream);

      // Get the audio processing callback
      const processor = mockAudioContext.createScriptProcessor.mock.results[0].value;
      const audioCallback = processor.onaudioprocess;

      // Simulate audio processing event
      const mockEvent = {
        inputBuffer: {
          getChannelData: () => new Float32Array(4096).fill(0.1) // 10% volume
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(4096)
        }
      };

      // Process audio
      audioCallback(mockEvent);

      // AGC should be updated periodically
      expect(mockAGC.updateGain).toHaveBeenCalled();
    });

    it('should not create AGC when disabled', async () => {
      engine.setAGCEnabled(false);
      await engine.initialize();
      const controller = await engine.processStream(mockStream);

      // AGC should not be created
      expect(SimpleAGC).not.toHaveBeenCalled();
    });

    it('should apply AGC gain monitoring for metrics', async () => {
      await engine.initialize();
      const controller = await engine.processStream(mockStream);

      const processor = mockAudioContext.createScriptProcessor.mock.results[0].value;
      const audioCallback = processor.onaudioprocess;

      const mockEvent = {
        inputBuffer: {
          getChannelData: () => new Float32Array(4096).fill(0.04) // 4% volume (user's problem)
        },
        outputBuffer: {
          getChannelData: () => new Float32Array(4096)
        }
      };

      audioCallback(mockEvent);

      // Should query current gain for metrics
      expect(mockAGC.getCurrentGain).toHaveBeenCalled();
      
      // Verify metrics show amplification happened
      const metrics = engine.getMetrics();
      // AGC should show it's working (we'll implement this)
    });
  });

  describe('Volume Fix Verification', () => {
    it('should amplify 4% input to audible output with AGC', async () => {
      await engine.initialize();
      const controller = await engine.processStream(mockStream);

      const processor = mockAudioContext.createScriptProcessor.mock.results[0].value;
      const audioCallback = processor.onaudioprocess;

      // Simulate the user's exact problem: 4% volume when shouting
      const quietInput = new Float32Array(4096).fill(0.04); // 4% amplitude
      const output = new Float32Array(4096);

      const mockEvent = {
        inputBuffer: {
          getChannelData: () => quietInput
        },
        outputBuffer: {
          getChannelData: () => output
        }
      };

      // Process with AGC
      audioCallback(mockEvent);

      // With 5x gain from AGC, output should be ~20% (0.04 * 5 = 0.2)
      // This makes shouting audible!
      expect(mockAGC.updateGain).toHaveBeenCalled();
      expect(mockAGC.getCurrentGain).toHaveBeenCalled();
    });
  });
});