import { DIContainer, TOKENS } from './DIContainer';
import { MurmubaraEngine } from './MurmubaraEngine';
import { Logger } from './Logger';
import { StateManager } from './StateManager';
import { EventEmitter } from './EventEmitter';
import { MetricsManager } from '../managers/MetricsManager';
import { WorkerManager } from '../managers/WorkerManager';
import { RNNoiseEngine } from '../engines/RNNoiseEngine';
import { MurmubaraConfig, EngineEvents } from '../types';
import { ILogger, IStateManager, IEventEmitter, IAudioEngine } from './interfaces';

export class MurmubaraEngineFactory {
  static create(config?: MurmubaraConfig): MurmubaraEngine {
    const container = new DIContainer();
    
    // Bind configuration
    container.bindValue(TOKENS.Config, config || {});
    
    // Bind core services
    container.bindSingleton(TOKENS.Logger, () => {
      const logger = new Logger('[Murmuraba]');
      logger.setLevel(config?.logLevel || 'warn');
      return logger;
    });
    
    container.bindSingleton(TOKENS.StateManager, () => new StateManager());
    
    container.bindSingleton(TOKENS.EventEmitter, () => new EventEmitter<EngineEvents>());
    
    // Bind managers
    container.bindSingleton(TOKENS.MetricsManager, () => new MetricsManager());
    
    container.bindSingleton(TOKENS.WorkerManager, () => {
      const logger = container.get<ILogger>(TOKENS.Logger);
      return new WorkerManager(logger as Logger);
    });
    
    // Bind audio engine
    container.bindSingleton(TOKENS.AudioEngine, () => new RNNoiseEngine());
    
    // Create engine with injected dependencies
    return new MurmubaraEngineWithDI(container);
  }
}

// Extended engine that uses DI
class MurmubaraEngineWithDI extends MurmubaraEngine {
  private container: DIContainer;
  
  constructor(container: DIContainer) {
    const config = container.get<MurmubaraConfig>(TOKENS.Config);
    super(config);
    this.container = container;
    
    // Replace internal services with DI versions
    (this as any).logger = container.get<ILogger>(TOKENS.Logger);
    (this as any).stateManager = container.get<IStateManager>(TOKENS.StateManager);
    (this as any).events = container.get<IEventEmitter<EngineEvents>>(TOKENS.EventEmitter);
    (this as any).metricsManager = container.get(TOKENS.MetricsManager);
    (this as any).workerManager = container.get(TOKENS.WorkerManager);
  }
  
  getContainer(): DIContainer {
    return this.container;
  }
}