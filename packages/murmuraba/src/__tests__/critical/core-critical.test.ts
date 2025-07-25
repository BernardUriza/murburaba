import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../../core/EventEmitter';
import { Logger, LogLevel } from '../../core/Logger';
import { StateManager } from '../../core/StateManager';

describe('Critical Core Coverage', () => {
  describe('EventEmitter - Critical Path', () => {
    it('should emit and receive events', () => {
      const emitter = new EventEmitter();
      const callback = vi.fn();
      
      emitter.on('test', callback);
      emitter.emit('test', 'data');
      
      expect(callback).toHaveBeenCalledWith('data');
    });

    it('should handle once events', () => {
      const emitter = new EventEmitter();
      const callback = vi.fn();
      
      emitter.once('test', callback);
      emitter.emit('test', 'data1');
      emitter.emit('test', 'data2');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('data1');
    });

    it('should remove listeners', () => {
      const emitter = new EventEmitter();
      const callback = vi.fn();
      
      emitter.on('test', callback);
      emitter.off('test', callback);
      emitter.emit('test', 'data');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Logger - Critical Path', () => {
    it('should log at different levels', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      Logger.setLogLevel(LogLevel.DEBUG);
      
      Logger.debug('debug message');
      Logger.info('info message');
      Logger.warn('warn message');
      Logger.error('error message');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('StateManager - Critical Path', () => {
    it('should manage state transitions', () => {
      const manager = new StateManager();
      
      expect(manager.getState()).toBe('uninitialized');
      expect(manager.canTransitionTo('initializing')).toBe(true);
      
      const result = manager.transitionTo('initializing');
      expect(result).toBe(true);
      expect(manager.getState()).toBe('initializing');
    });

    it('should prevent invalid transitions', () => {
      const manager = new StateManager();
      
      expect(manager.canTransitionTo('ready')).toBe(false);
      
      const result = manager.transitionTo('ready');
      expect(result).toBe(false);
      expect(manager.getState()).toBe('uninitialized');
    });
  });
});