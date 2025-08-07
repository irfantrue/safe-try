<p align="center">
  <h1 align="center">Safe-try</h1>
  <p align="center">
    TypeScript type safe error handling libary for both sync and async operations
  </p>
</p>
<br/>

<p align="center">
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/irfantrue/safe-try" alt="License"></a>
</p>

## Basic Usage

```typescript
import { Try } from "@minimal-effort/safe-try"

// Synchronous operations
const { data, error } = Try.catch(() => JSON.parse('{"name": "Budi"}'))
if (error) {
    console.error("Parse failed:", error)

    if (error instanceof Error) {
        // handle error
    }
}

console.log("Parsed data:", data) // { name: "Budi" }

// Asynchronous operations
const { data, error } = await Try.catch(fetch('/api/users'))
if (error) {
    console.error("API call failed:", error)
    // Handle error
}

const { data, error } = await Try.catch(() => fetch('/api/users'))
if (error) {
    console.error("API call failed:", error)
    // Handle error
}
```

## Advanced Configuration

```typescript
// Resilient API call with timeout, retry, and exponential backoff
const result = await Try.catch(fetch('/api/data'))
    .withTimeout(5000)                          // 5 second timeout
    .withRetry(3)                              // Retry up to 3 times
    .withBackoff({                             // Exponential backoff
        baseDelayMs: 1000,                       // Start with 1 second
        exponential: true,                       // Double delay each retry
        maxDelayMs: 10000,                       // Cap at 10 seconds
        jitter: true                             // Add randomness
    })

if (result.error) {
    console.error("Operation failed after all retries:", result.error)
    // handle error
}

console.log("Success:", result.data)
```

## `Try.sleep(ms)`

Utility method for creating delays.

```typescript
await Try.sleep(1000) // Wait 1 second
```

## API Calls

```typescript
async function fetchUserProfile(userId: string) {
    const result = await Try.catch(fetch(`/api/users/${userId}`))
        .withTimeout(10000)
        .withRetry(3)
        .withBackoff({
            baseDelayMs: 1000,
            exponential: true,
            jitter: true
        })

    if (result.error) {
        throw new Error(`Failed to fetch user ${userId}: ${result.error.message}`)
    }

    return result.data.json()
}
```

## File Operations

```typescript
import { readFile } from 'fs/promises'

const result = await Try.catch(readFile('config.json', 'utf-8'))
    .withRetry(2)

const config = result.error
    ? getDefaultConfig()
    : JSON.parse(result.data)
```

## Parsing Operations

```typescript
function parseJsonSafely(jsonString: string) {
    const result = Try.catch(JSON.parse(jsonString))

    return result.error
        ? { valid: false, error: result.error.message }
        : { valid: true, data: result.data }
}
```

## Migration Guide

### From try-catch blocks:

**Before:**
```typescript
try {
    const data = await riskyOperation()
    return { success: true, data }
} catch (error) {
    return { success: false, error }
}
```

**After:**
```typescript
const result = await Try.catch(riskyOperation())
return result.error
    ? { success: false, error: result.error }
    : { success: true, data: result.data }
```

### From Promise.catch():

**Before:**
```typescript
const data = await fetch('/api')
    .catch(error => {
        console.error(error)
        return null
    })
```

**After:**
```typescript
const result = await Try.catch(fetch('/api'))
if (result.error) {
    throw new Error('Api error')
}

const data = result.data
```

## Advanced Patterns

### Chaining Operations

```typescript
async function processUserData(userId: string) {
  // Fetch user
    const userResult = await Try.catch(fetchUser(userId))
        .withTimeout(5000)
        .withRetry(2)

  if (userResult.error) return userResult

  // Process user data
  const processResult = Try.catch(processUser(userResult.data))
  if (processResult.error) return processResult

  // Save processed data
  const saveResult = await Try.catch(saveUser(processResult.data))
        .withRetry(3)

  return saveResult
}
```

### Custom Error Types

```typescript
class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message)
    }
}

const result = await Try.catch<User, ApiError>(fetchUser('123'))
if (result.error) {
    console.error(`API Error ${result.error.status}: ${result.error.message}`)
    // handle error
}
```

---

**Star ⭐ this repo if you find it useful!**
