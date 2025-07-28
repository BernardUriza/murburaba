/**
 * Result type for better error handling without exceptions
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export const Ok = <T>(value: T): Ok<T> => ({
  ok: true,
  value,
});

export const Err = <E>(error: E): Err<E> => ({
  ok: false,
  error,
});

// Type guards
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

// Utility functions
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.ok ? result.value : defaultValue;
};

export const unwrapOrElse = <T, E>(result: Result<T, E>, fn: (error: E) => T): T => {
  return result.ok ? result.value : fn(result.error);
};

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  return result.ok ? Ok(fn(result.value)) : result;
};

export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  return result.ok ? result : Err(fn(result.error));
};

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  return result.ok ? fn(result.value) : result;
};

// Async Result type
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Try-catch wrapper
export const tryCatch = <T, E = Error>(
  fn: () => T,
  mapError?: (error: unknown) => E
): Result<T, E> => {
  try {
    return Ok(fn());
  } catch (error) {
    if (mapError) {
      return Err(mapError(error));
    }
    return Err(error as E);
  }
};

export const tryCatchAsync = async <T, E = Error>(
  fn: () => Promise<T>,
  mapError?: (error: unknown) => E
): AsyncResult<T, E> => {
  try {
    const value = await fn();
    return Ok(value);
  } catch (error) {
    if (mapError) {
      return Err(mapError(error));
    }
    return Err(error as E);
  }
};

// Collect results
export const collect = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) return result;
    values.push(result.value);
  }
  return Ok(values);
};

// Example usage:
/*
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Err('Division by zero');
  }
  return Ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log('Result:', result.value); // 5
} else {
  console.log('Error:', result.error);
}

// Chain operations
const calculated = map(
  divide(10, 2),
  value => value * 2
); // Result<10, string>

// With async
async function fetchUser(id: string): AsyncResult<User, ApiError> {
  return tryCatchAsync(
    async () => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new ApiError(response.statusText);
      return response.json();
    },
    error => new ApiError(String(error))
  );
}
*/