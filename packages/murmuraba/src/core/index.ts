/**
 * Core Module Exports
 * 
 * Low-level engine and infrastructure components
 * 
 * @module core
 */

// Engine
export { MurmubaraEngine } from './MurmubaraEngine';
export { MurmubaraEngineFactory } from './MurmubaraEngineFactory';

// State Management
export { StateManager } from './StateManager';

// Logging
export { Logger } from './Logger';

// Event System
export { EventEmitter } from './EventEmitter';
export { TypedEventEmitter } from './TypedEventEmitter';
export type { EventMap, EventKey, EventReceiver, TypedEmitter } from './TypedEventEmitter';

// Dependency Injection
export { DIContainer, TOKENS } from './DIContainer';
export { ServiceLoader, SERVICE_MODULES } from './ServiceLoader';

// Registry
export { engineRegistry } from './EngineRegistry';

// Adapters
export { WorkerManagerAdapter } from './adapters/WorkerManagerAdapter';

// Decorators
export * from './decorators';

// Interfaces - Re-export from interfaces index
export * from './interfaces';