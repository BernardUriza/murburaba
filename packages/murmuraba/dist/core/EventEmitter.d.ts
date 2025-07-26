export type EventHandler = (...args: any[]) => void;
export declare class EventEmitter<T extends Record<string, EventHandler>> {
    private events;
    constructor();
    on<K extends keyof T>(event: K, handler: T[K]): void;
    off<K extends keyof T>(event: K, handler: T[K]): void;
    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void;
    once<K extends keyof T>(event: K, handler: T[K]): void;
    removeAllListeners(event?: keyof T): void;
    listenerCount(event: keyof T): number;
}
//# sourceMappingURL=EventEmitter.d.ts.map