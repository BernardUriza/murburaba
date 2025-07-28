import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MurmubaraEngineFactory } from '../../core/MurmubaraEngineFactory';
import { DIContainer, TOKENS } from '../../core/DIContainer';
import { MetricsManager } from '../../managers/MetricsManager';
import { Logger } from '../../core/Logger';
import { StateManager } from '../../core/StateManager';
import { WorkerManager } from '../../managers/WorkerManager';

describe('Singleton Integrity Tests', () => {
  let container: DIContainer;

  beforeEach(() => {
    // Clean up any global state
    vi.clearAllMocks();
  });

  it('should use the same MetricsManager instance across all services', () => {
    // Create engine through factory
    const engine = MurmubaraEngineFactory.create();
    const engineWithDI = engine as any;
    
    // Get the container
    const container = engineWithDI.getContainer();
    
    // Get MetricsManager instance from container
    const metricsManagerFromContainer = container.get(TOKENS.MetricsManager);
    
    // Get MetricsManager from engine
    const metricsManagerFromEngine = engineWithDI.metricsManager;
    
    // They should be the same instance
    expect(metricsManagerFromEngine).toBe(metricsManagerFromContainer);
  });

  it('should propagate events correctly between services', () => {
    // Create engine through factory
    const engine = MurmubaraEngineFactory.create();
    const engineWithDI = engine as any;
    
    // Get MetricsManager instance
    const metricsManager = engineWithDI.metricsManager as MetricsManager;
    
    // Set up event listener after creation to avoid initial events
    const metricsUpdateSpy = vi.fn();
    engine.on('metrics-update', metricsUpdateSpy);
    
    // Clear any initial calls
    metricsUpdateSpy.mockClear();
    
    // Trigger metrics update
    metricsManager.updateInputLevel(0.5);
    metricsManager.updateOutputLevel(0.3);
    
    // Emit metrics update event (simulating what would happen in production)
    metricsManager.emit('metrics-update', metricsManager.getMetrics());
    
    // Check if event was received
    expect(metricsUpdateSpy).toHaveBeenCalled();
    const lastCall = metricsUpdateSpy.mock.calls[metricsUpdateSpy.mock.calls.length - 1];
    const metrics = lastCall[0];
    expect(metrics.inputLevel).toBe(0.5);
    expect(metrics.outputLevel).toBe(0.3);
  });

  it('should not create duplicate instances when multiple components access the same service', () => {
    const engine = MurmubaraEngineFactory.create();
    const engineWithDI = engine as any;
    const container = engineWithDI.getContainer();
    
    // Get multiple references to the same services
    const logger1 = container.get(TOKENS.Logger);
    const logger2 = container.get(TOKENS.Logger);
    const stateManager1 = container.get(TOKENS.StateManager);
    const stateManager2 = container.get(TOKENS.StateManager);
    const metricsManager1 = container.get(TOKENS.MetricsManager);
    const metricsManager2 = container.get(TOKENS.MetricsManager);
    const workerManager1 = container.get(TOKENS.WorkerManager);
    const workerManager2 = container.get(TOKENS.WorkerManager);
    
    // All references should point to the same instance
    expect(logger1).toBe(logger2);
    expect(stateManager1).toBe(stateManager2);
    expect(metricsManager1).toBe(metricsManager2);
    expect(workerManager1).toBe(workerManager2);
  });

  it('should use injected services in MurmubaraEngine constructor', async () => {
    // Create custom instances
    const customLogger = new Logger('[CustomTest]');
    const customStateManager = new StateManager();
    const customMetricsManager = new MetricsManager();
    const customWorkerManager = new WorkerManager(customLogger);
    
    // Import MurmubaraEngine directly to test constructor injection
    const { MurmubaraEngine } = await import('../../core/MurmubaraEngine');
    
    // Create engine with injected dependencies
    const engine = new MurmubaraEngine(
      customLogger,
      customStateManager,
      customWorkerManager,
      customMetricsManager,
      {}
    );
    
    // Verify injected instances are used (they are private, so we need to access them via any)
    const engineWithPrivateAccess = engine as any;
    expect(engineWithPrivateAccess.logger).toBe(customLogger);
    expect(engineWithPrivateAccess.stateManager).toBe(customStateManager);
    expect(engineWithPrivateAccess.metricsManager).toBe(customMetricsManager);
    expect(engineWithPrivateAccess.workerManager).toBe(customWorkerManager);
  });

  it('should maintain singleton integrity when creating multiple engines', () => {
    // Create first engine
    const engine1 = MurmubaraEngineFactory.create();
    const container1 = (engine1 as any).getContainer();
    
    // Create second engine
    const engine2 = MurmubaraEngineFactory.create();
    const container2 = (engine2 as any).getContainer();
    
    // Each engine should have its own container and instances
    expect(container1).not.toBe(container2);
    expect(container1.get(TOKENS.MetricsManager)).not.toBe(container2.get(TOKENS.MetricsManager));
    expect(container1.get(TOKENS.Logger)).not.toBe(container2.get(TOKENS.Logger));
  });
});