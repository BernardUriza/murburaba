type Factory<T> = () => T;
type AsyncFactory<T> = () => Promise<T>;
type Constructor<T> = new (...args: any[]) => T;
type Provider<T> = Factory<T> | AsyncFactory<T> | Constructor<T> | T;

interface Binding<T> {
  provider: Provider<T>;
  singleton: boolean;
  instance?: T;
  lazy?: boolean;
  loading?: Promise<T>;
}

export class DIContainer {
  private bindings = new Map<symbol | string, Binding<any>>();

  bind<T>(token: symbol | string, provider: Provider<T>, options?: { singleton?: boolean; lazy?: boolean }): void {
    this.bindings.set(token, {
      provider,
      singleton: options?.singleton ?? false,
      lazy: options?.lazy ?? false,
      instance: undefined
    });
  }

  bindSingleton<T>(token: symbol | string, provider: Provider<T>): void {
    this.bind(token, provider, { singleton: true });
  }

  bindFactory<T>(token: symbol | string, factory: Factory<T>): void {
    this.bind(token, factory);
  }

  bindValue<T>(token: symbol | string, value: T): void {
    this.bindings.set(token, {
      provider: value,
      singleton: true,
      instance: value
    });
  }

  get<T>(token: symbol | string): T {
    const binding = this.bindings.get(token);
    
    if (!binding) {
      throw new Error(`No binding found for token: ${String(token)}`);
    }

    if (binding.singleton && binding.instance) {
      return binding.instance;
    }

    if (binding.lazy) {
      throw new Error(`Token ${String(token)} is lazy. Use getAsync() instead.`);
    }

    let instance: T;
    
    if (typeof binding.provider === 'function') {
      const isConstructor = binding.provider.prototype !== undefined;
      
      if (isConstructor) {
        instance = new (binding.provider as Constructor<T>)();
      } else {
        instance = (binding.provider as Factory<T>)();
      }
    } else {
      instance = binding.provider;
    }

    if (binding.singleton) {
      binding.instance = instance;
    }

    return instance;
  }

  async getAsync<T>(token: symbol | string): Promise<T> {
    const binding = this.bindings.get(token);
    
    if (!binding) {
      throw new Error(`No binding found for token: ${String(token)}`);
    }

    if (binding.singleton && binding.instance) {
      return binding.instance;
    }

    if (binding.singleton && binding.loading) {
      return binding.loading;
    }

    const loadInstance = async (): Promise<T> => {
      let instance: T;
      
      if (typeof binding.provider === 'function') {
        const isConstructor = binding.provider.prototype !== undefined;
        
        if (isConstructor) {
          instance = new (binding.provider as Constructor<T>)();
        } else {
          const result = (binding.provider as Factory<T> | AsyncFactory<T>)();
          instance = result instanceof Promise ? await result : result;
        }
      } else {
        instance = binding.provider;
      }

      if (binding.singleton) {
        binding.instance = instance;
        binding.loading = undefined;
      }

      return instance;
    };

    if (binding.singleton) {
      binding.loading = loadInstance();
      return binding.loading;
    }

    return loadInstance();
  }

  has(token: symbol | string): boolean {
    return this.bindings.has(token);
  }

  unbind(token: symbol | string): void {
    this.bindings.delete(token);
  }

  clear(): void {
    this.bindings.clear();
  }

  createChild(): DIContainer {
    const child = new DIContainer();
    // Copy parent bindings
    this.bindings.forEach((binding, token) => {
      child.bindings.set(token, { ...binding });
    });
    return child;
  }

  bindLazy<T>(token: symbol | string, provider: AsyncFactory<T>, options?: { singleton?: boolean }): void {
    this.bind(token, provider, { ...options, lazy: true });
  }

  bindLazySingleton<T>(token: symbol | string, provider: AsyncFactory<T>): void {
    this.bindLazy(token, provider, { singleton: true });
  }
}

// Service tokens
export const TOKENS = {
  Logger: Symbol('Logger'),
  StateManager: Symbol('StateManager'),
  EventEmitter: Symbol('EventEmitter'),
  AudioEngine: Symbol('AudioEngine'),
  MetricsManager: Symbol('MetricsManager'),
  WorkerManager: Symbol('WorkerManager'),
  AudioContext: Symbol('AudioContext'),
  Config: Symbol('Config'),
  AudioProcessor: Symbol('AudioProcessor')
} as const;

// Global container instance
export const container = new DIContainer();