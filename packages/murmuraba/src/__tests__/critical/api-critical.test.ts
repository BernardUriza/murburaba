import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEngineStatus, getDiagnostics } from '../../api';

describe('Critical API Coverage', () => {
  beforeEach(() => {
    // Reset global engine
    (global as any).__murmurabaEngine = undefined;
  });

  describe('getEngineStatus', () => {
    it('should return uninitialized when no engine exists', () => {
      const status = getEngineStatus();
      expect(status).toBe('uninitialized');
    });

    it('should return engine status when engine exists', () => {
      // Mock engine
      (global as any).__murmurabaEngine = {
        getEngineStatus: () => 'ready'
      };
      
      const status = getEngineStatus();
      expect(status).toBe('ready');
    });
  });

  describe('getDiagnostics', () => {
    it('should return basic diagnostics when no engine exists', () => {
      const diagnostics = getDiagnostics();
      
      expect(diagnostics).toEqual({
        initialized: false,
        audioContextState: 'uninitialized',
        sampleRate: 0,
        rnnoiseSampleRate: 0,
        resamplerEnabled: false,
        wasmLoaded: false,
        degradedMode: false,
        currentLatency: 0,
        processingLoad: 0
      });
    });

    it('should return engine diagnostics when engine exists', () => {
      // Mock engine
      const mockDiagnostics = {
        initialized: true,
        audioContextState: 'running',
        sampleRate: 48000,
        rnnoiseSampleRate: 48000,
        resamplerEnabled: false,
        wasmLoaded: true,
        degradedMode: false,
        currentLatency: 10,
        processingLoad: 0.1
      };
      
      (global as any).__murmurabaEngine = {
        getDiagnostics: () => mockDiagnostics
      };
      
      const diagnostics = getDiagnostics();
      expect(diagnostics).toEqual(mockDiagnostics);
    });
  });
});