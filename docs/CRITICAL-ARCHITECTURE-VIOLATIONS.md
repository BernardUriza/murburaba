# 🚨 CRITICAL ARCHITECTURE VIOLATIONS - AUDIT RESULTS

## DISCOVERED: Multiple Service Instances Bug

### Root Cause
The MetricsManager event listener bug was caused by duplicate service instances created outside the DI container.

### Violations Found (2025-01-28)

#### 1. MurmubaraEngine.ts (Lines 59-69)
```typescript
// VIOLATION: Direct instantiation instead of DI
this.logger = new Logger('[Murmuraba]');
this.stateManager = new StateManager();
this.workerManager = new WorkerManager(this.logger);
this.metricsManager = new MetricsManager(); // ← BUG SOURCE
```

#### 2. ServiceLoader.ts
```typescript
// VIOLATION: Creates new instances instead of using container
return new MetricsManager();
return new WorkerManager(logger);
```

#### 3. WorkerManagerAdapter.ts
```typescript
// VIOLATION: Adapter creates its own instance
this.workerManager = new WorkerManager(logger);
```

#### 4. LoggingManager.ts
```typescript
// VIOLATION: Singleton pattern instead of DI
this.logger = new Logger('[MRB]');
```

## Impact Analysis

### Broken Flows
1. **MetricsManager Events**: Engine updates its own instance, Redux Provider listens to DI instance
2. **State Synchronization**: Multiple StateManager instances = inconsistent state
3. **Logging**: Multiple Logger instances = fragmented logs
4. **Worker Management**: Duplicate WorkerManagers = resource leaks

### Architecture Diagram
```
CURRENT (BROKEN):
┌─────────────────┐     ┌─────────────────┐
│ MurmubaraEngine │     │  DI Container   │
│ new Metrics()   │ ≠   │ Metrics Single  │
│ new State()     │ ≠   │ State Single    │
│ new Worker()    │ ≠   │ Worker Single   │
└─────────────────┘     └─────────────────┘
        ↓                        ↓
   [Updates Here]          [Redux Listens Here]
        ↓                        ↓
   ❌ DISCONNECTED          ❌ NO EVENTS

REQUIRED:
┌─────────────────┐
│  DI Container   │
│ All Singletons  │
└─────────────────┘
        ↓
   [All Services]
        ↓
   ✅ CONNECTED
```

## Refactoring Rules

### RULE 1: No Direct Instantiation
```typescript
// ❌ FORBIDDEN
this.logger = new Logger();

// ✅ REQUIRED
this.logger = container.get<ILogger>(TOKENS.Logger);
```

### RULE 2: Constructor Injection Only
```typescript
// ❌ FORBIDDEN
class Engine {
  constructor() {
    this.metrics = new MetricsManager();
  }
}

// ✅ REQUIRED
class Engine {
  constructor(
    private metrics: IMetricsManager,
    private logger: ILogger
  ) {}
}
```

### RULE 3: Factory Pattern for Complex Creation
```typescript
// ✅ REQUIRED
class EngineFactory {
  static create(container: DIContainer): Engine {
    return new Engine(
      container.get(TOKENS.MetricsManager),
      container.get(TOKENS.Logger)
    );
  }
}
```

## Testing Requirements

### Integration Test Template
```typescript
describe('Service Singleton Integrity', () => {
  it('MUST use same instance across all components', () => {
    const container = createTestContainer();
    const engine = createEngine(container);
    const processor = createProcessor(container);
    
    // Verify same instances
    expect(engine.getMetricsManager()).toBe(processor.getMetricsManager());
    expect(engine.getLogger()).toBe(processor.getLogger());
  });
  
  it('MUST propagate events between components', async () => {
    const container = createTestContainer();
    const engine = createEngine(container);
    const listener = jest.fn();
    
    // Listen on container's instance
    container.get(TOKENS.MetricsManager).on('update', listener);
    
    // Update through engine
    await engine.updateMetrics({ level: 0.5 });
    
    // Must receive event
    expect(listener).toHaveBeenCalledWith({ level: 0.5 });
  });
});
```

## Migration Priority

1. **CRITICAL**: MurmubaraEngine - Affects all audio processing
2. **HIGH**: ServiceLoader - Affects lazy loading
3. **MEDIUM**: WorkerManagerAdapter - Affects worker communication
4. **LOW**: LoggingManager - Cosmetic but should be fixed

## Deadline
All violations MUST be fixed before next release.