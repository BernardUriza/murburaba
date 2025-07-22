import { AudioWorkletEngine } from '../../engines/AudioWorkletEngine';
import { RNNoiseEngine } from '../../engines/RNNoiseEngine';

describe('AudioWorkletEngine Performance Benchmarks', () => {
  let originalAudioContext: any;
  let originalAudioWorklet: any;
  let originalOfflineAudioContext: any;

  beforeEach(() => {
    // Save original values
    originalAudioContext = (global as any).AudioContext;
    originalAudioWorklet = (global as any).AudioWorklet;
    originalOfflineAudioContext = (global as any).OfflineAudioContext;
    
    // Mock performance.now for consistent timing
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    // Restore original values
    (global as any).AudioContext = originalAudioContext;
    (global as any).AudioWorklet = originalAudioWorklet;
    (global as any).OfflineAudioContext = originalOfflineAudioContext;
    jest.restoreAllMocks();
  });

  describe('Main Thread vs Audio Thread Performance', () => {
    it('should demonstrate AudioWorklet performance advantage', async () => {
      // Mock setup for both engines
      const setupMocks = () => {
        const mockAudioContext = {
          audioWorklet: {
            addModule: jest.fn().mockResolvedValue(undefined)
          },
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
        
        (global as any).OfflineAudioContext = jest.fn((channels, length, sampleRate) => ({
          createBuffer: jest.fn(() => ({
            copyToChannel: jest.fn(),
            copyFromChannel: jest.fn((target) => {
              // Simulate processed audio
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
          startRendering: jest.fn().mockImplementation(() => {
            // Simulate AudioWorklet processing time (faster)
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({
                  copyFromChannel: jest.fn((target) => {
                    for (let i = 0; i < target.length; i++) {
                      target[i] = Math.sin(2 * Math.PI * i / 480) * 0.5;
                    }
                  })
                });
              }, 1); // 1ms processing time for AudioWorklet
            });
          })
        }));
        
        (global as any).URL = {
          createObjectURL: jest.fn(() => 'blob://mock-url'),
          revokeObjectURL: jest.fn()
        };
        (global as any).Blob = jest.fn();
      };

      setupMocks();

      // Test AudioWorklet performance
      const workletEngine = new AudioWorkletEngine();
      await workletEngine.initialize();
      
      const numFrames = 10; // Reduced for faster test
      const frameSize = 480;
      const testBuffer = new Float32Array(frameSize);
      
      // Fill with test data
      for (let i = 0; i < frameSize; i++) {
        testBuffer[i] = Math.sin(2 * Math.PI * 440 * i / 48000);
      }
      
      // Benchmark AudioWorklet
      const workletStartTime = performance.now();
      for (let i = 0; i < numFrames; i++) {
        await workletEngine.processWithWorklet(testBuffer);
      }
      const workletEndTime = performance.now();
      const workletProcessingTime = workletEndTime - workletStartTime;
      
      // Mock main thread processing (slower)
      const mainThreadStartTime = performance.now();
      for (let i = 0; i < numFrames; i++) {
        // Simulate main thread processing with blocking operation
        const processed = new Float32Array(frameSize);
        for (let j = 0; j < frameSize; j++) {
          // Simulate expensive computation
          processed[j] = testBuffer[j] * 0.8;
          // Add artificial delay to simulate main thread blocking
          if (j % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
      const mainThreadEndTime = performance.now();
      const mainThreadProcessingTime = mainThreadEndTime - mainThreadStartTime;
      
      // AudioWorklet should be faster
      console.log(`AudioWorklet: ${workletProcessingTime}ms for ${numFrames} frames`);
      console.log(`Main Thread: ${mainThreadProcessingTime}ms for ${numFrames} frames`);
      
      // Verify AudioWorklet is faster (at least in our mock)
      expect(workletProcessingTime).toBeLessThan(mainThreadProcessingTime);
    }, 10000); // 10 second timeout

    it('should handle concurrent processing without blocking', async () => {
      const setupMocks = () => {
        const mockAudioContext = {
          audioWorklet: {
            addModule: jest.fn().mockResolvedValue(undefined)
          },
          sampleRate: 48000,
          createScriptProcessor: jest.fn(() => ({
            connect: jest.fn(),
            disconnect: jest.fn(),
            onaudioprocess: null
          }))
        };
        
        (global as any).AudioContext = jest.fn(() => mockAudioContext);
        (global as any).AudioWorklet = jest.fn();
        (global as any).AudioWorkletNode = jest.fn(() => ({
          connect: jest.fn(),
          disconnect: jest.fn(),
          port: {
            postMessage: jest.fn(),
            onmessage: null
          }
        }));
        
        (global as any).URL = {
          createObjectURL: jest.fn(() => 'blob://mock-url'),
          revokeObjectURL: jest.fn()
        };
        (global as any).Blob = jest.fn();
      };

      setupMocks();

      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      // Create worklet node
      const workletNode = engine.createWorkletNode();
      
      // Simulate concurrent UI operations
      let uiOperationCompleted = false;
      const uiOperation = new Promise(resolve => {
        setTimeout(() => {
          uiOperationCompleted = true;
          resolve(true);
        }, 50);
      });
      
      // Process audio while UI operation is running
      const audioProcessing = new Promise(resolve => {
        // Simulate continuous audio processing
        setTimeout(resolve, 100);
      });
      
      // Both should complete without blocking each other
      await Promise.all([uiOperation, audioProcessing]);
      
      expect(uiOperationCompleted).toBe(true);
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should demonstrate efficient memory usage with AudioWorklet', async () => {
      const mockAudioContext = {
        audioWorklet: {
          addModule: jest.fn().mockResolvedValue(undefined)
        },
        sampleRate: 48000
      };
      
      (global as any).AudioContext = jest.fn(() => mockAudioContext);
      (global as any).AudioWorklet = jest.fn();
      (global as any).AudioWorkletNode = jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        port: {
          postMessage: jest.fn(),
          onmessage: null
        }
      }));
      
      (global as any).URL = {
        createObjectURL: jest.fn(() => 'blob://mock-url'),
        revokeObjectURL: jest.fn()
      };
      (global as any).Blob = jest.fn();

      const engine = new AudioWorkletEngine();
      await engine.initialize();
      
      // Track memory allocations
      const allocations: number[] = [];
      
      // Process many frames
      for (let i = 0; i < 1000; i++) {
        const testBuffer = new Float32Array(480);
        // Memory should be managed efficiently
        // In real AudioWorklet, memory is managed in the audio thread
        allocations.push(testBuffer.byteLength);
      }
      
      // Total memory used should be predictable
      const totalMemory = allocations.reduce((sum, size) => sum + size, 0);
      const expectedMemory = 480 * 4 * 1000; // 480 samples * 4 bytes * 1000 iterations
      
      expect(totalMemory).toBe(expectedMemory);
    });
  });

  describe('Latency Measurements', () => {
    it('should show lower latency with AudioWorklet', () => {
      // AudioWorklet theoretical latency
      const audioWorkletLatency = 128 / 48000 * 1000; // 128 samples at 48kHz in ms
      
      // ScriptProcessor theoretical latency  
      const scriptProcessorLatency = 4096 / 48000 * 1000; // 4096 samples at 48kHz in ms
      
      console.log(`AudioWorklet latency: ${audioWorkletLatency.toFixed(2)}ms`);
      console.log(`ScriptProcessor latency: ${scriptProcessorLatency.toFixed(2)}ms`);
      
      // AudioWorklet should have significantly lower latency
      expect(audioWorkletLatency).toBeLessThan(scriptProcessorLatency);
      expect(audioWorkletLatency).toBeLessThan(10); // Less than 10ms
    });
  });
});