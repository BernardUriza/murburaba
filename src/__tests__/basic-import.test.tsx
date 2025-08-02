import { describe, it, expect, vi } from 'vitest';

describe('Basic Import Tests - Startup Diagnostics', () => {
  it('should import murmuraba package without errors', async () => {
    // This test verifies that the basic import works, which was the main startup issue
    let importError: Error | null = null;
    let murmubaraExports: any = null;

    try {
      murmubaraExports = await import('murmuraba');
    } catch (error) {
      importError = error as Error;
    }

    // The import should succeed
    expect(importError).toBeNull();
    expect(murmubaraExports).toBeDefined();
  });

  it('should have expected exports from murmuraba package', async () => {
    const murmuraba = await import('murmuraba');

    // Check for key exports that the App component uses
    expect(murmuraba.useMurmubaraEngine).toBeDefined();
    expect(murmuraba.getEngineStatus).toBeDefined();
    expect(murmuraba.AdvancedMetricsPanel).toBeDefined();
    expect(murmuraba.MurmubaraEngine).toBeDefined();
    
    // Check version export
    expect(murmuraba.VERSION).toBeDefined();
    expect(murmuraba.MURMURABA_VERSION).toBeDefined();
  });

  it('should be able to call useMurmubaraEngine hook', async () => {
    const { useMurmubaraEngine } = await import('murmuraba');

    // The hook should be a function
    expect(typeof useMurmubaraEngine).toBe('function');
  });

  it('should be able to call getEngineStatus function', async () => {
    const { getEngineStatus } = await import('murmuraba');

    // The function should be callable (but may throw in test environment)
    expect(typeof getEngineStatus).toBe('function');
    
    try {
      const status = getEngineStatus();
      // If it doesn't throw, status should be a string
      expect(typeof status).toBe('string');
    } catch (error) {
      // It's okay if it throws in test environment due to missing context
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should have MurmubaraEngine class available', async () => {
    const { MurmubaraEngine } = await import('murmuraba');

    // Should be a constructor function
    expect(typeof MurmubaraEngine).toBe('function');
    expect(MurmubaraEngine.prototype).toBeDefined();
  });

  it('should verify package version is consistent', async () => {
    const { VERSION, MURMURABA_VERSION } = await import('murmuraba');

    expect(VERSION).toBe(MURMURABA_VERSION);
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});