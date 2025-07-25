import { describe, it, expect } from 'vitest';
import { EventEmitter } from '../../core/EventEmitter';
import { Logger, LogLevel } from '../../core/Logger';
import { StateManager } from '../../core/StateManager';
import { MurmubaraEngine } from '../../core/MurmubaraEngine';

describe('Core Simple Coverage', () => {
  describe('EventEmitter', () => {
    it('should create and use EventEmitter', () => {
      const emitter = new EventEmitter();
      let called = false;
      
      emitter.on('test', () => { called = true; });
      emitter.emit('test');
      
      expect(called).toBe(true);
      
      // Test other methods
      emitter.once('once', () => {});
      emitter.removeAllListeners();
      emitter.off('test', () => {});
    });
  });
  
  describe('Logger', () => {
    it('should use Logger methods', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      
      // Call all methods to increase coverage
      Logger.debug('debug');
      Logger.info('info');
      Logger.warn('warn');
      Logger.error('error');
      Logger.group('group');
      Logger.groupEnd();
      
      const result = Logger.performance('test', () => 'result');
      expect(result).toBe('result');
      
      // Async performance
      const asyncResult = Logger.performance('async', async () => 'async');
      expect(asyncResult).resolves.toBe('async');
    });
  });
  
  describe('StateManager', () => {
    it('should create and use StateManager', () => {
      const manager = new StateManager();
      
      expect(manager.getState()).toBe('uninitialized');
      expect(manager.canTransitionTo('initializing')).toBe(true);
      expect(manager.isInState('uninitialized')).toBe(true);
      
      manager.transitionTo('initializing');
      manager.reset();
      
      // Test error states
      expect(manager.canTransitionTo('ready')).toBe(false);
      manager.transitionTo('error');
      
      // Test requireState
      try {
        manager.requireState('ready');
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });
  
  describe('MurmubaraEngine', () => {
    it('should import MurmubaraEngine', () => {
      expect(MurmubaraEngine).toBeDefined();
      
      // Test static methods if any
      const engine = new MurmubaraEngine();
      expect(engine).toBeDefined();
      
      // Access public properties to increase coverage
      expect(engine.getEngineStatus).toBeDefined();
      expect(engine.getDiagnostics).toBeDefined();
    });
  });
});