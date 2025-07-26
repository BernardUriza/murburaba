import { DIContainer, TOKENS } from './DIContainer';
import { ILogger } from './interfaces';

interface ServiceModule {
  name: string;
  load: (container: DIContainer) => Promise<any>;
  token: symbol | string;
  dependencies?: (symbol | string)[];
}

export class ServiceLoader {
  private modules = new Map<string, ServiceModule>();
  private loadingPromises = new Map<string, Promise<void>>();
  
  constructor(private container: DIContainer) {}

  registerModule(module: ServiceModule): void {
    this.modules.set(module.name, module);
  }

  async loadModule(name: string): Promise<void> {
    const existing = this.loadingPromises.get(name);
    if (existing) return existing;

    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module ${name} not found`);
    }

    const loadPromise = this.loadModuleInternal(module);
    this.loadingPromises.set(name, loadPromise);
    
    try {
      await loadPromise;
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  private async loadModuleInternal(module: ServiceModule): Promise<void> {
    // Load dependencies first
    if (module.dependencies) {
      await Promise.all(
        module.dependencies.map(dep => {
          const depModule = Array.from(this.modules.values())
            .find(m => m.token === dep);
          return depModule ? this.loadModule(depModule.name) : Promise.resolve();
        })
      );
    }

    const logger = this.container.has(TOKENS.Logger) 
      ? this.container.get<ILogger>(TOKENS.Logger) 
      : null;

    logger?.debug(`Loading module: ${module.name}`);

    const service = await module.load(this.container);
    this.container.bindSingleton(module.token, service);

    logger?.info(`Module loaded: ${module.name}`);
  }

  async loadAll(): Promise<void> {
    const modules = Array.from(this.modules.values());
    await Promise.all(modules.map(m => this.loadModule(m.name)));
  }

  isLoaded(name: string): boolean {
    const module = this.modules.get(name);
    return module ? this.container.has(module.token) : false;
  }

  getLoadedModules(): string[] {
    return Array.from(this.modules.entries())
      .filter(([_, module]) => this.container.has(module.token))
      .map(([name]) => name);
  }
}

// Predefined service modules
export const SERVICE_MODULES = {
  audioEngine: {
    name: 'audioEngine',
    token: TOKENS.AudioEngine,
    load: async (container: DIContainer) => {
      const { RNNoiseEngine } = await import('../engines/RNNoiseEngine');
      return new RNNoiseEngine();
    }
  },
  
  metricsManager: {
    name: 'metricsManager',
    token: TOKENS.MetricsManager,
    load: async (container: DIContainer) => {
      const { MetricsManager } = await import('../managers/MetricsManager');
      return new MetricsManager();
    }
  },
  
  workerManager: {
    name: 'workerManager',
    token: TOKENS.WorkerManager,
    dependencies: [TOKENS.Logger],
    load: async (container: DIContainer) => {
      const { WorkerManager } = await import('../managers/WorkerManager');
      const { Logger } = await import('./Logger');
      const logger = container.get<ILogger>(TOKENS.Logger);
      return new WorkerManager(logger as InstanceType<typeof Logger>);
    }
  }
};