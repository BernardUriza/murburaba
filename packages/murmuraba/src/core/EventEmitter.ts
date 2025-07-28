export type EventHandler = (...args: any[]) => void;

export class EventEmitter<T extends Record<string, EventHandler>> {
  protected events: Record<string, Set<EventHandler>> = {};

  constructor() {
    // Initialize as plain object instead of Map
  }

  on<K extends keyof T>(event: K, handler: T[K]): void {
    const eventKey = String(event);
    if (!this.events[eventKey]) {
      this.events[eventKey] = new Set();
    }
    this.events[eventKey].add(handler);
  }

  off<K extends keyof T>(event: K, handler: T[K]): void {
    const eventKey = String(event);
    const handlers = this.events[eventKey];
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        delete this.events[eventKey];
      }
    }
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    const eventKey = String(event);
    const handlers = this.events[eventKey];
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${eventKey}:`, error);
        }
      });
    }
  }

  once<K extends keyof T>(event: K, handler: T[K]): void {
    const wrappedHandler = ((...args: any[]) => {
      this.off(event, wrappedHandler as T[K]);
      handler(...args);
    }) as T[K];
    this.on(event, wrappedHandler);
  }

  removeAllListeners(event?: keyof T): void {
    if (event) {
      delete this.events[String(event)];
    } else {
      this.events = {};
    }
  }

  listenerCount(event: keyof T): number {
    const handlers = this.events[String(event)];
    return handlers ? handlers.size : 0;
  }
}
