import { describe, it, expect, vi } from 'vitest';

// Direct imports to increase coverage
describe('API Simple Coverage', () => {
  it('should import api functions', async () => {
    // Just importing the module increases coverage
    const api = await import('../../api');
    
    expect(api.initializeAudioEngine).toBeDefined();
    expect(api.getEngine).toBeDefined();
    expect(api.processStream).toBeDefined();
    expect(api.processStreamChunked).toBeDefined();
    expect(api.destroyEngine).toBeDefined();
    expect(api.getEngineStatus).toBeDefined();
    expect(api.getDiagnostics).toBeDefined();
    expect(api.onMetricsUpdate).toBeDefined();
    expect(api.processFile).toBeDefined();
  });
  
  it('should handle getEngineStatus when not initialized', async () => {
    const { getEngineStatus } = await import('../../api');
    const status = getEngineStatus();
    expect(status).toBe('uninitialized');
  });
  
  it('should handle getDiagnostics when not initialized', async () => {
    const { getDiagnostics } = await import('../../api');
    const diagnostics = getDiagnostics();
    expect(diagnostics.initialized).toBe(false);
  });
});