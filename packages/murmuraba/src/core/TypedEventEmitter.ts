/**
 * Type-safe event emitter with strict event typing
 */

export type EventMap = Record<string, (...args: any[]) => void>;

export type EventKey<T extends EventMap> = string & keyof T;
export type EventReceiver<T> = T extends (...args: infer P) => void ? P : never;

export interface TypedEmitter<T extends EventMap> {
  on<K extends EventKey<T>>(event: K, handler: T[K]): void;
  off<K extends EventKey<T>>(event: K, handler: T[K]): void;
  emit<K extends EventKey<T>>(event: K, ...args: EventReceiver<T[K]>): void;
  once<K extends EventKey<T>>(event: K, handler: T[K]): void;
  removeAllListeners<K extends EventKey<T>>(event?: K): void;
  listenerCount<K extends EventKey<T>>(event: K): number;
}

export class TypedEventEmitter<T extends EventMap> implements TypedEmitter<T> {
  private events: Map<keyof T, Set<T[keyof T]>> = new Map();
  private maxListeners = 10;

  on<K extends EventKey<T>>(event: K, handler: T[K]): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    
    const handlers = this.events.get(event)!;
    handlers.add(handler);
    
    // Warn if too many listeners
    if (handlers.size > this.maxListeners) {
      console.warn(
        `Warning: Possible memory leak. ${handlers.size} listeners attached to event '${String(event)}'`
      );
    }
  }

  off<K extends EventKey<T>>(event: K, handler: T[K]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  emit<K extends EventKey<T>>(event: K, ...args: EventReceiver<T[K]>): void {
    const handlers = this.events.get(event);
    if (handlers) {
      // Create a copy to avoid issues if handlers modify the set
      const handlersCopy = Array.from(handlers);
      for (const handler of handlersCopy) {
        try {
          (handler as T[keyof T])(...args);
        } catch (error) {
          console.error(`Error in event handler for '${String(event)}':`, error);
        }
      }
    }
  }

  once<K extends EventKey<T>>(event: K, handler: T[K]): void {
    const wrappedHandler = ((...args: any[]) => {
      this.off(event, wrappedHandler as T[K]);
      (handler as T[K])(...args);
    }) as T[K];
    
    this.on(event, wrappedHandler);
  }

  removeAllListeners<K extends EventKey<T>>(event?: K): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  listenerCount<K extends EventKey<T>>(event: K): number {
    const handlers = this.events.get(event);
    return handlers ? handlers.size : 0;
  }

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  getMaxListeners(): number {
    return this.maxListeners;
  }

  eventNames(): Array<keyof T> {
    return Array.from(this.events.keys());
  }
}

// Example usage with strict typing:
/*
interface MyEvents {
  'data': (payload: { id: string; value: number }) => void;
  'error': (error: Error) => void;
  'close': () => void;
}

const emitter = new TypedEventEmitter<MyEvents>();

// ✅ Type-safe
emitter.on('data', ({ id, value }) => {
  console.log(id, value);
});

// ❌ TypeScript error - wrong event name
emitter.on('invalid', () => {});

// ❌ TypeScript error - wrong payload type
emitter.emit('data', 'wrong');

// ✅ Correct
emitter.emit('data', { id: '123', value: 42 });
*/