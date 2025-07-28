/**
 * Retry utilities with exponential backoff
 */

import { Result, Ok, Err, AsyncResult } from '../types/result';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, nextDelayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: () => true,
  onRetry: () => {},
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, jitter } = options;
  
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  delay = Math.min(delay, maxDelayMs);
  
  if (jitter) {
    // Add random jitter (±25%)
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.max(0, Math.round(delay));
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): AsyncResult<T, RetryError> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return Ok(result);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === opts.maxAttempts) {
        break;
      }
      
      if (!opts.shouldRetry(lastError, attempt)) {
        break;
      }
      
      const delayMs = calculateDelay(attempt, opts);
      opts.onRetry(lastError, attempt, delayMs);
      
      await sleep(delayMs);
    }
  }
  
  return Err(
    new RetryError(
      `Operation failed after ${opts.maxAttempts} attempts`,
      opts.maxAttempts,
      lastError!
    )
  );
}

/**
 * Retry with timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  options?: RetryOptions
): AsyncResult<T, RetryError | Error> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  
  try {
    const result = await Promise.race([
      retry(fn, options),
      timeoutPromise,
    ]);
    return result as Result<T, RetryError>;
  } catch (error) {
    return Err(error as Error);
  }
}

/**
 * Create a retryable function
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return (async (...args: Parameters<T>) => {
    const result = await retry(() => fn(...args), options);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }) as T;
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly resetTimeMs = 60000,
    private readonly halfOpenRequests = 3
  ) {}
  
  async execute<T>(fn: () => Promise<T>): AsyncResult<T, Error> {
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeMs) {
        this.state = 'half-open';
        this.failures = 0;
      } else {
        return Err(new Error('Circuit breaker is open'));
      }
    }
    
    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.failures = 0;
        this.state = 'closed';
      }
      
      return Ok(result);
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
      }
      
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }
  
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}

// Example usage:
/*
// Simple retry
const result = await retry(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  {
    maxAttempts: 5,
    onRetry: (error, attempt, delay) => {
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
    }
  }
);

// With circuit breaker
const breaker = new CircuitBreaker();
const apiCall = () => fetch('/api/data').then(r => r.json());

for (let i = 0; i < 10; i++) {
  const result = await breaker.execute(apiCall);
  if (!result.ok) {
    console.log('Request failed:', result.error.message);
  }
}
*/