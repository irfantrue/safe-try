import { Try } from './main'

/**
 * Try class as the main entry point.
 *
 * The Try class provides static methods for safe operation execution:
 * - `Try.catch()` - Universal method for wrapping sync/async operations
 * - `Try.sleep()` - Utility for creating dealys
 *
 * @example
 * ```typescript
 * import { Try } from '@lazy/safe-try'
 *
 * // Handle any operation safely
 * const asyncResult = await Try.catch(asyncRisky())
 * 	.withTimeout(1000)
 * 	.withRetry(5)
 *
 * if (asyncResult.error) {
 *     // Handle error case
 * }
 *
 * console.log(asyncResult.data)
 *
 * const syncResult = Try.catch(syncRisky())
 *
 * if (syncResult.error) {
 *     // Handle error case
 * }
 * ```
 */
export { Try }
