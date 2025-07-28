import { EngineState } from '../../types';

export interface IStateManager {
  getState(): EngineState;
  canTransitionTo(to: EngineState): boolean;
  transitionTo(newState: EngineState): boolean;
  requireState(...states: EngineState[]): void;
  isInState(state: EngineState): boolean;
  on(event: 'state-change', callback: (oldState: EngineState, newState: EngineState) => void): void;
}
