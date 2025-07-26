import { container, TOKENS } from './DIContainer';
import { ILogger } from './interfaces';

// Decorator for automatic dependency injection
export function Injectable(token: symbol | string) {
  return function (target: any) {
    container.bind(token, target);
    return target;
  };
}

// Decorator for singleton services
export function Singleton(token: symbol | string) {
  return function (target: any) {
    container.bindSingleton(token, target);
    return target;
  };
}

// Property injection decorator
export function Inject(token: symbol | string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get() {
        return container.get(token);
      },
      enumerable: true,
      configurable: true
    });
  };
}

// Method decorator for logging
export function Log(level: 'debug' | 'info' | 'warn' | 'error' = 'debug') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const logger = container.get<ILogger>(TOKENS.Logger);
      const className = target.constructor.name;
      
      logger[level](`${className}.${propertyKey} called`, { args });
      
      try {
        const result = await originalMethod.apply(this, args);
        logger[level](`${className}.${propertyKey} completed`, { result });
        return result;
      } catch (error) {
        logger.error(`${className}.${propertyKey} failed`, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Performance monitoring decorator
export function Measure() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        
        const logger = container.get<ILogger>(TOKENS.Logger);
        logger.debug(`${target.constructor.name}.${propertyKey} took ${duration.toFixed(2)}ms`);
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        const logger = container.get<ILogger>(TOKENS.Logger);
        logger.error(`${target.constructor.name}.${propertyKey} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Retry decorator with exponential backoff
export function Retry(options?: { maxAttempts?: number; delay?: number; backoff?: number }) {
  const { maxAttempts = 3, delay = 1000, backoff = 2 } = options || {};
  
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          
          if (attempt < maxAttempts) {
            const waitTime = delay * Math.pow(backoff, attempt - 1);
            const logger = container.get<ILogger>(TOKENS.Logger);
            logger.warn(`${target.constructor.name}.${propertyKey} failed, retrying in ${waitTime}ms (attempt ${attempt}/${maxAttempts})`);
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      throw lastError!;
    };
    
    return descriptor;
  };
}

// Simple cache decorator
const cacheStore = new Map<string, { value: any; timestamp: number }>();

export function Cache(ttl: number = 60000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      const cached = cacheStore.get(key);
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        const logger = container.get<ILogger>(TOKENS.Logger);
        logger.debug(`Cache hit for ${target.constructor.name}.${propertyKey}`);
        return cached.value;
      }
      
      const result = await originalMethod.apply(this, args);
      cacheStore.set(key, { value: result, timestamp: Date.now() });
      
      return result;
    };
    
    return descriptor;
  };
}

// Throttle decorator
const throttleStore = new Map<string, number>();

export function Throttle(wait: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}`;
      const now = Date.now();
      const lastCall = throttleStore.get(key) || 0;
      
      if (now - lastCall < wait) {
        const logger = container.get<ILogger>(TOKENS.Logger);
        logger.debug(`Throttled ${target.constructor.name}.${propertyKey}`);
        return;
      }
      
      throttleStore.set(key, now);
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// Debounce decorator
const debounceStore = new Map<string, NodeJS.Timeout>();

export function Debounce(wait: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const key = `${target.constructor.name}.${propertyKey}`;
      
      clearTimeout(debounceStore.get(key));
      
      const timeout = setTimeout(() => {
        originalMethod.apply(this, args);
      }, wait);
      
      debounceStore.set(key, timeout);
    };
    
    return descriptor;
  };
}

// Validate decorator
export function Validate(validator: (args: any[]) => boolean | string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const validation = validator(args);
      
      if (validation === true) {
        return originalMethod.apply(this, args);
      }
      
      const message = typeof validation === 'string' ? validation : 'Validation failed';
      throw new Error(`${target.constructor.name}.${propertyKey}: ${message}`);
    };
    
    return descriptor;
  };
}