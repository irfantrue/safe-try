import type {
    AsyncConfig,
    BackoffConfig,
    IAsyncOperation,
    Result,
    WithRequiredProperty,
} from './types'

/**
 * Implementation of the IAsyncOperation interface that provides async operation handling.
 *
 * This class wraps a Promise and adds configurable timeout, retry, and backoff capabilities.
 * It implements a fluent API pattern where each method returns a new instance with updated configuration.
 *
 * Key features:
 * - Immutable operations: each method returns a new instance
 * - Composable configuration: timeout, retry, and backoff can be combined
 * - Type-safe error handling with discriminated unions
 * - Promise-like interface (thenable) for seamless async/await usage
 *
 * @template T - The type of data returned on successful operation
 * @template E - The type of error returned on failure (defaults to Error)
 */
class AsyncOperation<T, E = Error> implements IAsyncOperation<T, E> {
    constructor(
        private readonly operation: Promise<T> | (() => Promise<T>),
        private readonly config: AsyncConfig = {},
    ) {}

    /**
     * Adds a timeout to the operation. If the operation doesn't complete within
     * the specified time, it will be cancelled and return a timeout error.
     *
     * @param ms - Timeout in milliseconds
     * @param error - Optional custom timeout error
     *
     * @example
     * ```typescript
     * const { data, error } = await Try.catch(fetch()).withTimeout(3000)
     *
     * // With timeout custom error
     * const { data, error } = await Try.catch(fetch())
     *     .withTimeout(3000, new Error('Too slow!'))
     * ```
     */
    withTimeout(ms: number, error?: E): IAsyncOperation<T, E> {
        return new AsyncOperation<T, E>(this.operation, {
            ...this.config,
            timeoutMs: ms,
            timeoutError: error as Error,
        })
    }

    /**
     * Adds retry capability to the operation. If the operation fails, it will be
     * retried up to the specified maximum number of attempts.
     *
     * Note: This only retries on failures, not on timeouts (unless timeout is the failure).
     * Use in combination with withBackoff() for more sophisticated retry strategies.
     *
     * @param maxAttempts - Maximum number of retry attempts
     *
     * @example
     * ```typescript
     * const { data, error } = await Try.catch(fetch()).withRetry(3)
     * ```
     */
    withRetry(maxAttempts: number): IAsyncOperation<T, E> {
        return new AsyncOperation<T, E>(this.operation, {
            ...this.config,
            maxRetries: maxAttempts,
        })
    }

    /**
     * Adds a backoff strategy for retries, controlling the delay between retry attempts.
     * This helps reduce load on failing services and improves the chance of eventual success.
     *
     * Must be used in combination with withRetry() to have any effect.
     *
     * Supported backoff types:
     * - Linear: delay = attempt * baseDelayMs
     * - Exponential: delay = 2^(attempt - 1) * baseDelayMs
     *
     * @param baseDelayMs - Base delay between retries in milliseconds
     * @param exponential - Use exponential backoff
     * @param maxDelayMs - Maximum delay cap in milliseconds (default: 30000)
     * @param jitter - Add random jitter to prevent thundering herd
     */
    withBackoff(
        options: WithRequiredProperty<BackoffConfig, 'baseDelayMs'>,
    ): IAsyncOperation<T, E> {
        return new AsyncOperation<T, E>(this.operation, {
            ...this.config,
            baseDelayMs: options.baseDelayMs,
            exponential: options.exponential,
            maxDelayMs: options.maxDelayMs,
            jitter: options.jitter,
        })
    }

    /**
     * Implementation of PromiseLike interface to make this class thenable.
     *
     * This allows AsyncOperation to be used with async/await syntax and Promise methods.
     * The operation is executed when then() is called, not when the AsyncOperation is created.
     */
    then<TResult1 = Result<T, E>, TResult2 = never>(
        onfulfilled?:
            | ((value: Result<T, E>) => TResult1 | Promise<TResult1>)
            | null,
        onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected)
    }

    /**
     * Execute a single attempt of the operation with optional timeout.
     *
     * This method handles the core operation execution and timeout logic.
     * It always returns a Result<T, E> rather than throwing exceptions.
     */
    private async run(): Promise<Result<T, E>> {
        try {
            let operationPromise: Promise<T>

            if (typeof this.operation === 'function') {
                operationPromise = this.operation()
            } else {
                operationPromise = this.operation
            }

            // Apply timeout if configured using Promise.race pattern
            if (this.config.timeoutMs) {
                const timeoutPromise = new Promise<never>((_, reject) => {
                    const currentTimeout = setTimeout(() => {
                        const error =
                            this.config.timeoutError ||
                            new Error(
                                `Operation timed out after ${this.config.timeoutMs}ms`,
                            )
                        reject(error)
                    }, this.config.timeoutMs)

                    // Clean up timeout if operation complete first
                    operationPromise.finally(() => clearTimeout(currentTimeout))
                })

                // Race the operation against the timeout
                operationPromise = Promise.race([
                    operationPromise,
                    timeoutPromise,
                ])
            }

            const result = await operationPromise
            return { data: result, error: null }
        } catch (e) {
            return { data: null, error: e as E }
        }
    }

    /**
     * Execute the configured operation with retry logic and backoff logic.
     *
     * This is the main execution method:
     * 1. Multiple retry attempts based on configuration
     * 2. Backoff delays between retries (linear of exponential)
     * 3. Jitter to prevent thundering herd problems
     * 4. Maximum delay caps to prevent excessive waiting
     */
    private async execute(): Promise<Result<T, E>> {
        const maxAttempts = (this.config.maxRetries || 0) + 1
        let error: E | null = null

        // Attempt the operation up to maxAttempts time
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const result = await this.run()

            // Success case return immediately
            if (!result.error) {
                return result
            }

            // Store the error for potential return
            error = result.error

            // If this is the last attempt, break without delay
            if (attempt === maxAttempts) {
                break
            }

            // Apply retry backoff is configured
            if (this.config.baseDelayMs) {
                let delay = this.config.baseDelayMs

                if (this.config.exponential) {
                    // Exponential backoff: 2^(attempt - 1) * baseDelay
                    // attempt 1 = 2^0 * base = base
                    // attempt 2 = 2^1 * base = 2 * base
                    // attempt 3 = 2^2 * base = 4 * base
                    delay = 2 ** (attempt - 1) * this.config.baseDelayMs
                } else {
                    // Linear backoff: attempt * baseDelay
                    // attempt 1 = 1 * base = base
                    // attempt 2 = 2 * base = 2 * base
                    // attempt 3 = 3 * base = 3 * base
                    delay = attempt * this.config.baseDelayMs
                }

                // Apply maximum delay cap (default 30 seconds)
                delay = Math.min(delay, this.config.maxDelayMs || 30000)

                // Add random jitter to prevent thundering herd (random 0 - 1000ms)
                if (this.config.jitter) {
                    delay += Math.random() * 1000
                }

                await Try.sleep(delay)
            }
        }

        // All attempts failed return last error
        return {
            data: null,
            error:
                error ||
                (new Error('Operation failed after all retry attempts') as E),
        }
    }
}

/**
 * Utility class providing static methods for safe operation execution and control flow.
 *
 * The Try class serves as a factory and utility provider for creating AsyncOperation instances
 * and handling both synchronous and asynchronous operations safely.
 *
 * Key features:
 * - Automatic sync/async detection
 * - Exception-safe operation wrapping
 * - Utility methods for common async patterns
 * - Factory methods for creating resilient operations
 */
export class Try {
    /**
     * Universal method that safely wraps both synchronous and asynchronous operations.
     *
     * This method automatically detects whether the input is a Promise or a direct value
     * and returns the appropriate wrapper. For Promises, it returns an AsyncOperation
     * that can be configured with timeout, retry, and backoff. For direct values,
     * it returns a Result object immediately.
     *
     * @overload
     * @param fn - Async operation (Promise) to wrap
     * @return AsyncOperation that can be configured and executed
     *
     * @overload
     * @param fn - Synchronous value to wrap
     * @return Result object containing the value or any thrown error
     *
     * @template T - The type of the successful result
     * @template E - The type of error (defaults to Error)
     */
    static catch<T, E = Error>(fn: Promise<T>): IAsyncOperation<T, E>
    static catch<T, E = Error>(fn: () => Promise<T>): IAsyncOperation<T, E>
    static catch<T, E = Error>(fn: () => T): Result<T, E>
    static catch<T, E = Error>(
        fn: Promise<T> | (() => Promise<T>) | (() => T),
    ): IAsyncOperation<T, E> | Result<T, E> {
        try {
            if (fn && typeof fn === 'object' && 'then' in fn) {
                return new AsyncOperation<T, E>(fn as Promise<T>)
            }

            if (typeof fn === 'function') {
                const func = fn()

                // Check if result is a Promise
                if (func && typeof func === 'object' && 'then' in func) {
                    return new AsyncOperation<T, E>(func as Promise<T>)
                }

                return { data: func as T, error: null }
            }

            // Should not reach here
            throw new Error('Invalid input: expected Promise or function')
        } catch (e) {
            // Handle any synchronous errors during wrapping
            return { data: null, error: e as E }
        }
    }

    /**
     * Creates a delay (sleep) utility for async operations.
     *
     * This is commonly used in retry logic, rate limiting, and testing scenarios.
     * The delay is non-blocking and allows other operations to continue.
     *
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after the specified delay
     */
    static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
