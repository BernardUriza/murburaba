/**
 * High-performance circular buffer for metrics collection
 */

export class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private writeIndex = 0;
  private size = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Buffer capacity must be positive');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add an item to the buffer
   * O(1) operation
   */
  push(item: T): void {
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  /**
   * Get the most recent N items
   * Returns items in reverse chronological order (newest first)
   */
  getRecent(count: number): T[] {
    const result: T[] = [];
    const itemsToGet = Math.min(count, this.size);
    
    for (let i = 0; i < itemsToGet; i++) {
      const index = (this.writeIndex - 1 - i + this.capacity) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Get all items in the buffer
   * Returns items in chronological order (oldest first)
   */
  toArray(): T[] {
    if (this.size === 0) return [];
    
    const result: T[] = [];
    const startIndex = this.size < this.capacity ? 0 : this.writeIndex;
    
    for (let i = 0; i < this.size; i++) {
      const index = (startIndex + i) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    
    return result;
  }

  /**
   * Get items within a time window
   * Requires items to have a timestamp property
   */
  getInTimeWindow<K extends T & { timestamp: number }>(
    windowMs: number,
    now: number = Date.now()
  ): K[] {
    const cutoff = now - windowMs;
    const result: K[] = [];
    
    // Iterate from newest to oldest
    for (let i = 0; i < this.size; i++) {
      const index = (this.writeIndex - 1 - i + this.capacity) % this.capacity;
      const item = this.buffer[index] as K;
      
      if (item && item.timestamp >= cutoff) {
        result.push(item);
      } else if (item && item.timestamp < cutoff) {
        // Stop early since older items won't match
        break;
      }
    }
    
    return result;
  }

  /**
   * Apply a function to all items in the buffer
   */
  forEach(fn: (item: T, index: number) => void): void {
    const items = this.toArray();
    items.forEach(fn);
  }

  /**
   * Map over all items in the buffer
   */
  map<U>(fn: (item: T, index: number) => U): U[] {
    const items = this.toArray();
    return items.map(fn);
  }

  /**
   * Reduce over all items in the buffer
   */
  reduce<U>(fn: (acc: U, item: T, index: number) => U, initial: U): U {
    const items = this.toArray();
    return items.reduce(fn, initial);
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.writeIndex = 0;
    this.size = 0;
  }

  /**
   * Get the current size of the buffer
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Check if the buffer is full
   */
  isFull(): boolean {
    return this.size === this.capacity;
  }

  /**
   * Check if the buffer is empty
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Get buffer statistics
   */
  getStats(): {
    size: number;
    capacity: number;
    utilization: number;
  } {
    return {
      size: this.size,
      capacity: this.capacity,
      utilization: this.size / this.capacity,
    };
  }
}

// Specialized buffer for metrics with built-in aggregation
export class MetricsBuffer<T extends { value: number; timestamp: number }> extends CircularBuffer<T> {
  /**
   * Calculate average of values in a time window
   */
  getAverageInWindow(windowMs: number, now: number = Date.now()): number | null {
    const items = this.getInTimeWindow(windowMs, now);
    if (items.length === 0) return null;
    
    const sum = items.reduce((acc, item) => acc + item.value, 0);
    return sum / items.length;
  }

  /**
   * Calculate min/max in a time window
   */
  getMinMaxInWindow(windowMs: number, now: number = Date.now()): { min: number; max: number } | null {
    const items = this.getInTimeWindow(windowMs, now);
    if (items.length === 0) return null;
    
    let min = Infinity;
    let max = -Infinity;
    
    for (const item of items) {
      min = Math.min(min, item.value);
      max = Math.max(max, item.value);
    }
    
    return { min, max };
  }

  /**
   * Calculate percentile in a time window
   */
  getPercentileInWindow(percentile: number, windowMs: number, now: number = Date.now()): number | null {
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }
    
    const items = this.getInTimeWindow(windowMs, now);
    if (items.length === 0) return null;
    
    const values = items.map(item => item.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    
    return values[Math.max(0, index)];
  }
}