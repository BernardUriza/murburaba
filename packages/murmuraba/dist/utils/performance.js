/**
 * Performance utilities for murmuraba
 * Because your original code was causing re-renders like a maniac
 */
/**
 * Debounce function that actually works
 */
export function debounce(func, delay) {
    let timeoutId = null;
    return (...args) => {
        if (timeoutId)
            clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null;
        }, delay);
    };
}
/**
 * Throttle function for rate limiting
 */
export function throttle(func, limit) {
    let inThrottle = false;
    return (...args) => {
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
    constructor(maxSize = 50, ttlMinutes = 15) {
        this.cache = new Map();
        this.cleanupInterval = null;
        this.maxSize = maxSize;
        this.ttl = ttlMinutes * 60 * 1000;
        // Auto cleanup expired entries - CRITICAL: Store interval ID for cleanup
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }
    set(key, blob) {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldest = Array.from(this.cache.entries())
                .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
            if (oldest)
                this.cache.delete(oldest[0]);
        }
        this.cache.set(key, { blob, timestamp: Date.now() });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check if expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.blob;
    }
    has(key) {
        return this.get(key) !== null;
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
    }
    /**
     * CRITICAL FOR MEDICAL APP: Properly cleanup interval to prevent memory leak
     * Must be called when AudioCache instance is no longer needed
     */
    destroy() {
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
export async function getBlobHash(blob) {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Batch state updates for React 18
 */
export function batchUpdates(callback) {
    if ('startTransition' in window.React) {
        let result;
        window.React.startTransition(() => {
            result = callback();
        });
        return result;
    }
    return callback();
}
/**
 * Request idle callback polyfill
 */
export const requestIdleCallback = window.requestIdleCallback ||
    ((cb) => setTimeout(() => cb({
        didTimeout: false,
        timeRemaining: () => 50
    }), 1));
/**
 * Memory usage monitor
 */
export function getMemoryUsage() {
    if (!('memory' in performance))
        return null;
    const memory = performance.memory;
    return {
        used: memory.usedJSHeapSize,
        limit: memory.jsHeapSizeLimit
    };
}
/**
 * Performance mark wrapper
 */
export class PerformanceMarker {
    constructor() {
        this.marks = new Map();
    }
    start(name) {
        this.marks.set(name, performance.now());
    }
    end(name) {
        const start = this.marks.get(name);
        if (!start)
            return 0;
        const duration = performance.now() - start;
        this.marks.delete(name);
        return duration;
    }
    measure(name, fn) {
        this.start(name);
        fn();
        return this.end(name);
    }
    async measureAsync(name, fn) {
        this.start(name);
        const result = await fn();
        const duration = this.end(name);
        return [result, duration];
    }
}
