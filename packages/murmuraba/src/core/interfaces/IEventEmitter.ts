export interface IEventEmitter<T extends Record<string, any> = Record<string, any>> {
  on<K extends keyof T>(event: K, listener: T[K]): void;
  off<K extends keyof T>(event: K, listener: T[K]): void;
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void;
  once<K extends keyof T>(event: K, listener: T[K]): void;
  removeAllListeners(event?: keyof T): void;
  listenerCount(event: keyof T): number;
}