/**
 * Shared Types
 * 
 * Common type definitions used across features
 * 
 * @module shared/types
 */

// Re-export from existing types
export * from '../../types/audio-types';
export * from '../../types/branded';
export * from '../../types/result';

// Modern discriminated unions for state management
export type LoadingState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Async operation state
export type AsyncState<T> = 
  | { status: 'pending' }
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: Error };

// Resource state for suspense
export type Resource<T> = {
  read(): T;
};

// Utility types
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type DeepReadonly<T> = T extends object ? {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
} : T;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

// Event types
export type EventHandler<T = void> = T extends void ? () => void : (payload: T) => void;
export type AsyncEventHandler<T = void> = T extends void ? () => Promise<void> : (payload: T) => Promise<void>;

// Function types
export type Predicate<T> = (value: T) => boolean;
export type Comparator<T> = (a: T, b: T) => number;
export type Mapper<T, U> = (value: T) => U;
export type Reducer<T, U> = (accumulator: U, value: T) => U;

// Branded primitive types for extra safety
export type UserId = string & { readonly brand: unique symbol };
export type Timestamp = number & { readonly brand: unique symbol };
export type Percentage = number & { readonly brand: unique symbol };

// Constructor functions for branded types
export const UserId = (id: string): UserId => id as UserId;
export const Timestamp = (ms: number): Timestamp => ms as Timestamp;
export const Percentage = (value: number): Percentage => {
  if (value < 0 || value > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }
  return value as Percentage;
};
