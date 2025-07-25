/**
 * Performance utilities for murmuraba
 * Because your original code was causing re-renders like a maniac
 */
/**
 * Debounce function that actually works
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Throttle function for rate limiting
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Memory-efficient audio blob cache
 */
export declare class AudioCache {
    private cache;
    private maxSize;
    private ttl;
    private cleanupInterval;
    constructor(maxSize?: number, ttlMinutes?: number);
    set(key: string, blob: Blob): void;
    get(key: string): Blob | null;
    has(key: string): boolean;
    cleanup(): void;
    clear(): void;
    /**
     * CRITICAL FOR MEDICAL APP: Properly cleanup interval to prevent memory leak
     * Must be called when AudioCache instance is no longer needed
     */
    destroy(): void;
}
/**
 * Generate hash for blob caching
 */
export declare function getBlobHash(blob: Blob): Promise<string>;
/**
 * Batch state updates for React 18
 */
export declare function batchUpdates<T>(callback: () => T): T;
/**
 * Request idle callback polyfill
 */
export declare const requestIdleCallback: ((callback: IdleRequestCallback, options?: IdleRequestOptions) => number) & typeof globalThis.requestIdleCallback;
/**
 * Memory usage monitor
 */
export declare function getMemoryUsage(): {
    used: number;
    limit: number;
} | null;
/**
 * Performance mark wrapper
 */
export declare class PerformanceMarker {
    private marks;
    start(name: string): void;
    end(name: string): number;
    measure(name: string, fn: () => void): number;
    measureAsync<T>(name: string, fn: () => Promise<T>): Promise<[T, number]>;
}
/**
 * Performance monitor for detailed tracking
 */
export declare class PerformanceMonitor {
    private marks;
    private measurements;
    mark(name: string): void;
    measure(name: string, startMark: string, endMark: string): number;
    getMeasurements(): Record<string, number>;
    getAverage(name: string): number;
    reset(): void;
    getMemoryUsage(): {
        used: number;
        total: number;
        limit: number;
        usedFormatted: string;
        totalFormatted: string;
        limitFormatted: string;
    };
}
/**
 * Measure execution time of a function
 */
export declare function measureExecutionTime<T>(fn: () => T | Promise<T>): Promise<{
    result: T;
    duration: number;
}>;
/**
 * Calculate average time from array of durations
 */
export declare function calculateAverageTime(times: number[]): number;
/**
 * Format bytes to human readable format
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Format duration from milliseconds to human readable format
 */
export declare function formatDuration(ms: number): string;
//# sourceMappingURL=performance.d.ts.map