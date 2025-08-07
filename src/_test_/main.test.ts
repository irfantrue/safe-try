import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { Try } from 'main'

describe('Try.catch', () => {
    test('should handle successful async readFile', async () => {
        const result = await Try.catch(readFile('package.json', 'utf-8'))

        expect(result.error).toBeNull()
        expect(result.data).toBeString()
    })

    test('should handle successful async operation', async () => {
        const sayHello = async () => {
            await Try.sleep(50)
            return 'Hello World'
        }

        const result = await Try.catch(sayHello())

        expect(result.error).toBeNull()
        expect(result.data).toBe('Hello World')
    })

    test('should handle async operation errors', async () => {
        const failingOperation = async () => {
            await Try.sleep(50)
            throw new Error('Testing error')
        }

        const result = await Try.catch(failingOperation())

        expect(result.error).toBeInstanceOf(Error)
        expect(result.error?.message).toBe('Testing error')
        expect(result.data).toBeNull()
    })

    test('should handle immediate operation', async () => {
        const immediateOperation = () => Promise.resolve('Immediate operation')

        const result = await Try.catch(immediateOperation())

        expect(result.error).toBeNull()
        expect(result.data).toBe('Immediate operation')
    })

    test('should handle synchronous operation', async () => {
        const sayHelloString = () => JSON.stringify({ say: 'Hello World' })
        const sayHelloJson: { say: string } = JSON.parse(sayHelloString())

        const result = Try.catch(sayHelloJson)

        expect(result.error).toBeNull()
        expect(result.data!.say).toBe('Hello World')
    })
})

describe('Try.catch.withTimeout', () => {
    test('should handle successful async operation with timeout 50ms', async () => {
        const sayHello = async () => {
            await Try.sleep(1000)
            return 'Hello World'
        }

        const result = await Try.catch(sayHello()).withTimeout(50)

        expect(result.error).toBeInstanceOf(Error)
        expect(result.error?.message).toBe('Operation timed out after 50ms')
        expect(result.data).toBeNull()
    })
})
