/**
 * Unit tests for StateManager
 * Tests state transitions and validation logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../../core/StateManager';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Initial state', () => {
    it('should start in uninitialized state', () => {
      expect(stateManager.getState()).toBe('uninitialized');
    });

    it('should have correct initial transition map', () => {
      expect(stateManager.canTransitionTo('initializing')).toBe(true);
      expect(stateManager.canTransitionTo('ready')).toBe(false);
      expect(stateManager.canTransitionTo('processing')).toBe(false);
    });
  });

  describe('State transitions', () => {
    it('should transition from uninitialized to initializing', () => {
      // Act
      const result = stateManager.transitionTo('initializing');

      // Assert
      expect(result).toBe(true);
      expect(stateManager.getState()).toBe('initializing');
    });

    it('should transition through complete lifecycle', () => {
      // Act & Assert
      expect(stateManager.transitionTo('initializing')).toBe(true);
      expect(stateManager.transitionTo('ready')).toBe(true);
      expect(stateManager.transitionTo('processing')).toBe(true);
      expect(stateManager.transitionTo('ready')).toBe(true);
      expect(stateManager.transitionTo('destroying')).toBe(true);
      expect(stateManager.transitionTo('destroyed')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      // Act & Assert
      expect(stateManager.transitionTo('processing')).toBe(false);
      expect(stateManager.getState()).toBe('uninitialized');
      
      stateManager.transitionTo('initializing');
      expect(stateManager.transitionTo('destroyed')).toBe(false);
      expect(stateManager.getState()).toBe('initializing');
    });

    it('should handle error state transitions', () => {
      // Arrange
      stateManager.transitionTo('initializing');

      // Act
      const result = stateManager.transitionTo('error');

      // Assert
      expect(result).toBe(true);
      expect(stateManager.getState()).toBe('error');
      
      // Can transition from error to cleanup
      expect(stateManager.canTransitionTo('destroying')).toBe(true);
    });

    it('should allow force transitions', () => {
      // Arrange
      stateManager.transitionTo('processing');
      
      // Act - Force transition to destroyed
      const result = stateManager.transitionTo('destroyed');

      // Assert
      expect(result).toBe(true);
      expect(stateManager.getState()).toBe('destroyed');
    });
  });

  describe('State validation', () => {
    it('should correctly validate allowed transitions', () => {
      // Test each state's allowed transitions
      const stateTransitions = {
        uninitialized: ['initializing', 'error'],
        initializing: ['creating-context', 'loading-wasm', 'ready', 'degraded', 'error'],
        'creating-context': ['loading-wasm', 'ready', 'degraded', 'error'],
        'loading-wasm': ['ready', 'degraded', 'error'],
        ready: ['processing', 'destroying', 'error'],
        processing: ['ready', 'paused', 'destroying', 'error'],
        paused: ['processing', 'ready', 'destroying', 'error'],
        degraded: ['processing', 'destroying', 'error'],
        destroying: ['destroyed', 'error'],
        error: ['initializing', 'destroying'],
        destroyed: [],
      };

      Object.entries(stateTransitions).forEach(([fromState, allowedStates]) => {
        // Force transition to test state
        stateManager['currentState'] = fromState as any;
        
        // Check allowed transitions
        allowedStates.forEach(toState => {
          expect(stateManager.canTransitionTo(toState as any)).toBe(true);
        });
        
        // Check some disallowed transitions
        const allStates = Object.keys(stateTransitions);
        const disallowedStates = allStates.filter(s => !(allowedStates as string[]).includes(s) && s !== fromState);
        
        disallowedStates.forEach(toState => {
          expect(stateManager.canTransitionTo(toState as any)).toBe(false);
        });
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple transition attempts to same state', () => {
      // Arrange
      stateManager.transitionTo('initializing');

      // Act
      const result1 = stateManager.transitionTo('initializing');
      const result2 = stateManager.transitionTo('initializing');

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(stateManager.getState()).toBe('initializing');
    });

    it('should maintain state integrity after failed transitions', () => {
      // Arrange
      stateManager['currentState'] = 'ready';
      const initialState = stateManager.getState();

      // Act - Attempt invalid transition
      const result = stateManager.transitionTo('initializing');

      // Assert
      expect(result).toBe(false);
      expect(stateManager.getState()).toBe(initialState);
    });

    it('should handle destroyed state as final', () => {
      // Arrange
      stateManager['currentState'] = 'destroyed';

      // Act & Assert - No transitions allowed from destroyed
      expect(stateManager.canTransitionTo('uninitialized')).toBe(false);
      expect(stateManager.canTransitionTo('ready')).toBe(false);
      expect(stateManager.canTransitionTo('error')).toBe(false);
      
      // Even force transitions should not work
      expect(stateManager.transitionTo('ready')).toBe(false);
    });
  });
});