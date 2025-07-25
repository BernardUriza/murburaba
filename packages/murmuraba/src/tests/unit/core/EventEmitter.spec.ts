/**
 * Unit tests for EventEmitter
 * Tests event handling, subscriptions, and memory management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from '../../../core/EventEmitter';

describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe('Event subscription', () => {
    it('should register event listeners', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      emitter.on('test-event', callback);
      emitter.emit('test-event', 'data');

      // Assert
      expect(callback).toHaveBeenCalledWith('data');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple listeners for same event', () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      // Act
      emitter.on('test-event', callback1);
      emitter.on('test-event', callback2);
      emitter.on('test-event', callback3);
      emitter.emit('test-event', 'data');

      // Assert
      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
      expect(callback3).toHaveBeenCalledWith('data');
    });

    it('should handle multiple events independently', () => {
      // Arrange
      const eventACallback = vi.fn();
      const eventBCallback = vi.fn();

      // Act
      emitter.on('event-a', eventACallback);
      emitter.on('event-b', eventBCallback);
      emitter.emit('event-a', 'dataA');
      emitter.emit('event-b', 'dataB');

      // Assert
      expect(eventACallback).toHaveBeenCalledWith('dataA');
      expect(eventBCallback).toHaveBeenCalledWith('dataB');
      expect(eventACallback).not.toHaveBeenCalledWith('dataB');
      expect(eventBCallback).not.toHaveBeenCalledWith('dataA');
    });
  });

  describe('One-time listeners', () => {
    it('should execute once listeners only once', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      emitter.once('test-event', callback);
      emitter.emit('test-event', 'first');
      emitter.emit('test-event', 'second');
      emitter.emit('test-event', 'third');

      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should remove once listener after execution', () => {
      // Arrange
      const onceCallback = vi.fn();
      const regularCallback = vi.fn();

      // Act
      emitter.once('test-event', onceCallback);
      emitter.on('test-event', regularCallback);
      
      emitter.emit('test-event', 'first');
      emitter.emit('test-event', 'second');

      // Assert
      expect(onceCallback).toHaveBeenCalledTimes(1);
      expect(regularCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event unsubscription', () => {
    it('should remove specific listener', () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Act
      emitter.on('test-event', callback1);
      emitter.on('test-event', callback2);
      emitter.off('test-event', callback1);
      emitter.emit('test-event', 'data');

      // Assert
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should handle removing non-existent listener', () => {
      // Arrange
      const callback = vi.fn();
      const nonExistentCallback = vi.fn();

      // Act
      emitter.on('test-event', callback);
      emitter.off('test-event', nonExistentCallback); // Should not throw
      emitter.emit('test-event', 'data');

      // Assert
      expect(callback).toHaveBeenCalledWith('data');
    });

    it('should handle removing listener from non-existent event', () => {
      // Arrange
      const callback = vi.fn();

      // Act & Assert - Should not throw
      expect(() => {
        emitter.off('non-existent-event', callback);
      }).not.toThrow();
    });
  });

  describe('Event emission', () => {
    it('should handle emitting events with no listeners', () => {
      // Act & Assert - Should not throw
      expect(() => {
        emitter.emit('no-listeners', 'data');
      }).not.toThrow();
    });

    it('should pass multiple arguments to listeners', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      emitter.on('test-event', callback);
      emitter.emit('test-event', 'arg1', 'arg2', { key: 'value' }, 42);

      // Assert
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' }, 42);
    });

    it('should execute listeners in order of registration', () => {
      // Arrange
      const order: number[] = [];
      const callback1 = () => order.push(1);
      const callback2 = () => order.push(2);
      const callback3 = () => order.push(3);

      // Act
      emitter.on('test-event', callback1);
      emitter.on('test-event', callback2);
      emitter.on('test-event', callback3);
      emitter.emit('test-event');

      // Assert
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('Error handling', () => {
    it('should continue executing listeners even if one throws', () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn(() => {
        throw new Error('Test error');
      });
      const callback3 = vi.fn();
      
      // Spy on console.error to suppress error output in tests
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      emitter.on('test-event', callback1);
      emitter.on('test-event', callback2);
      emitter.on('test-event', callback3);
      emitter.emit('test-event', 'data');

      // Assert
      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
      expect(callback3).toHaveBeenCalledWith('data');
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Memory management', () => {
    it('should not leak memory when removing all listeners', () => {
      // Arrange
      const callbacks = Array.from({ length: 100 }, () => vi.fn());

      // Act
      callbacks.forEach(cb => emitter.on('test-event', cb));
      callbacks.forEach(cb => emitter.off('test-event', cb));
      emitter.emit('test-event', 'data');

      // Assert
      callbacks.forEach(cb => {
        expect(cb).not.toHaveBeenCalled();
      });
    });

    it('should handle listener that removes itself', () => {
      // Arrange
      const callback2 = vi.fn();
      const callback1 = vi.fn(() => {
        emitter.off('test-event', callback1);
      });

      // Act
      emitter.on('test-event', callback1);
      emitter.on('test-event', callback2);
      emitter.emit('test-event');
      emitter.emit('test-event'); // Second emission

      // Assert
      expect(callback1).toHaveBeenCalledTimes(1); // Only called once
      expect(callback2).toHaveBeenCalledTimes(2); // Called both times
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined as event data', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      emitter.on('test-event', callback);
      emitter.emit('test-event', undefined);

      // Assert
      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('should handle null as event data', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      emitter.on('test-event', callback);
      emitter.emit('test-event', null);

      // Assert
      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should handle empty string as event name', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      emitter.on('', callback);
      emitter.emit('', 'data');

      // Assert
      expect(callback).toHaveBeenCalledWith('data');
    });
  });
});