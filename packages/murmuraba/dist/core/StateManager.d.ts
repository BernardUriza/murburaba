import { EngineState } from '../types';
import { EventEmitter } from './EventEmitter';
interface StateEvents {
    'state-change': (oldState: EngineState, newState: EngineState) => void;
    [key: string]: (...args: any[]) => void;
}
export declare class StateManager extends EventEmitter<StateEvents> {
    private currentState;
    private allowedTransitions;
    constructor();
    getState(): EngineState;
    canTransitionTo(newState: EngineState): boolean;
    transitionTo(newState: EngineState): boolean;
    isInState(...states: EngineState[]): boolean;
    requireState(...states: EngineState[]): void;
    reset(): void;
}
export {};
//# sourceMappingURL=StateManager.d.ts.map