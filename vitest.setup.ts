import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { setupAllAudioMocks } from './packages/murmuraba/src/__tests__/mocks/webAudioMocks';

console.log('\n🚀 ========== ROOT VITEST SETUP STARTING ========== 🚀\n');

// Setup happy-dom properly
if (typeof window !== 'undefined') {
  // Ensure document.body exists
  if (!document.body) {
    const body = document.createElement('body');
    document.documentElement.appendChild(body);
  }
}

// Global mocks that were missing
global.URL = global.URL || {
  createObjectURL: vi.fn(() => `blob:mock-url-${Date.now()}`),
  revokeObjectURL: vi.fn()
};

// Mock fetch for blob operations
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.startsWith('blob:')) {
    return Promise.resolve({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['mock audio data'], { type: 'audio/webm' })),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
    });
  }
  // Mock for RNNoise WASM file
  if (url.includes('rnnoise-fixed.js') || url.includes('localhost:3000')) {
    return Promise.resolve({
      ok: true,
      text: vi.fn().mockResolvedValue('// Mock RNNoise WASM module'),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
    });
  }
  return Promise.reject(new Error('Not found'));
});

// Mock performance.memory
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 1000000,
    jsHeapSizeLimit: 2000000,
  },
  writable: true,
  configurable: true,
});


// Mock Worker
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
})) as any;

// Setup all Web Audio mocks from the package
setupAllAudioMocks();

// Mock lamejs for MP3 encoding
vi.mock('lamejs', () => ({
  Mp3Encoder: vi.fn().mockImplementation(() => ({
    encodeBuffer: vi.fn().mockReturnValue(new Int8Array(100)),
    flush: vi.fn().mockReturnValue(new Int8Array(50)),
  })),
}));

console.log('✅ ========== ROOT VITEST SETUP COMPLETE ========== ✅\n');