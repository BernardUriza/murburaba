import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from '../../core/EventEmitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on', () => {
    it('should register event listener', () => {
      const callback = vi.fn();
      emitter.on('test', callback);
      
      emitter.emit('test', 'data');
      expect(callback).toHaveBeenCalledWith('data');
    });

    it('should register multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      
      emitter.emit('test', 'data');
      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should handle listeners for different events', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      emitter.on('event1', callback1);
      emitter.on('event2', callback2);
      
      emitter.emit('event1', 'data1');
      expect(callback1).toHaveBeenCalledWith('data1');
      expect(callback2).not.toHaveBeenCalled();
      
      emitter.emit('event2', 'data2');
      expect(callback2).toHaveBeenCalledWith('data2');
    });
  });

  describe('off', () => {
    it('should remove event listener', () => {
      const callback = vi.fn();
      emitter.on('test', callback);
      emitter.off('test', callback);
      
      emitter.emit('test', 'data');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should only remove specific listener', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      emitter.off('test', callback1);
      
      emitter.emit('test', 'data');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should handle removing non-existent listener', () => {
      const callback = vi.fn();
      
      expect(() => {
        emitter.off('test', callback);
      }).not.toThrow();
    });

    it('should handle removing from non-existent event', () => {
      const callback = vi.fn();
      emitter.on('test', callback);
      
      expect(() => {
        emitter.off('nonexistent', callback);
      }).not.toThrow();
    });
  });

  describe('emit', () => {
    it('should call all listeners with arguments', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      emitter.on('test', callback1);
      emitter.on('test', callback2);
      
      emitter.emit('test', 'arg1', 'arg2', 'arg3');
      
      expect(callback1).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
      expect(callback2).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should handle emitting event with no listeners', () => {
      expect(() => {
        emitter.emit('test', 'data');
      }).not.toThrow();
    });

    it('should handle errors in listeners', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = vi.fn();
      
      emitter.on('test', errorCallback);
      emitter.on('test', normalCallback);
      
      // Should not throw and should call other listeners
      expect(() => {
        emitter.emit('test', 'data');
      }).not.toThrow();
      
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should call listener only once', () => {
      const callback = vi.fn();
      emitter.once('test', callback);
      
      emitter.emit('test', 'data1');
      emitter.emit('test', 'data2');
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('data1');
    });

    it('should remove listener after first call', () => {
      const callback = vi.fn();
      emitter.once('test', callback);
      
      emitter.emit('test', 'data');
      
      // Try to remove it - should not throw even though it's already removed
      expect(() => {
        emitter.off('test', callback);
      }).not.toThrow();
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      emitter.on('test1', callback1);
      emitter.on('test1', callback2);
      emitter.on('test2', callback3);
      
      emitter.removeAllListeners('test1');
      
      emitter.emit('test1', 'data');
      emitter.emit('test2', 'data');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      emitter.on('test1', callback1);
      emitter.on('test2', callback2);
      
      emitter.removeAllListeners();
      
      emitter.emit('test1', 'data');
      emitter.emit('test2', 'data');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});