export class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(handler);
    }
    off(event, handler) {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.events.delete(event);
            }
        }
    }
    emit(event, ...args) {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                }
                catch (error) {
                    console.error(`Error in event handler for ${String(event)}:`, error);
                }
            });
        }
    }
    once(event, handler) {
        const wrappedHandler = ((...args) => {
            this.off(event, wrappedHandler);
            handler(...args);
        });
        this.on(event, wrappedHandler);
    }
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        }
        else {
            this.events.clear();
        }
    }
    listenerCount(event) {
        const handlers = this.events.get(event);
        return handlers ? handlers.size : 0;
    }
}
