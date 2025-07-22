import { EventEmitter } from '../../core/EventEmitter';
import { vi } from 'vitest';

describe('EventEmitter', () => {
  let emitter: EventEmitter<{
    test: (value: string) => void;
    error: (error: Error) => void;
    data: (id: number, data: any) => void;
  }>;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('on()', () => {
    it('should register event handler', () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      emitter.emit('test', 'hello');
      
      expect(handler).toHaveBeenCalledWith('hello');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should register multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.emit('test', 'data');
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should handle multiple event types', () => {
      const testHandler = vi.fn();
      const errorHandler = vi.fn();
      
      emitter.on('test', testHandler);
      emitter.on('error', errorHandler);
      
      emitter.emit('test', 'test-data');
      emitter.emit('error', new Error('test-error'));
      
      expect(testHandler).toHaveBeenCalledWith('test-data');
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('off()', () => {
    it('should remove event handler', () => {
      const handler = vi.fn();
      
      emitter.on('test', handler);
      emitter.off('test', handler);
      emitter.emit('test', 'should-not-call');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.off('test', handler1);
      emitter.emit('test', 'data');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should handle removing non-existent handler', () => {
      const handler = vi.fn();
      
      // Should not throw
      expect(() => emitter.off('test', handler)).not.toThrow();
    });
  });

  describe('emit()', () => {
    it('should handle events with no handlers', () => {
      // Should not throw
      expect(() => emitter.emit('test', 'data')).not.toThrow();
    });

    it('should pass multiple arguments to handlers', () => {
      const handler = vi.fn();
      
      emitter.on('data', handler);
      emitter.emit('data', 123, { key: 'value' });
      
      expect(handler).toHaveBeenCalledWith(123, { key: 'value' });
    });

    it('should handle handler errors without stopping other handlers', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation();
      const handler1 = vi.fn(() => { throw new Error('Handler error'); });
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.emit('test', 'data');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        'Error in event handler for test:', 
        expect.any(Error)
      );
      
      consoleError.mockRestore();
    });
  });

  describe('once()', () => {
    it('should call handler only once', () => {
      const handler = vi.fn();
      
      emitter.once('test', handler);
      emitter.emit('test', 'first');
      emitter.emit('test', 'second');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should work with multiple once handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.once('test', handler1);
      emitter.once('test', handler2);
      emitter.emit('test', 'data');
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
      
      emitter.emit('test', 'second');
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllListeners()', () => {
    it('should remove all listeners for specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      emitter.on('error', handler3);
      
      emitter.removeAllListeners('test');
      emitter.emit('test', 'data');
      emitter.emit('error', new Error('test'));
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      emitter.on('test', handler1);
      emitter.on('error', handler2);
      
      emitter.removeAllListeners();
      emitter.emit('test', 'data');
      emitter.emit('error', new Error('test'));
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount()', () => {
    it('should return correct listener count', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      expect(emitter.listenerCount('test')).toBe(0);
      
      emitter.on('test', handler1);
      expect(emitter.listenerCount('test')).toBe(1);
      
      emitter.on('test', handler2);
      expect(emitter.listenerCount('test')).toBe(2);
      
      emitter.off('test', handler1);
      expect(emitter.listenerCount('test')).toBe(1);
    });

    it('should return 0 for non-existent event', () => {
      expect(emitter.listenerCount('test')).toBe(0);
    });
  });
});