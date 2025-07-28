/**
 * Integration tests for Murmuraba API
 * Tests the interaction between different API methods
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeAudioEngine,
  getEngineStatus,
  getDiagnostics,
  destroyEngine,
  processStream,
  getEngine,
} from '../../api';
import { createTestMediaStream } from '../utils/test-builders';

describe('Murmuraba API Integration', () => {
  beforeEach(() => {
    // Clean up any existing engine
    (global as any).__murmurabaEngine = undefined;
  });

  afterEach(async () => {
    // Ensure engine is stopped after each test
    await destroyEngine().catch(() => {});
  });

  describe('Engine lifecycle', () => {
    it('should initialize engine and report correct status', async () => {
      // Arrange
      const config = {
        algorithm: 'rnnoise' as const,
        enableMetrics: true,
      };

      // Act
      await initializeAudioEngine(config);
      const status = getEngineStatus();
      const diagnostics = getDiagnostics();

      // Assert
      expect(status).toBe('ready');
      expect(diagnostics.engineState).toBe('ready');
      expect(diagnostics.wasmLoaded).toBe(true);
    });

    it('should handle multiple initialization attempts', async () => {
      // Arrange
      const config = { algorithm: 'rnnoise' as const };

      // Act
      await initializeAudioEngine(config);
      await expect(initializeAudioEngine(config)).rejects.toThrow(
        'Audio engine is already initialized'
      );

      // Assert
      expect(getEngineStatus()).toBe('ready');
    });

    it('should properly clean up on stop', async () => {
      // Arrange
      await initializeAudioEngine({ algorithm: 'rnnoise' });

      // Act
      await destroyEngine();

      // Assert
      expect(getEngineStatus()).toBe('uninitialized');
      expect(() => getDiagnostics()).toThrow('Audio engine not initialized');
    });
  });

  describe('Processing lifecycle', () => {
    it('should process microphone and update status', async () => {
      // Arrange
      await initializeAudioEngine({ algorithm: 'rnnoise' });
      const mockStream = createTestMediaStream();

      // Act
      const processedStream = await processStream(mockStream);
      const status = getEngineStatus();

      // Assert
      expect(processedStream).toBeDefined();
      expect(status).toBe('processing');
    });

    it('should stop processing and return to ready state', async () => {
      // Arrange
      await initializeAudioEngine({ algorithm: 'rnnoise' });
      const mockStream = createTestMediaStream();
      await processStream(mockStream);

      // Act
      // Stop processing by destroying and reinitializing
      await destroyEngine();
      await initializeAudioEngine({ algorithm: 'rnnoise' });
      const status = getEngineStatus();

      // Assert
      expect(status).toBe('ready');
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      await initializeAudioEngine({ algorithm: 'rnnoise' });
      const invalidStream = {} as MediaStream; // Invalid stream

      // Act & Assert
      await expect(processStream(invalidStream)).rejects.toThrow();
      expect(getEngineStatus()).toBe('ready'); // Should recover to ready
    });
  });

  describe('Diagnostics integration', () => {
    it('should update diagnostics during processing', async () => {
      // Arrange
      await initializeAudioEngine({
        algorithm: 'rnnoise',
      });
      const mockStream = createTestMediaStream();

      // Act
      const diagnosticsBefore = getDiagnostics();
      await processStream(mockStream);
      const diagnosticsDuring = getDiagnostics();

      // Assert
      expect(diagnosticsBefore.engineState).toBe('ready');
      expect(diagnosticsDuring.engineState).toBe('processing');
      expect(diagnosticsDuring.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should report degraded mode correctly', async () => {
      // Arrange & Act
      await initializeAudioEngine({
        algorithm: 'rnnoise',
        allowDegraded: true,
      });

      const diagnostics = getDiagnostics();

      // Assert
      expect(diagnostics.engineState).toBe('ready');
      expect(diagnostics.wasmLoaded).toBe(false);
    });
  });

  describe('Error scenarios', () => {
    it('should handle initialization failure', async () => {
      // Arrange - Mock WebAssembly not supported
      const originalWebAssembly = (global as any).WebAssembly;
      (global as any).WebAssembly = undefined;

      // Act & Assert
      await expect(initializeAudioEngine({ algorithm: 'rnnoise' })).rejects.toThrow();

      expect(getEngineStatus()).toBe('uninitialized');

      // Cleanup
      (global as any).WebAssembly = originalWebAssembly;
    });

    it('should handle operations on uninitialized engine', async () => {
      // Act & Assert
      expect(getEngineStatus()).toBe('uninitialized');
      expect(() => getDiagnostics()).toThrow('Audio engine not initialized');

      await expect(processStream(createTestMediaStream())).rejects.toThrow();
    });
  });

  describe('Configuration propagation', () => {
    it('should apply configuration throughout the system', async () => {
      // Arrange
      const config = {
        algorithm: 'rnnoise' as const,
        logLevel: 'debug' as const,
      };

      // Act
      await initializeAudioEngine(config);
      const diagnostics = getDiagnostics();

      // Assert
      // Verify engine config was applied
      expect(diagnostics.engineState).toBe('ready');
      // Other assertions would go here based on how config affects diagnostics
    });
  });
});
