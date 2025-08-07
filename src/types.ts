/**
 * Utility type that makes specific properties of an interface required
 * while keeping others optional.
 */
export type WithRequiredProperty<T, K extends keyof T> = T &
    Required<Pick<T, K>>

/**
 * Represents the result of an async and sync operation that can either succeed with data or fail with an error.
 * This is a discriminated union that ensures type safety when handling results.
 *
 * @template T - The type of data returned on success
 * @template E - The type of error returned on failure (defaults to Error)
 */
export type Result<T, E = Error> =
    | { data: T; error: null }
    | { data: null; error: E }

/**
 * Configuration options for backoff strategies used in retry mechanisms.
 * Controls how delays between retry attempts are calculated.
 */
export interface BackoffConfig {
    /** Base delay in milliseconds between retry attempts */
    baseDelayMs?: number

    /**
     * Whether to use exponential backoff (delay doubles each attempt)
     * @default uses linear backoff
     */
    exponential?: boolean

    /**
     * Maximum delay cap in milliseconds to prevent excessively long waits
     * @default 30000 (30 seconds)
     */
    maxDelayMs?: number

    /**
     * Add random jitter to delays to prevent thundering herd problems
     * when multiple operations retry simultaneously
     */
    jitter?: boolean
}

/**
 * Configuration for async operations including timeout, retry, and backoff settings.
 */
export interface AsyncConfig extends BackoffConfig {
    /** Timeout duration in milliseconds before the operation is cancelled */
    timeoutMs?: number

    /** Custom error to throw when timeout occurs (defaults to generic timeout error) */
    timeoutError?: Error

    /** Maximum number of retry attempts (0 means no retries) */
    maxRetries?: number
}

export interface IAsyncOperation<T, E = Error>
    extends PromiseLike<Result<T, E>> {
    /**
     * Adds a timeout to the operation. If the operation doesn't complete within
     * the specified time, it will be cancelled and return a timeout error.
     *
     * @param ms - Timeout in milliseconds
     * @param error - Optional custom timeout error
     */
    withTimeout(ms: number, error?: E): IAsyncOperation<T, E>

    /**
     * Adds retry capability to the operation. If the operation fails, it will be
     * retried up to the specified maximum number of attempts.
     *
     * Note: This only retries on failures, not on timeouts (unless timeout is the failure).
     * Use in combination with withBackoff() for more sophisticated retry strategies.
     *
     * @param maxAttempts - Maximum number of retry attempts
     */
    withRetry(maxAttempts: number): IAsyncOperation<T, E>

    /**
     * Adds a backoff strategy for retries, controlling the delay between retry attempts.
     * This helps reduce load on failing services and improves the chance of eventual success.
     *
     * Must be used in combination with withRetry() to have any effect.
     *
     * @param baseDelayMs - Base delay between retries in milliseconds
     * @param exponential - Use exponential backoff
     * @param maxDelayMs - Maximum delay cap in milliseconds (default: 30000)
     * @param jitter - Add random jitter to prevent thundering herd
     */
    withBackoff(options: BackoffConfig): IAsyncOperation<T, E>
}
