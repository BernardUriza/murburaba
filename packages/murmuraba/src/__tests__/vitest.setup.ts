import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { setupAllAudioMocks } from './mocks/webAudioMocks';

console.log('\n🚀 ========== VITEST SETUP STARTING ========== 🚀\n');

// Setup all Web Audio mocks
setupAllAudioMocks();

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
global.Blob = MockBlob as any;

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

// Mock console methods - but allow them in debug mode
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: vi.fn((...args) => {
      // Only show emoji logs
      if (args.some(arg => typeof arg === 'string' && /[\u{1F300}-\u{1F9FF}]/u.test(arg))) {
        console.info(...args);
      }
    }),
    error: vi.fn((...args) => console.info('❌', ...args)),
    warn: vi.fn((...args) => console.info('⚠️', ...args)),
    info: console.info, // Keep info for our logs
    debug: vi.fn(),
  };
}

// Custom matchers for Vitest
expect.extend({
  toBeValidChunk(received) {
    const pass = 
      received &&
      typeof received.id === 'string' &&
      typeof received.startTime === 'number' &&
      typeof received.endTime === 'number' &&
      received.endTime > received.startTime;
    
    return {
      pass,
      message: () => 
        pass
          ? `expected ${received} not to be a valid chunk`
          : `expected ${received} to be a valid chunk with id, startTime, and endTime`,
    };
  },
});

console.log('✅ ========== VITEST SETUP COMPLETE ========== ✅\n');