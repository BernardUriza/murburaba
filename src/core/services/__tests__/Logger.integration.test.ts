import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../Logger';

describe('Logger integration tests', () => {
  beforeEach(() => {
    // Reset console spies
    vi.clearAllMocks();
  });

  it('should handle circular references without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    
    // Create object with circular reference
    const obj: any = { name: 'test' };
    obj.self = obj;
    
    // This should not throw
    expect(() => {
      Logger.error('Test error', obj);
    }).not.toThrow();
    
    // Should have logged something
    expect(consoleSpy).toHaveBeenCalled();
    
    // The logged message should contain our error text
    const loggedMessage = consoleSpy.mock.calls[0]?.[0];
    expect(loggedMessage).toContain('Test error');
  });

  it('should handle React-like objects without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    
    // Create React-like object with properties that would cause circular refs
    const reactLikeObj = {
      $$typeof: Symbol.for('react.element'),
      type: 'div',
      props: {
        children: 'Hello',
        ref: { current: null }
      },
      _owner: {
        stateNode: {},
        elementType: 'App'
      }
    };
    
    // Add circular reference
    (reactLikeObj as any)._owner.child = reactLikeObj;
    
    // This should not throw
    expect(() => {
      Logger.error('React error', reactLikeObj);
    }).not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalled();
    
    const loggedMessage = consoleSpy.mock.calls[0]?.[0];
    expect(loggedMessage).toContain('React error');
  });

  it('should handle React Error objects with fiber nodes', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    
    // Create error with React-like properties
    const error = new Error('Component error');
    (error as any).fiber = {
      tag: 5,
      elementType: 'div',
      stateNode: {},
      child: {},
      return: {}
    };
    
    // Add circular reference in fiber
    (error as any).fiber.child = (error as any).fiber;
    
    // This should not throw
    expect(() => {
      Logger.error('Component crashed', { error });
    }).not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle DOM nodes without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'info');
    
    // Mock DOM node-like object
    const domNode = {
      nodeType: 1,
      nodeName: 'DIV',
      parentNode: {},
      children: []
    };
    
    // Add circular reference
    (domNode as any).parentNode.firstChild = domNode;
    
    expect(() => {
      Logger.info('DOM operation', { node: domNode });
    }).not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle serialization failures gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    
    // Create object that would cause JSON.stringify to fail
    const problematicObj = {
      toJSON() {
        throw new Error('JSON serialization failed');
      }
    };
    
    expect(() => {
      Logger.warn('Problematic object', problematicObj);
    }).not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should not crash when logging functions', () => {
    const consoleSpy = vi.spyOn(console, 'debug');
    
    const objWithFunction = {
      name: 'test',
      callback: function namedFunction() { return 'test'; },
      arrow: () => 'arrow',
      async asyncFunc() { return 'async'; }
    };
    
    expect(() => {
      Logger.debug('Object with functions', objWithFunction);
    }).not.toThrow();
    
    expect(consoleSpy).toHaveBeenCalled();
  });
});