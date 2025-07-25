/**
 * Integration tests for Murmuraba API
 * Tests the interaction between different API methods
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  initializeMurmuraba, 
  getEngineStatus, 
  getDiagnostics,
  stopMurmuraba,
  processMicrophone,
  stopProcessing
} from '../../api';
import { createTestMediaStream } from '../utils/test-builders';

describe('Murmuraba API Integration', () => {
  beforeEach(() => {
    // Clean up any existing engine
    (global as any).__murmurabaEngine = undefined;
  });

  afterEach(async () => {
    // Ensure engine is stopped after each test
    await stopMurmuraba().catch(() => {});
  });

  describe('Engine lifecycle', () => {
    it('should initialize engine and report correct status', async () => {
      // Arrange
      const config = {
        algorithm: 'rnnoise' as const,
        enableMetrics: true,
      };

      // Act
      const initResult = await initializeMurmuraba(config);
      const status = getEngineStatus();
      const diagnostics = getDiagnostics();

      // Assert
      expect(initResult).toBe(true);
      expect(status).toBe('ready');
      expect(diagnostics.initialized).toBe(true);
      expect(diagnostics.wasmLoaded).toBe(true);
    });

    it('should handle multiple initialization attempts', async () => {
      // Arrange
      const config = { algorithm: 'rnnoise' as const };

      // Act
      const firstInit = await initializeMurmuraba(config);
      const secondInit = await initializeMurmuraba(config);
      
      // Assert
      expect(firstInit).toBe(true);
      expect(secondInit).toBe(true); // Should succeed but not reinitialize
      expect(getEngineStatus()).toBe('ready');
    });

    it('should properly clean up on stop', async () => {
      // Arrange
      await initializeMurmuraba({ algorithm: 'rnnoise' });
      
      // Act
      await stopMurmuraba();
      
      // Assert
      expect(getEngineStatus()).toBe('uninitialized');
      expect(getDiagnostics().initialized).toBe(false);
    });
  });

  describe('Processing lifecycle', () => {
    it('should process microphone and update status', async () => {
      // Arrange
      await initializeMurmuraba({ algorithm: 'rnnoise' });
      const mockStream = createTestMediaStream();
      
      // Act
      const processedStream = await processMicrophone(mockStream);
      const status = getEngineStatus();
      
      // Assert
      expect(processedStream).toBeDefined();
      expect(status).toBe('processing');
    });

    it('should stop processing and return to ready state', async () => {
      // Arrange
      await initializeMurmuraba({ algorithm: 'rnnoise' });
      const mockStream = createTestMediaStream();
      await processMicrophone(mockStream);
      
      // Act
      stopProcessing();
      const status = getEngineStatus();
      
      // Assert
      expect(status).toBe('ready');
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      await initializeMurmuraba({ algorithm: 'rnnoise' });
      const invalidStream = {} as MediaStream; // Invalid stream
      
      // Act & Assert
      await expect(processMicrophone(invalidStream)).rejects.toThrow();
      expect(getEngineStatus()).toBe('ready'); // Should recover to ready
    });
  });

  describe('Diagnostics integration', () => {
    it('should update diagnostics during processing', async () => {
      // Arrange
      await initializeMurmuraba({ 
        algorithm: 'rnnoise',
        enableMetrics: true 
      });
      const mockStream = createTestMediaStream();
      
      // Act
      const diagnosticsBefore = getDiagnostics();
      await processMicrophone(mockStream);
      const diagnosticsDuring = getDiagnostics();
      
      // Assert
      expect(diagnosticsBefore.audioContextState).toBe('running');
      expect(diagnosticsDuring.audioContextState).toBe('running');
      expect(diagnosticsDuring.sampleRate).toBeGreaterThan(0);
    });

    it('should report degraded mode correctly', async () => {
      // Arrange & Act
      await initializeMurmuraba({ 
        algorithm: 'rnnoise',
        enableDegradedMode: true,
        forceDegradedMode: true // Force degraded mode for testing
      });
      
      const diagnostics = getDiagnostics();
      
      // Assert
      expect(diagnostics.degradedMode).toBe(true);
      expect(diagnostics.wasmLoaded).toBe(false);
    });
  });

  describe('Error scenarios', () => {
    it('should handle initialization failure', async () => {
      // Arrange - Mock WebAssembly not supported
      const originalWebAssembly = (global as any).WebAssembly;
      (global as any).WebAssembly = undefined;
      
      // Act & Assert
      await expect(initializeMurmuraba({ algorithm: 'rnnoise' }))
        .rejects.toThrow();
      
      expect(getEngineStatus()).toBe('uninitialized');
      
      // Cleanup
      (global as any).WebAssembly = originalWebAssembly;
    });

    it('should handle operations on uninitialized engine', async () => {
      // Act & Assert
      expect(getEngineStatus()).toBe('uninitialized');
      expect(getDiagnostics().initialized).toBe(false);
      
      await expect(processMicrophone(createTestMediaStream()))
        .rejects.toThrow();
    });
  });

  describe('Configuration propagation', () => {
    it('should apply configuration throughout the system', async () => {
      // Arrange
      const config = {
        algorithm: 'rnnoise' as const,
        sampleRate: 16000,
        enableAGC: true,
        agcConfig: {
          targetLevel: 0.8,
          maxGain: 2.5,
        },
        enableMetrics: true,
        logLevel: 'debug' as const,
      };
      
      // Act
      await initializeMurmuraba(config);
      const diagnostics = getDiagnostics();
      
      // Assert
      expect(diagnostics.rnnoiseSampleRate).toBe(48000); // RNNoise always uses 48kHz
      // Other assertions would go here based on how config affects diagnostics
    });
  });
});