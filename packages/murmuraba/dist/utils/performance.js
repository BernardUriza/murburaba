/* React externalized */
/**
 * Performance utilities for murmuraba
 * Because your original code was causing re-renders like a maniac
 */
/**
 * Debounce function that actually works
 */
function debounce(func, delay) {
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
function throttle(func, limit) {
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
class AudioCache {
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
function batchUpdates(callback) {
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
const requestIdleCallback = window.requestIdleCallback ||
    ((cb) => setTimeout(() => cb({
        didTimeout: false,
        timeRemaining: () => 50
    }), 1));
/**
 * Memory usage monitor
 */
function getMemoryUsage() {
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
class PerformanceMarker {
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
/**
 * Performance monitor for detailed tracking
 */
class PerformanceMonitor {
    constructor() {
        this.marks = new Map();
        this.measurements = new Map();
    }
    mark(name) {
        this.marks.set(name, performance.now());
    }
    measure(name, startMark, endMark) {
        const start = this.marks.get(startMark);
        const end = this.marks.get(endMark);
        if (!start || !end)
            return 0;
        const duration = end - start;
        if (!this.measurements.has(name)) {
            this.measurements.set(name, []);
        }
        this.measurements.get(name).push(duration);
        return duration;
    }
    getMeasurements() {
        const result = {};
        for (const [name, durations] of this.measurements.entries()) {
            if (durations.length > 0) {
                result[name] = durations[durations.length - 1];
            }
        }
        return result;
    }
    getAverage(name) {
        const durations = this.measurements.get(name);
        if (!durations || durations.length === 0)
            return 0;
        return durations.reduce((sum, d) => sum + d, 0) / durations.length;
    }
    reset() {
        this.marks.clear();
        this.measurements.clear();
    }
    getMemoryUsage() {
        if (!('memory' in performance)) {
            return {
                used: 0,
                total: 0,
                limit: 0,
                usedFormatted: '0 Bytes',
                totalFormatted: '0 Bytes',
                limitFormatted: '0 Bytes'
            };
        }
        const memory = performance.memory;
        return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            usedFormatted: formatBytes(memory.usedJSHeapSize),
            totalFormatted: formatBytes(memory.totalJSHeapSize),
            limitFormatted: formatBytes(memory.jsHeapSizeLimit)
        };
    }
}
/**
 * Measure execution time of a function
 */
export async function measureExecutionTime(fn) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
}
/**
 * Calculate average time from array of durations
 */
function calculateAverageTime(times) {
    if (times.length === 0)
        return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
}
/**
 * Format bytes to human readable format
 */
function formatBytes(bytes, decimals = 1) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const isNegative = bytes < 0;
    const absoluteBytes = Math.abs(bytes);
    const i = Math.floor(Math.log(absoluteBytes) / Math.log(k));
    return (isNegative ? '-' : '') + parseFloat((absoluteBytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
/**
 * Format duration from milliseconds to human readable format
 */
function formatDuration(ms) {
    if (ms === 0)
        return '0ms';
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    const hours = Math.floor(absMs / 3600000);
    const minutes = Math.floor((absMs % 3600000) / 60000);
    const seconds = (absMs % 60000) / 1000;
    const parts = [];
    if (hours > 0)
        parts.push(`${hours}h`);
    if (minutes > 0)
        parts.push(`${minutes}m`);
    if (seconds > 0) {
        if (seconds % 1 === 0) {
            parts.push(`${seconds}s`);
        }
        else {
            parts.push(`${seconds}s`);
        }
    }
    if (parts.length === 0 && absMs < 1000) {
        parts.push(`${absMs}ms`);
    }
    return (isNegative ? '-' : '') + parts.join(' ');
}


module.exports = { debounce, throttle, batchUpdates, requestIdleCallback, getMemoryUsage, calculateAverageTime, formatBytes, formatDuration, AudioCache, PerformanceMarker, PerformanceMonitor };