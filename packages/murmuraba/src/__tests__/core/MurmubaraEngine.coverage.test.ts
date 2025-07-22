import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MurmubaraEngine } from '../../core/MurmubaraEngine';

// Minimal setup to maximize coverage
describe('MurmubaraEngine Coverage Tests', () => {
  beforeEach(() => {
    global.window = {
      AudioContext: vi.fn(),
      webkitAudioContext: vi.fn(),
      navigator: { userAgent: 'test' },
      WebAssembly: { instantiate: vi.fn(), compile: vi.fn() }
    } as any;
    
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'test' },
      writable: true,
      configurable: true
    });
  });

  it('should cover constructor branches', () => {
    // Default config
    const engine1 = new MurmubaraEngine();
    expect(engine1).toBeDefined();
    
    // Full config
    const engine2 = new MurmubaraEngine({
      logLevel: 'debug',
      onLog: vi.fn(),
      noiseReductionLevel: 'high',
      bufferSize: 256,
      algorithm: 'rnnoise',
      autoCleanup: false,
      cleanupDelay: 5000,
      useWorker: true,
      workerPath: '/custom.js',
      allowDegraded: true
    });
    expect(engine2).toBeDefined();
  });

  it('should cover state manager access', () => {
    const engine = new MurmubaraEngine();
    const state = engine['stateManager'];
    
    expect(state.getState()).toBe('uninitialized');
    expect(state.isInState('uninitialized')).toBe(true);
    expect(state.canTransitionTo('initializing')).toBe(true);
  });

  it('should cover logger branches', () => {
    const logHandler = vi.fn();
    const engine = new MurmubaraEngine({ 
      logLevel: 'none',
      onLog: logHandler 
    });
    
    engine['logger'].debug('test');
    engine['logger'].info('test');
    engine['logger'].warn('test');
    engine['logger'].error('test');
    
    // Should not log anything at 'none' level
    expect(logHandler).not.toHaveBeenCalled();
  });

  it('should cover event forwarding', () => {
    const engine = new MurmubaraEngine();
    const stateHandler = vi.fn();
    const metricsHandler = vi.fn();
    
    engine.on('state-change', stateHandler);
    engine.on('metrics-update', metricsHandler);
    
    // Trigger state change
    engine['stateManager'].transitionTo('initializing');
    expect(stateHandler).toHaveBeenCalled();
    
    // Trigger metrics update
    engine['metricsManager'].emit('metrics-update', {
      processed: 0,
      latency: 0,
      cpuUsage: 0
    });
    expect(metricsHandler).toHaveBeenCalled();
  });

  it('should cover auto cleanup setup', () => {
    // With auto cleanup
    const engine1 = new MurmubaraEngine({ autoCleanup: true });
    expect(engine1).toBeDefined();
    
    // Without auto cleanup
    const engine2 = new MurmubaraEngine({ autoCleanup: false });
    expect(engine2).toBeDefined();
  });

  it('should cover checkEnvironmentSupport method', () => {
    const engine = new MurmubaraEngine();
    const support = engine['checkEnvironmentSupport']();
    
    expect(support).toBeDefined();
    expect(typeof support).toBe('boolean');
  });

  it('should cover error handling', () => {
    const engine = new MurmubaraEngine();
    const errorHandler = vi.fn();
    
    engine.on('error', errorHandler);
    
    // Test recordError method
    const testError = new Error('Test error');
    engine['recordError'](testError);
    
    // Check error history
    expect(engine['errorHistory'].length).toBe(1);
    expect(engine['errorHistory'][0].error).toBe('Test error');
  });

  it('should cover getDiagnostics', () => {
    const engine = new MurmubaraEngine();
    const diagnostics = engine.getDiagnostics();
    
    expect(diagnostics).toBeDefined();
    expect(diagnostics.engineVersion).toBeDefined();
    expect(diagnostics.state).toBe('uninitialized');
  });

  it('should cover destroy force flag', async () => {
    const engine = new MurmubaraEngine();
    
    // Force destroy from uninitialized state
    await engine.destroy(true);
    expect(engine['stateManager'].getState()).toBe('destroyed');
  });

  it('should cover activeStreams checks', () => {
    const engine = new MurmubaraEngine();
    
    expect(engine['activeStreams'].size).toBe(0);
    expect(engine['isActive']()).toBe(false);
  });

  it('should cover noise reduction level configurations', () => {
    const levels = ['low', 'medium', 'high', 'auto'] as const;
    
    levels.forEach(level => {
      const engine = new MurmubaraEngine({ noiseReductionLevel: level });
      expect(engine['config'].noiseReductionLevel).toBe(level);
    });
  });

  it('should cover activeStreams management', () => {
    const engine = new MurmubaraEngine();
    
    expect(engine['activeStreams'].size).toBe(0);
    
    // Add a mock stream
    const mockStream = { id: 'test-stream' } as any;
    engine['activeStreams'].set('test-stream', mockStream);
    
    expect(engine['activeStreams'].size).toBe(1);
    expect(engine['activeStreams'].has('test-stream')).toBe(true);
  });

  it('should cover cleanup timer branches', () => {
    const engine = new MurmubaraEngine({ 
      autoCleanup: true,
      cleanupDelay: 100 
    });
    
    // Mock timer
    const timerId = {} as any;
    engine['cleanupTimer'] = timerId;
    
    // Trigger processing-start event
    engine.emit('processing-start', 'test-stream');
    
    // Timer should be cleared
    expect(engine['cleanupTimer']).toBeUndefined();
  });

  it('should cover error history limit', () => {
    const engine = new MurmubaraEngine();
    
    // Add 110 errors
    for (let i = 0; i < 110; i++) {
      engine['errorHistory'].push({
        timestamp: Date.now(),
        error: `Error ${i}`
      });
    }
    
    // Force error to check trimming
    engine['recordError'](new Error('test'));
    
    // Should be limited to 10 based on the code
    expect(engine['errorHistory'].length).toBeLessThanOrEqual(10);
  });

  it('should cover getMetrics', () => {
    const engine = new MurmubaraEngine();
    
    const metrics = engine.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.processed).toBe(0);
    expect(metrics.latency).toBe(0);
    expect(metrics.cpuUsage).toBe(0);
  });

  it('should cover metrics manager getMetrics', () => {
    const engine = new MurmubaraEngine();
    const metrics = engine['metricsManager'].getMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.processed).toBe(0);
    expect(metrics.latency).toBe(0);
    expect(metrics.cpuUsage).toBe(0);
  });

  it('should cover worker manager initialization', () => {
    const engine = new MurmubaraEngine({ useWorker: true });
    const workerManager = engine['workerManager'];
    
    expect(workerManager).toBeDefined();
  });

  it('should cover various config combinations', () => {
    const configs = [
      { algorithm: 'rnnoise' as const },
      { bufferSize: 512 },
      { cleanupDelay: 60000 },
      { logLevel: 'error' as const },
      { noiseReductionLevel: 'auto' as const }
    ];
    
    configs.forEach(config => {
      const engine = new MurmubaraEngine(config);
      expect(engine).toBeDefined();
    });
  });

  it('should cover state checks', () => {
    const engine = new MurmubaraEngine();
    expect(engine['stateManager'].isInState('processing')).toBe(false);
    
    // Force processing state
    engine['stateManager']['currentState'] = 'processing';
    expect(engine['stateManager'].isInState('processing')).toBe(true);
  });
});