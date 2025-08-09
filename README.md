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
const { data, error } = Try.catch(() => JSON.parse('{"name": "Asep"}'))
if (error) {
    console.error("Parse failed:", error)

    if (error instanceof Error) {
        // handle error
    }
}

console.log("Parsed data:", data) // { name: "Asep" }

// Asynchronous operations
const { data, error } = await Try.catch(risky())
if (error) {
    console.error("failed:", error)
    // Handle error
}

const { data, error } = await Try.catch(() => risky())
if (error) {
    console.error("failed:", error)
    // Handle error
}
```

## `Try.sleep(ms)`

Utility method for creating delays.

```typescript
await Try.sleep(1000) // Wait 1 second
```

## Parsing Operations

```typescript
function parseJsonSafely(jsonString: string) {
    const result = Try.catch(() => JSON.parse(jsonString))

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
