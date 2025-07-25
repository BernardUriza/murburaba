import { vi } from 'vitest';
import { mockRNNoiseModule } from './rnnoise-wasm.mock';

vi.mock('../../utils/rnnoise-loader', () => ({
  loadRNNoiseModule: vi.fn(() => Promise.resolve(mockRNNoiseModule)),
}));