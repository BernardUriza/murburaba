# 🏗️ Dependency Injection Pattern Guide

## Overview

This guide documents the Dependency Injection (DI) pattern used in the Murmuraba codebase to ensure proper service management and prevent architectural violations.

## Core Principles

### 1. **No Direct Service Instantiation**

❌ **WRONG**
```typescript
export class MurmubaraEngine {
  constructor(config: MurmubaraConfig) {
    this.logger = new Logger('[Murmuraba]'); // VIOLATION!
    this.metricsManager = new MetricsManager(); // VIOLATION!
  }
}
```

✅ **CORRECT**
```typescript
export class MurmubaraEngine {
  constructor(
    logger: ILogger,
    stateManager: IStateManager,
    workerManager: WorkerManager,
    metricsManager: IMetricsManager,
    config: MurmubaraConfig = {}
  ) {
    this.logger = logger; // Injected
    this.metricsManager = metricsManager; // Injected
  }
}
```

### 2. **Use Interfaces for Dependencies**

All major services should have corresponding interfaces:

```typescript
// Define interface
export interface ILogger {
  log(level: LogLevel, message: string, data?: any): void;
  error(message: string, error?: Error | unknown, data?: any): void;
  // ... other methods
}

// Accept interface in constructor
constructor(logger: ILogger) {
  this.logger = logger;
}
```

### 3. **Factory Pattern for Complex Objects**

Use factories to create instances with all dependencies properly injected:

```typescript
export class MurmubaraEngineFactory {
  static create(config?: MurmubaraConfig): MurmubaraEngine {
    const container = new DIContainer();
    
    // Register services
    container.bindSingleton(TOKENS.Logger, () => new Logger('[Murmuraba]'));
    container.bindSingleton(TOKENS.MetricsManager, () => new MetricsManager());
    // ... other services
    
    // Get instances
    const logger = container.get<ILogger>(TOKENS.Logger);
    const metricsManager = container.get<IMetricsManager>(TOKENS.MetricsManager);
    
    // Create with dependencies
    return new MurmubaraEngine(logger, stateManager, workerManager, metricsManager, config);
  }
}
```

## Service Categories

### 1. **Singleton Services** (Must use DI)
These services should have only one instance across the application:
- `Logger`
- `StateManager`
- `MetricsManager`
- `WorkerManager`
- `EventEmitter` (for global events)

### 2. **Per-Instance Components** (Can use `new`)
These are created dynamically and can be instantiated directly:
- `ChunkProcessor` - Created per audio stream
- `SimpleAGC` - Created per audio context
- `AudioResampler` - Utility class
- `EventEmitter` - When used for local events

### 3. **Singletons Outside DI** (Special cases)
- `LoggingManager` - Global singleton for cross-cutting logging concerns

## Implementation Checklist

When creating a new service:

- [ ] Define an interface in `src/core/interfaces/`
- [ ] Implement the interface
- [ ] Add a token to `DIContainer` TOKENS
- [ ] Register in `MurmubaraEngineFactory` or `ServiceLoader`
- [ ] Accept interface (not concrete class) in constructors
- [ ] Write tests using mock implementations

## Testing with DI

### Unit Tests
```typescript
// Create mocks
const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
  // ... implement ILogger
} as ILogger;

// Inject mocks
const engine = new MurmubaraEngine(
  mockLogger,
  mockStateManager,
  mockWorkerManager,
  mockMetricsManager,
  config
);
```

### Integration Tests
```typescript
// Use factory for real instances
const engine = MurmubaraEngineFactory.create(config);

// Or create custom instances
const customLogger = new Logger('[Test]');
const engine = new MurmubaraEngine(customLogger, ...);
```

## Common Violations to Avoid

### 1. **Creating Services in Constructor**
```typescript
// ❌ NEVER DO THIS
constructor() {
  this.logger = new Logger(); // Creates tight coupling
}
```

### 2. **Using Concrete Types Instead of Interfaces**
```typescript
// ❌ AVOID
constructor(logger: Logger) { }

// ✅ PREFER
constructor(logger: ILogger) { }
```

### 3. **Accessing Global Singletons Directly**
```typescript
// ❌ AVOID (except for LoggingManager)
this.metrics = MetricsManager.getInstance();

// ✅ PREFER
constructor(metrics: IMetricsManager) {
  this.metrics = metrics;
}
```

## Benefits

1. **Testability**: Easy to mock dependencies
2. **Flexibility**: Can swap implementations
3. **Single Instance**: Prevents duplicate service instances
4. **Event Integrity**: Ensures events propagate correctly
5. **Memory Efficiency**: No wasted duplicate instances

## Migration Guide

If you find code violating DI patterns:

1. Create interface if missing
2. Update constructor to accept dependencies
3. Update factory/container to provide dependencies
4. Update all instantiation sites to use factory
5. Update tests to inject mocks
6. Verify singleton integrity with tests

## Example: Complete Service Implementation

```typescript
// 1. Define interface
export interface IMyService {
  doSomething(): void;
}

// 2. Add token
export const TOKENS = {
  // ... existing tokens
  MyService: Symbol('MyService'),
};

// 3. Implement service
export class MyService implements IMyService {
  constructor(private logger: ILogger) {}
  
  doSomething(): void {
    this.logger.info('Doing something');
  }
}

// 4. Register in factory
container.bindSingleton(TOKENS.MyService, () => {
  const logger = container.get<ILogger>(TOKENS.Logger);
  return new MyService(logger);
});

// 5. Use in other services
export class OtherService {
  constructor(private myService: IMyService) {}
  
  useMyService(): void {
    this.myService.doSomething();
  }
}
```

## Enforcement

- Code reviews should check for DI violations
- Tests should verify singleton integrity
- Use `singleton-integrity.spec.ts` as a template for verification