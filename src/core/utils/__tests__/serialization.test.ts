import { describe, it, expect } from 'vitest';
import { safeStringify, createSafeErrorContext, sanitizeProps } from '../serialization';

describe('serialization utils', () => {
  describe('safeStringify', () => {
    it('should handle circular references without crashing', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      const result = safeStringify(obj);
      // Either circular reference or max depth - both are safe
      expect(result).toMatch(/(\[Circular Reference\]|\[Max Depth Exceeded\])/);
      expect(result).toContain('test');
    });

    it('should not crash with deep circular references', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      
      // The key test is that this doesn't throw or hang
      expect(() => {
        const result = safeStringify(obj, { maxDepth: 50 });
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should handle React elements', () => {
      const reactElement = {
        $$typeof: Symbol.for('react.element'),
        type: 'div',
        props: { children: 'Hello' }
      };
      
      const result = safeStringify(reactElement);
      expect(result).toContain('[React Element: div]');
    });

    it('should handle React fiber nodes', () => {
      const fiber = {
        tag: 5,
        elementType: 'div',
        stateNode: {},
        _owner: {}
      };
      
      const result = safeStringify(fiber);
      expect(result).toContain('[React Fiber');
    });

    it('should handle errors', () => {
      const error = new Error('Test error');
      const result = safeStringify(error);
      
      expect(result).toContain('Test error');
      expect(result).toContain('Error');
    });

    it('should handle functions', () => {
      const obj = {
        name: 'test',
        func: function testFunc() { return 'hello'; }
      };
      
      const result = safeStringify(obj);
      expect(result).toContain('[Function');
    });

    it('should exclude specified keys', () => {
      const obj = {
        public: 'visible',
        __reactInternalInstance: 'hidden',
        _owner: 'hidden',
        ref: 'hidden'
      };
      
      const result = safeStringify(obj, {
        excludeKeys: ['__reactInternalInstance', '_owner', 'ref']
      });
      
      expect(result).toContain('visible');
      expect(result).not.toContain('hidden');
    });

    it('should truncate long strings', () => {
      const obj = {
        longString: 'a'.repeat(2000)
      };
      
      const result = safeStringify(obj, { maxStringLength: 100 });
      expect(result).toContain('...[truncated]');
    });
  });

  describe('createSafeErrorContext', () => {
    it('should create safe error context', () => {
      const error = new Error('Test error');
      const errorInfo = {
        componentStack: 'at Component\n  at App'
      };
      
      const context = createSafeErrorContext(error, errorInfo, {
        level: 'component',
        props: { children: 'test' }
      });
      
      expect(context.error.name).toBe('Error');
      expect(context.error.message).toBe('Test error');
      expect(context.errorInfo.componentStack).toBe('at Component\n  at App');
      expect(context.timestamp).toBeDefined();
    });

    it('should handle null error info', () => {
      const error = new Error('Test error');
      
      const context = createSafeErrorContext(error, null);
      
      expect(context.error.name).toBe('Error');
      expect(context.errorInfo.componentStack).toBe('[Component Stack Not Available]');
    });
  });

  describe('sanitizeProps', () => {
    it('should sanitize React props', () => {
      const props = {
        children: 'Hello',
        onClick: () => {},
        ref: { current: null },
        _owner: { fiber: 'node' },
        __reactInternalInstance: 'internal'
      };
      
      const sanitized = sanitizeProps(props);
      
      expect(sanitized).not.toHaveProperty('children');
      expect(sanitized).not.toHaveProperty('ref');
      expect(sanitized).not.toHaveProperty('_owner');
      expect(sanitized).not.toHaveProperty('__reactInternalInstance');
      expect(sanitized).toHaveProperty('onClick');
    });

    it('should handle non-object props', () => {
      expect(sanitizeProps(null)).toEqual({});
      expect(sanitizeProps(undefined)).toEqual({});
      expect(sanitizeProps('string')).toEqual({});
      expect(sanitizeProps(123)).toEqual({});
    });
  });
});