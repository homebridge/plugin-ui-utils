// @vitest-environment node

import process from 'node:process'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HomebridgePluginUiServer } from '../src/server.js'

/**
 * The server only runs as a child process the Homebridge UI forks. These tests
 * stand in for that parent: `process.send` is a spy, and a message "from the
 * parent" is an emitted 'message' event on `process`. Vitest runs them in a
 * worker thread (see vitest.config.ts), where `process.send` is free to replace.
 */
let sent: ReturnType<typeof vi.fn>
let originalSend: typeof process.send
let originalConnected: PropertyDescriptor | undefined
let listenersBefore: Record<'disconnect' | 'message', ((...args: any[]) => void)[]>

beforeEach(() => {
  listenersBefore = {
    message: process.listeners('message'),
    disconnect: process.listeners('disconnect'),
  }
  originalSend = process.send
  originalConnected = Object.getOwnPropertyDescriptor(process, 'connected')
  sent = vi.fn()
  process.send = sent as unknown as typeof process.send
  Object.defineProperty(process, 'connected', { configurable: true, value: true, writable: true })
})

afterEach(() => {
  for (const event of ['message', 'disconnect'] as const) {
    for (const listener of process.listeners(event)) {
      if (!listenersBefore[event].includes(listener)) {
        process.removeListener(event, listener as never)
      }
    }
  }
  process.send = originalSend
  if (originalConnected) {
    Object.defineProperty(process, 'connected', originalConnected)
  } else {
    delete (process as { connected?: boolean }).connected
  }
  vi.restoreAllMocks()
})

/**
 * Send a message to the server as the Homebridge UI would.
 * @param message - the IPC message
 */
function fromParent(message: unknown) {
  process.emit('message', message as never, undefined)
}

/**
 * Wait for the response to a request and return its payload.
 * @param requestId - the id of the request
 */
async function responseTo(requestId: string) {
  await vi.waitFor(() => expect(sent.mock.calls.some(([m]) => m.payload?.requestId === requestId)).toBe(true))
  return sent.mock.calls.find(([m]) => m.payload?.requestId === requestId)![0].payload
}

describe('homebridgePluginUiServer requests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it.each([
    'constructor',
    'toString',
    'hasOwnProperty',
    '__proto__',
  ])('answers Not Found for the path %s that no handler was registered for', async (path) => {
    const server = new HomebridgePluginUiServer()
    server.onRequest('/hello', () => 'hi')

    fromParent({
      action: 'request',
      requestId: path,
      path,
      body: { x: 1 },
    })

    await expect(responseTo(path)).resolves.toEqual({
      requestId: path,
      success: false,
      data: { message: 'Not Found', path },
    })
  })

  it('answers a registered handler', async () => {
    const server = new HomebridgePluginUiServer()
    server.onRequest('/hello', () => 'hi')

    fromParent({ action: 'request', requestId: 'r1', path: '/hello' })

    await expect(responseTo('r1')).resolves.toEqual({ requestId: 'r1', success: true, data: 'hi' })
  })
})
