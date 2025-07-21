/**
 * Performance utilities for murmuraba
 * Because your original code was causing re-renders like a maniac
 */

/**
 * Debounce function that actually works
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memory-efficient audio blob cache
 */
export class AudioCache {
  private cache = new Map<string, { blob: Blob; timestamp: number }>();
  private maxSize: number;
  private ttl: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize = 50, ttlMinutes = 15) {
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
    
    // Auto cleanup expired entries - CRITICAL: Store interval ID for cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  set(key: string, blob: Blob): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    
    this.cache.set(key, { blob, timestamp: Date.now() });
  }

  get(key: string): Blob | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.blob;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * CRITICAL FOR MEDICAL APP: Properly cleanup interval to prevent memory leak
   * Must be called when AudioCache instance is no longer needed
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

/**
 * Generate hash for blob caching
 */
export async function getBlobHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Batch state updates for React 18
 */
export function batchUpdates<T>(callback: () => T): T {
  if ('startTransition' in window.React) {
    let result: T;
    (window.React as any).startTransition(() => {
      result = callback();
    });
    return result!;
  }
  return callback();
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback = 
  window.requestIdleCallback || 
  ((cb: IdleRequestCallback) => setTimeout(() => cb({
    didTimeout: false,
    timeRemaining: () => 50
  } as IdleDeadline), 1));

/**
 * Memory usage monitor
 */
export function getMemoryUsage(): { used: number; limit: number } | null {
  if (!('memory' in performance)) return null;
  
  const memory = (performance as any).memory;
  return {
    used: memory.usedJSHeapSize,
    limit: memory.jsHeapSizeLimit
  };
}

/**
 * Performance mark wrapper
 */
export class PerformanceMarker {
  private marks = new Map<string, number>();

  start(name: string): void {
    this.marks.set(name, performance.now());
  }

  end(name: string): number {
    const start = this.marks.get(name);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.marks.delete(name);
    return duration;
  }

  measure(name: string, fn: () => void): number {
    this.start(name);
    fn();
    return this.end(name);
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<[T, number]> {
    this.start(name);
    const result = await fn();
    const duration = this.end(name);
    return [result, duration];
  }
}