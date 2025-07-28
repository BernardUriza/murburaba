import { vi } from 'vitest';

export const mockRNNoiseModule = {
  _malloc: vi.fn((size: number) => 1000),
  _free: vi.fn(),
  _rnnoise_create: vi.fn(() => 1),
  _rnnoise_destroy: vi.fn(),
  _rnnoise_process_frame: vi.fn(() => 1),
  _rnnoise_get_size: vi.fn(() => 480),
  HEAPU8: new Uint8Array(65536),
  HEAPF32: new Float32Array(16384),
};

export const createRNNWasmModule = vi.fn(() => Promise.resolve(mockRNNoiseModule));

vi.mock('@jitsi/rnnoise-wasm', () => ({
  createRNNWasmModule,
}));
