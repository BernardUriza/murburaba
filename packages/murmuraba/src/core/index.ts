/**
 * Core module exports
 * Centralized exports for all core functionality
 */

// Core classes
export { MurmubaraEngine } from './MurmubaraEngine';
export { EventEmitter } from './EventEmitter';
export { StateManager } from './StateManager';
export { Logger } from './Logger';
export { DIContainer } from './DIContainer';
export { engineRegistry } from './EngineRegistry';
export { MurmubaraEngineFactory } from './MurmubaraEngineFactory';
export { ServiceLoader } from './ServiceLoader';

// Adapters
export { WorkerManagerAdapter } from './adapters/WorkerManagerAdapter';

// Decorators
export * from './decorators';

// Interfaces - Re-export from interfaces index
export * from './interfaces';