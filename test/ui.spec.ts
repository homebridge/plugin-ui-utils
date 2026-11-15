import type { AccessoryLayoutRoom } from '../src/ui.interface.js'

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { MockHomebridgePluginUi } from '../src/ui.mock.js'

const PARENT_ORIGIN = 'http://homebridge.local:8581'

/**
 * Deliver a message to the iframe as if the parent Homebridge UI sent it.
 * `ui.ts` drops anything that is not from `window.parent`; in a top-level
 * jsdom window that is the window itself.
 * @param data - the message payload
 */
function fromParent(data: Record<string, any>) {
  window.dispatchEvent(new MessageEvent('message', {
    data,
    origin: PARENT_ORIGIN,
    source: window,
  }))
}

/**
 * Wait for the next request the iframe posts to the parent.
 * @param postMessage - the spy on `window.parent.postMessage`
 */
async function nextRequest(postMessage: ReturnType<typeof vi.spyOn>) {
  await vi.waitFor(() => expect(postMessage).toHaveBeenCalled())
  return postMessage.mock.calls.at(-1)!
}

let homebridge: any

beforeAll(async () => {
  // The Homebridge UI sets this before it injects ui.js into the iframe.
  (window as any)._homebridge = { plugin: {}, serverEnv: {} }
  // @ts-expect-error ui.ts is a plain script that sets window.homebridge, not a module
  await import('../src/ui')
  homebridge = (window as any).homebridge

  // Pin the origin, as the parent's first message does in a real iframe.
  fromParent({ action: 'body-class', class: 'test' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('homebridge.getAccessoryLayout', () => {
  it('asks the parent for the layout and resolves with its reply', async () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    const layout: AccessoryLayoutRoom[] = [
      {
        name: 'Kitchen',
        services: [
          { uniqueId: 'abc' },
        ],
      },
      { name: 'Default Room', isDefault: true, services: [] },
    ]

    const result = homebridge.getAccessoryLayout()
    const [message, targetOrigin] = await nextRequest(postMessage)

    expect(message).toEqual({
      action: 'accessoryLayout.get',
      requestId: expect.any(String),
    })
    expect(targetOrigin).toBe(PARENT_ORIGIN)

    fromParent({
      action: 'response',
      requestId: message.requestId,
      success: true,
      data: layout,
    })

    await expect(result).resolves.toEqual(layout)
  })

  it('rejects when the parent reports an error', async () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})

    const result = homebridge.getAccessoryLayout()
    const [message] = await nextRequest(postMessage)

    fromParent({
      action: 'response',
      requestId: message.requestId,
      success: false,
      data: { message: 'Failed' },
    })

    await expect(result).rejects.toEqual({ message: 'Failed' })
  })

  it('ignores a reply from another origin', async () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})

    const result = homebridge.getAccessoryLayout()
    const [message] = await nextRequest(postMessage)

    window.dispatchEvent(new MessageEvent('message', {
      data: {
        action: 'response',
        requestId: message.requestId,
        success: true,
        data: [
          { name: 'Spoofed', services: [] },
        ],
      },
      origin: 'http://attacker.example',
      source: window,
    }))
    fromParent({
      action: 'response',
      requestId: message.requestId,
      success: true,
      data: [],
    })

    await expect(result).resolves.toEqual([])
  })
})

describe('homebridge requests', () => {
  it('gives every request its own id, even when Math.random repeats', async () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const first = homebridge.request('/first')
    const second = homebridge.request('/second')
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(2))
    const [[firstMessage], [secondMessage]] = postMessage.mock.calls as [Record<string, string>, string][]

    expect(firstMessage.requestId).not.toBe(secondMessage.requestId)

    fromParent({
      action: 'response',
      requestId: secondMessage.requestId,
      success: true,
      data: 'second',
    })
    fromParent({
      action: 'response',
      requestId: firstMessage.requestId,
      success: true,
      data: 'first',
    })
    await expect(first).resolves.toBe('first')
    await expect(second).resolves.toBe('second')
  })
})

describe('homebridge stylesheets from the parent', () => {
  it('stops the 5 second fallback timer once the stylesheet has loaded', () => {
    vi.useFakeTimers()
    try {
      fromParent({ action: 'link-element', href: 'http://homebridge.local:8581/theme.css', rel: 'stylesheet' })
      const link = document.head.querySelector('link[href$="theme.css"]') as HTMLLinkElement
      expect(vi.getTimerCount()).toBe(1)

      link.dispatchEvent(new Event('load'))

      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('mockHomebridgePluginUi.getAccessoryLayout', () => {
  it('returns the default room until a layout is set', async () => {
    const mock = new MockHomebridgePluginUi()

    await expect(mock.getAccessoryLayout()).resolves.toEqual([
      { name: 'Default Room', isDefault: true, services: [] },
    ])
  })

  it('returns mockAccessoryLayout', async () => {
    const mock = new MockHomebridgePluginUi()
    mock.mockAccessoryLayout = [
      {
        name: 'Office',
        services: [
          { uniqueId: 'xyz' },
        ],
      },
    ]

    await expect(mock.getAccessoryLayout()).resolves.toEqual(mock.mockAccessoryLayout)
  })
})
