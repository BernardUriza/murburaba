/**
 * Functional Programming Utilities
 * 
 * Modern functional programming helpers for cleaner code
 * 
 * @module shared/utils/functional
 */

import { Result, Ok, Err } from '../../types/result';

/**
 * Pipe functions together for left-to-right composition
 * 
 * @example
 * ```typescript
 * const process = pipe(
 *   (x: number) => x * 2,
 *   x => x + 1,
 *   x => x.toString()
 * );
 * 
 * process(5); // "11"
 * ```
 */
export function pipe<A, B>(fn1: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D
): (a: A) => D;
export function pipe<A, B, C, D, E>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E
): (a: A) => E;
export function pipe(...fns: Array<(arg: any) => any>): (arg: any) => any {
  return (arg: any) => fns.reduce((acc, fn) => fn(acc), arg);
}

/**
 * Compose functions together for right-to-left composition
 */
export function compose<A, B>(fn1: (a: A) => B): (a: A) => B;
export function compose<A, B, C>(fn2: (b: B) => C, fn1: (a: A) => B): (a: A) => C;
export function compose<A, B, C, D>(
  fn3: (c: C) => D,
  fn2: (b: B) => C,
  fn1: (a: A) => B
): (a: A) => D;
export function compose(...fns: Array<(arg: any) => any>): (arg: any) => any {
  const reversed = fns.reverse();
  return (arg: any) => reversed.reduce((acc, fn) => fn(acc), arg);
}

/**
 * Curry a function for partial application
 * 
 * @example
 * ```typescript
 * const add = curry((a: number, b: number) => a + b);
 * const add5 = add(5);
 * add5(3); // 8
 * ```
 */
export function curry<A, B, R>(
  fn: (a: A, b: B) => R
): (a: A) => (b: B) => R {
  return (a: A) => (b: B) => fn(a, b);
}

export function curry3<A, B, C, R>(
  fn: (a: A, b: B, c: C) => R
): (a: A) => (b: B) => (c: C) => R {
  return (a: A) => (b: B) => (c: C) => fn(a, b, c);
}

/**
 * Memoize a function for performance
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T {
  let inThrottle = false;
  let lastResult: ReturnType<T>;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      lastResult = fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  }) as T;
}

/**
 * Identity function
 */
export const identity = <T>(x: T): T => x;

/**
 * Constant function
 */
export const constant = <T>(x: T) => (): T => x;

/**
 * Noop function
 */
export const noop = (): void => {};

/**
 * Check if value is null or undefined
 */
export const isNil = (value: unknown): value is null | undefined => 
  value === null || value === undefined;

/**
 * Check if value is not null or undefined
 */
export const isNotNil = <T>(value: T | null | undefined): value is T => 
  !isNil(value);

/**
 * Safe property access
 */
export function prop<T, K extends keyof T>(
  key: K
): (obj: T) => T[K] {
  return (obj: T) => obj[key];
}

/**
 * Safe nested property access
 */
export function path<T, R>(
  keys: string[]
): (obj: T) => R | undefined {
  return (obj: T) => {
    let current: any = obj;
    for (const key of keys) {
      if (isNil(current)) return undefined;
      current = current[key];
    }
    return current as R;
  };
}

/**
 * Clamp a number between min and max
 */
export const clamp = (min: number, max: number) => (value: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Linear interpolation
 */
export const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * clamp(0, 1)(t);

/**
 * Map over Result type
 */
export function mapResult<T, U, E>(
  fn: (value: T) => U
): (result: Result<T, E>) => Result<U, E> {
  return (result) => result.ok ? Ok(fn(result.value)) : result;
}

/**
 * FlatMap over Result type
 */
export function flatMapResult<T, U, E>(
  fn: (value: T) => Result<U, E>
): (result: Result<T, E>) => Result<U, E> {
  return (result) => result.ok ? fn(result.value) : result;
}

/**
 * Tap function for side effects
 */
export function tap<T>(
  fn: (value: T) => void
): (value: T) => T {
  return (value: T) => {
    fn(value);
    return value;
  };
}

/**
 * Delay execution
 */
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a range of numbers
 */
export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Chunk an array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Group array elements by key
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * Partition array based on predicate
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  
  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }
  
  return [truthy, falsy];
}
