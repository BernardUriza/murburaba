/**
 * Global test setup
 * Configures test environment for all test suites
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { installGlobalMocks, uninstallGlobalMocks } from './mocks/global-mocks';
import './mocks/rnnoise-wasm.mock';

// Install global mocks before all tests
beforeAll(() => {
  installGlobalMocks();
  vi.useFakeTimers();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  // Reset any global engine state
  (global as any).__murmurabaEngine = undefined;
});

// Restore real timers and clean up after all tests
afterAll(() => {
  vi.useRealTimers();
  uninstallGlobalMocks();
});

// Global test utilities
export const createTestContext = () => ({
  audioContext: createMockAudioContext(),
  logger: createMockLogger(),
  metrics: createMockMetrics(),
});

// Mock factories
export const createMockAudioContext = () => ({
  state: 'running' as AudioContextState,
  sampleRate: 48000,
  currentTime: 0,
  destination: {} as AudioDestinationNode,
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(),
  close: vi.fn(),
});

export const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

export const createMockMetrics = () => ({
  recordMetric: vi.fn(),
  getMetric: vi.fn(),
  getAllMetrics: vi.fn(() => ({})),
});

// Test data generators
export const generateAudioData = (length: number = 1024): Float32Array => {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1; // Random values between -1 and 1
  }
  return data;
};

export const generateSilentAudioData = (length: number = 1024): Float32Array => {
  return new Float32Array(length);
};

export const generateNoisyAudioData = (length: number = 1024, noiseLevel: number = 0.1): Float32Array => {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    // Sine wave with noise
    const signal = Math.sin(2 * Math.PI * 440 * i / 48000);
    const noise = (Math.random() - 0.5) * noiseLevel;
    data[i] = signal + noise;
  }
  return data;
};