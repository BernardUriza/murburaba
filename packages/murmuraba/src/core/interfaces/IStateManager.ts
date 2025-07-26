import { EngineState } from '../../types';

export interface IStateManager {
  getState(): EngineState;
  setState(newState: EngineState): void;
  canTransition(from: EngineState, to: EngineState): boolean;
  reset(): void;
  onStateChange(callback: (oldState: EngineState, newState: EngineState) => void): () => void;
}