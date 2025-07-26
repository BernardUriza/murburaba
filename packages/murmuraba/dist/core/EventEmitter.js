export class EventEmitter {
    constructor() {
        this.events = {};
        // Initialize as plain object instead of Map
    }
    on(event, handler) {
        const eventKey = String(event);
        if (!this.events[eventKey]) {
            this.events[eventKey] = new Set();
        }
        this.events[eventKey].add(handler);
    }
    off(event, handler) {
        const eventKey = String(event);
        const handlers = this.events[eventKey];
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                delete this.events[eventKey];
            }
        }
    }
    emit(event, ...args) {
        const eventKey = String(event);
        const handlers = this.events[eventKey];
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(...args);
                }
                catch (error) {
                    console.error(`Error in event handler for ${eventKey}:`, error);
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
            delete this.events[String(event)];
        }
        else {
            this.events = {};
        }
    }
    listenerCount(event) {
        const handlers = this.events[String(event)];
        return handlers ? handlers.size : 0;
    }
}
