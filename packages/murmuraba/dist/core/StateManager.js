import { EventEmitter } from './EventEmitter';
export class StateManager extends EventEmitter {
    constructor() {
        super(...arguments);
        this.currentState = 'uninitialized';
        this.allowedTransitions = new Map([
            ['uninitialized', ['initializing', 'error']],
            ['initializing', ['creating-context', 'loading-wasm', 'ready', 'degraded', 'error']],
            ['creating-context', ['loading-wasm', 'ready', 'degraded', 'error']],
            ['loading-wasm', ['ready', 'degraded', 'error']],
            ['ready', ['processing', 'destroying', 'error']],
            ['processing', ['ready', 'paused', 'destroying', 'error']],
            ['paused', ['processing', 'ready', 'destroying', 'error']],
            ['degraded', ['processing', 'destroying', 'error']],
            ['destroying', ['destroyed', 'error']],
            ['destroyed', []],
            ['error', ['initializing', 'destroying']],
        ]);
    }
    getState() {
        return this.currentState;
    }
    canTransitionTo(newState) {
        const allowed = this.allowedTransitions.get(this.currentState) || [];
        return allowed.includes(newState);
    }
    transitionTo(newState) {
        if (!this.canTransitionTo(newState)) {
            console.warn(`Invalid state transition: ${this.currentState} -> ${newState}`);
            return false;
        }
        const oldState = this.currentState;
        this.currentState = newState;
        this.emit('state-change', oldState, newState);
        return true;
    }
    isInState(...states) {
        return states.includes(this.currentState);
    }
    requireState(...states) {
        if (!this.isInState(...states)) {
            throw new Error(`Operation requires state to be one of: ${states.join(', ')}, ` +
                `but current state is: ${this.currentState}`);
        }
    }
    reset() {
        const oldState = this.currentState;
        this.currentState = 'uninitialized';
        if (oldState !== 'uninitialized') {
            this.emit('state-change', oldState, 'uninitialized');
        }
    }
}
