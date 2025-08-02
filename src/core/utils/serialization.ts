/**
 * Safe JSON serialization utilities that handle circular references
 * and other edge cases that can occur in React applications
 */

export interface SerializationOptions {
  /** Maximum depth to traverse (prevents infinite recursion) */
  maxDepth?: number;
  /** Maximum string length for values */
  maxStringLength?: number;
  /** Whether to include function names */
  includeFunctions?: boolean;
  /** Custom replacer function */
  replacer?: (key: string, value: any) => any;
  /** Keys to exclude from serialization */
  excludeKeys?: string[];
}

const DEFAULT_OPTIONS: Required<SerializationOptions> = {
  maxDepth: 10,
  maxStringLength: 1000,
  includeFunctions: false,
  replacer: (key, value) => value,
  excludeKeys: []
};

/**
 * Safely stringify an object, handling circular references and other edge cases
 */
export function safeStringify(
  obj: any, 
  options: SerializationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    return JSON.stringify(obj, createSafeReplacer(opts), 2);
  } catch (error) {
    return `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Creates a safe replacer function for JSON.stringify
 */
function createSafeReplacer(options: Required<SerializationOptions>) {
  const seen = new WeakSet();
  
  return function replacer(key: string, value: any): any {
    // Skip excluded keys
    if (options.excludeKeys.includes(key)) {
      return undefined;
    }

    // Apply custom replacer first
    value = options.replacer(key, value);

    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle circular references for objects
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }

    // Handle different types
    return processValue(value, options, 0);
  };
}

/**
 * Process a value based on its type and options
 */
function processValue(value: any, options: Required<SerializationOptions>, depth: number): any {
  // Check max depth
  if (depth > options.maxDepth) {
    return '[Max Depth Exceeded]';
  }

  // Handle primitives
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > options.maxStringLength 
      ? value.substring(0, options.maxStringLength) + '...[truncated]'
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'function') {
    return options.includeFunctions ? `[Function: ${value.name || 'anonymous'}]` : '[Function]';
  }

  if (typeof value === 'symbol') {
    return `[Symbol: ${value.toString()}]`;
  }

  if (typeof value === 'bigint') {
    return `[BigInt: ${value.toString()}]`;
  }

  // Handle special objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (value instanceof RegExp) {
    return `[RegExp: ${value.toString()}]`;
  }

  // Handle React-specific objects
  if (isReactElement(value)) {
    return `[React Element: ${getReactElementType(value)}]`;
  }

  if (isReactFiber(value)) {
    return `[React Fiber: ${getFiberType(value)}]`;
  }

  // Handle DOM nodes
  if (isDOMNode(value)) {
    return `[DOM Node: ${value.nodeName}]`;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => 
      processValue(item, options, depth + 1)
    );
  }

  // Handle plain objects
  if (isPlainObject(value)) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (!options.excludeKeys.includes(key)) {
        result[key] = processValue(val, options, depth + 1);
      }
    }
    return result;
  }

  // Handle other objects by attempting to get useful info
  return getObjectInfo(value);
}

/**
 * Serialize Error objects with all relevant properties
 */
function serializeError(error: Error): Record<string, any> {
  const serialized: Record<string, any> = {
    name: error.name,
    message: error.message,
    stack: error.stack
  };

  // Include any additional enumerable properties
  for (const key of Object.getOwnPropertyNames(error)) {
    if (!['name', 'message', 'stack'].includes(key)) {
      try {
        const value = (error as any)[key];
        if (value !== undefined) {
          serialized[key] = typeof value === 'object' 
            ? '[Complex Object]' 
            : value;
        }
      } catch {
        // Ignore properties that can't be accessed
      }
    }
  }

  return serialized;
}

/**
 * Check if value is a React element
 */
function isReactElement(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.$$typeof &&
    (value.$$typeof.toString() === 'Symbol(react.element)' ||
     value.$$typeof === Symbol.for('react.element'))
  );
}

/**
 * Get React element type name
 */
function getReactElementType(element: any): string {
  if (typeof element.type === 'string') {
    return element.type;
  }
  if (typeof element.type === 'function') {
    return element.type.displayName || element.type.name || 'Unknown';
  }
  return 'Unknown';
}

/**
 * Check if value is a React Fiber node
 */
function isReactFiber(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('_owner' in value || 'stateNode' in value || 'elementType' in value) &&
    ('tag' in value || 'type' in value)
  );
}

/**
 * Get React Fiber type info
 */
function getFiberType(fiber: any): string {
  if (fiber.elementType) {
    if (typeof fiber.elementType === 'string') {
      return fiber.elementType;
    }
    if (typeof fiber.elementType === 'function') {
      return fiber.elementType.displayName || fiber.elementType.name || 'Component';
    }
  }
  
  if (fiber.type) {
    if (typeof fiber.type === 'string') {
      return fiber.type;
    }
    if (typeof fiber.type === 'function') {
      return fiber.type.displayName || fiber.type.name || 'Component';
    }
  }
  
  return `Fiber(${fiber.tag || 'unknown'})`;
}

/**
 * Check if value is a DOM node
 */
function isDOMNode(value: any): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.nodeType === 'number' &&
    typeof value.nodeName === 'string'
  );
}

/**
 * Check if value is a plain object (not a class instance)
 */
function isPlainObject(value: any): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Get basic info about an object
 */
function getObjectInfo(obj: any): string {
  const constructor = obj.constructor;
  const className = constructor?.name || 'Object';
  
  // Try to get some useful property names
  try {
    const keys = Object.keys(obj).slice(0, 3);
    const keyInfo = keys.length > 0 ? ` {${keys.join(', ')}}` : '';
    return `[${className}${keyInfo}]`;
  } catch {
    return `[${className}]`;
  }
}

/**
 * Create a safe context object for logging, specifically designed for React error boundaries
 */
export function createSafeErrorContext(
  error: Error,
  errorInfo: any,
  additionalContext?: Record<string, any>
): Record<string, any> {
  const safeContext: Record<string, any> = {
    error: serializeError(error),
    timestamp: new Date().toISOString()
  };

  // Safely include error info (React ErrorInfo)
  safeContext.errorInfo = {
    componentStack: (errorInfo && typeof errorInfo.componentStack === 'string') 
      ? errorInfo.componentStack 
      : '[Component Stack Not Available]'
  };

  // Safely include additional context
  if (additionalContext) {
    safeContext.context = safeStringify(additionalContext, {
      maxDepth: 5,
      excludeKeys: ['children', '_owner', 'ref', 'key', '__reactInternalInstance'],
      maxStringLength: 500
    });
  }

  return safeContext;
}

/**
 * Safe way to log React component props for debugging
 */
export function sanitizeProps(props: any): Record<string, any> {
  if (!props || typeof props !== 'object') {
    return {};
  }

  return JSON.parse(safeStringify(props, {
    maxDepth: 3,
    excludeKeys: [
      'children',
      'ref', 
      'key',
      '_owner',
      '__reactInternalInstance',
      '__reactInternalMemoizedUnmaskedChildContext',
      '__reactInternalMemoizedMaskedChildContext'
    ],
    maxStringLength: 200
  }));
}