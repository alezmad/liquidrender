/**
 * Timeout Utilities for Query Execution
 *
 * Provides promise-based timeout mechanisms for database queries.
 */

export class TimeoutError extends Error {
  constructor(
    message: string = "Operation timed out",
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Creates a promise that rejects after the specified timeout
 */
export function createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Query timed out after ${timeoutMs}ms`, timeoutMs));
    }, timeoutMs);
  });
}

/**
 * Wraps a promise with a timeout
 * @returns The result of the promise or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise<T>(timeoutMs)]);
}

export default { TimeoutError, createTimeoutPromise, withTimeout };
