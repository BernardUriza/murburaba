import { DIContainer, TOKENS } from './DIContainer';
import { MurmubaraEngine } from './MurmubaraEngine';
import { Logger } from './Logger';
import { StateManager } from './StateManager';
import { EventEmitter } from './EventEmitter';
import { MetricsManager } from '../managers/MetricsManager';
import { WorkerManager } from '../managers/WorkerManager';
import { RNNoiseEngine } from '../engines/RNNoiseEngine';
import { MurmubaraConfig, EngineEvents } from '../types';
import { ILogger, IStateManager, IEventEmitter, IAudioEngine, IMetricsManager } from './interfaces';
import { getConfigValidator } from '../services/ConfigValidationService';
import { ConfigPresets } from '../config/configSchema';

export class MurmubaraEngineFactory {
  /**
   * Create engine with custom configuration
   */
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

    // Get dependencies from container
    const logger = container.get<ILogger>(TOKENS.Logger);
    const stateManager = container.get<IStateManager>(TOKENS.StateManager);
    const workerManager = container.get<WorkerManager>(TOKENS.WorkerManager);
    const metricsManager = container.get<IMetricsManager>(TOKENS.MetricsManager);
    
    // Create engine with injected dependencies
    const engine = new MurmubaraEngine(
      logger,
      stateManager,
      workerManager,
      metricsManager,
      config || {}
    );

    // Store container reference for testing purposes
    (engine as any).getContainer = () => container;

    return engine;
  }

  /**
   * Create engine with preset configuration
   */
  static createWithPreset(
    preset: keyof typeof ConfigPresets,
    overrides?: Partial<MurmubaraConfig>
  ): MurmubaraEngine {
    const validator = getConfigValidator();
    const presetConfig = validator.getPreset(preset);
    const finalConfig = {
      ...presetConfig.core,
      ...overrides
    };
    return this.create(finalConfig);
  }

  /**
   * Validate configuration without creating engine
   */
  static validateConfig(config: MurmubaraConfig): boolean {
    const validator = getConfigValidator();
    const result = validator.validateAndMerge(config);
    return result.ok;
  }
}
