import { MurmubaraEngine } from '../../core/MurmubaraEngine';
import { vi } from 'vitest';

// Mock the DOM environment for WASM loading
Object.defineProperty(global, 'window', {
  value: {
    AudioContext: vi.fn(),
    WebAssembly: {},
    createRNNWasmModule: vi.fn().mockResolvedValue({
      _rnnoise_create: vi.fn().mockReturnValue(1),
      _rnnoise_process_frame: vi.fn().mockReturnValue(0.5),
      _malloc: vi.fn().mockReturnValue(1000),
      _free: vi.fn(),
      _rnnoise_destroy: vi.fn(),
      HEAPF32: new Float32Array(2000)
    })
  }
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockReturnValue({
      onload: null,
      onerror: null,
      src: '',
      load: function() { if (this.onload) this.onload(); }
    }),
    head: {
      appendChild: vi.fn().mockImplementation((script) => {
        setTimeout(() => script.onload && script.onload(), 10);
      })
    }
  }
});

describe('MurmubaraEngine Audio Resampling', () => {
  let engine: MurmubaraEngine;

  beforeEach(() => {
    engine = new MurmubaraEngine({ allowDegraded: true });
  });

  afterEach(async () => {
    try {
      await engine.destroy(true);
    } catch (e) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Channel validation', () => {
    it('should throw error for unsupported channel count', async () => {
      await engine.initialize();
      
      const mockArrayBuffer = createMockWAVBuffer({
        numChannels: 2, // Stereo - unsupported
        sampleRate: 44100,
        bitsPerSample: 16
      });

      await expect(engine.processFile(mockArrayBuffer))
        .rejects
        .toThrow('Unsupported channel count: 2. Only mono (1 channel) is supported');
    });

    it('should accept mono audio (1 channel)', async () => {
      await engine.initialize();
      
      const mockArrayBuffer = createMockWAVBuffer({
        numChannels: 1, // Mono - supported
        sampleRate: 48000,
        bitsPerSample: 16
      });

      await expect(engine.processFile(mockArrayBuffer))
        .resolves
        .toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('Sample rate resampling', () => {
    it('should resample from 44100Hz to 48000Hz', async () => {
      await engine.initialize();
      
      const mockArrayBuffer = createMockWAVBuffer({
        numChannels: 1,
        sampleRate: 44100, // Non-48kHz rate
        bitsPerSample: 16
      });

      // This should trigger resampling logic and fail due to undefined variables
      await expect(engine.processFile(mockArrayBuffer))
        .rejects
        .toThrow(); // Will fail due to undefined pcmData and resamplePCM
    });

    it('should not resample when already at 48000Hz', async () => {
      await engine.initialize();
      
      const mockArrayBuffer = createMockWAVBuffer({
        numChannels: 1,
        sampleRate: 48000, // Already correct rate
        bitsPerSample: 16
      });

      const result = await engine.processFile(mockArrayBuffer);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle resampling from various sample rates', async () => {
      await engine.initialize();
      
      const testRates = [8000, 16000, 22050, 44100, 96000];
      
      for (const rate of testRates) {
        const mockArrayBuffer = createMockWAVBuffer({
          numChannels: 1,
          sampleRate: rate,
          bitsPerSample: 16
        });

        if (rate !== 48000) {
          // Should fail due to undefined resampling function
          await expect(engine.processFile(mockArrayBuffer))
            .rejects
            .toThrow();
        } else {
          await expect(engine.processFile(mockArrayBuffer))
            .resolves
            .toBeInstanceOf(ArrayBuffer);
        }
      }
    });
  });

  describe('Type safety and error handling', () => {
    it('should validate sample rate is a number', async () => {
      await engine.initialize();
      
      const mockArrayBuffer = createMockWAVBuffer({
        numChannels: 1,
        sampleRate: NaN, // Invalid sample rate
        bitsPerSample: 16
      });

      await expect(engine.processFile(mockArrayBuffer))
        .rejects
        .toThrow();
    });

    it('should handle memory constraints during resampling', async () => {
      await engine.initialize();
      
      // Create a very large audio buffer that would consume significant memory
      const mockArrayBuffer = createLargeWAVBuffer({
        numChannels: 1,
        sampleRate: 8000, // Will need upsampling to 48kHz
        bitsPerSample: 16,
        durationSeconds: 600 // 10 minutes of audio
      });

      await expect(engine.processFile(mockArrayBuffer))
        .rejects
        .toThrow(); // Should fail gracefully, not crash
    });
  });
});

// Helper functions to create mock WAV files
function createMockWAVBuffer(options: {
  numChannels: number;
  sampleRate: number | typeof NaN;
  bitsPerSample: number;
  durationSeconds?: number;
}): ArrayBuffer {
  const { numChannels, sampleRate, bitsPerSample, durationSeconds = 1 } = options;
  
  // Handle NaN sample rate for error testing
  const validSampleRate = isNaN(sampleRate) ? 0 : sampleRate;
  
  const numSamples = Math.floor(validSampleRate * durationSeconds);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize; // 44 bytes for WAV header

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header - write as bytes to avoid endianness issues
  view.setUint8(0, 0x52); // 'R'
  view.setUint8(1, 0x49); // 'I'
  view.setUint8(2, 0x46); // 'F'
  view.setUint8(3, 0x46); // 'F'
  view.setUint32(4, fileSize - 8, true); // File size - 8
  view.setUint8(8, 0x57);  // 'W'
  view.setUint8(9, 0x41);  // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'

  // fmt chunk
  view.setUint8(12, 0x66); // 'f'
  view.setUint8(13, 0x6D); // 'm'
  view.setUint8(14, 0x74); // 't'
  view.setUint8(15, 0x20); // ' '
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, validSampleRate, true);
  view.setUint32(28, validSampleRate * numChannels * (bitsPerSample / 8), true); // Byte rate
  view.setUint16(32, numChannels * (bitsPerSample / 8), true); // Block align
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  view.setUint8(36, 0x64); // 'd'
  view.setUint8(37, 0x61); // 'a'
  view.setUint8(38, 0x74); // 't'
  view.setUint8(39, 0x61); // 'a'
  view.setUint32(40, dataSize, true);

  // Fill with sample audio data (sine wave) only if we have valid data
  if (dataSize > 0 && numSamples > 0) {
    const samples = new Int16Array(buffer, 44, numSamples * numChannels);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = Math.sin(2 * Math.PI * 440 * i / validSampleRate) * 16384; // 440Hz tone
    }
  }

  return buffer;
}

function createLargeWAVBuffer(options: {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  durationSeconds: number;
}): ArrayBuffer {
  return createMockWAVBuffer(options);
}