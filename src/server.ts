import process from 'node:process'

/**
 * Homebridge Custom Plugin UI Base Class
 * This provides the api to facilitate two-way communication between a plugin
 * custom UI HTML code and the server.
 *
 * This is a base class and is intended to be extended.
 *
 * @example
 * ```ts
 * class MyPluginUiServer extends HomebridgePluginUiServer {
 *   constructor() {
 *     // this MUST be called first
 *     super();
 *
 *     // this MUST be called to let the UI know your script is ready for requests
 *     this.ready();
 *
 *     // example handling requests
 *     this.onRequest('/hello', (payload) => {
 *       return { hello: 'world' };
 *     });
 *   }
 * }
 *
 * // start the class
 * (() => {
 *  return new MyPluginUiServer();
 * })();
 * ```
 */
export class HomebridgePluginUiServer {
  // A Map, not a plain object: on an object, a path such as 'constructor' or
  // 'toString' would find a method of Object.prototype and call it as a handler.
  private handlers = new Map<string, RequestHandler>()

  constructor() {
    if (!process.send) {
      console.error('This script can only run as a child process.')
      process.exit(1)
    }

    process.addListener('message', (request: unknown) => {
      // The Homebridge UI passes on what the browser sends, so a message can
      // be anything that survives JSON, null included. Reading .action of
      // null would throw here and end the process.
      if (typeof request !== 'object' || request === null) {
        return
      }
      if ((request as { action?: unknown }).action === 'request') {
        this.processRequest(request as UiRequest)
      }
    })

    // Node emits 'disconnect' on the child as soon as the parent's IPC channel
    // closes (either via child.disconnect() or because the parent process
    // exited), so this single handler is enough to terminate the server.
    // Registered here rather than at module scope so that merely importing
    // the package (e.g. for RequestError in a plugin's main code, which may
    // itself run as an IPC child such as a child bridge) does not install a
    // self-terminating handler.
    process.on('disconnect', () => {
      process.kill(process.pid, 'SIGTERM')
    })
  }

  get homebridgeStoragePath() {
    return process.env.HOMEBRIDGE_STORAGE_PATH
  }

  get homebridgeConfigPath() {
    return process.env.HOMEBRIDGE_CONFIG_PATH
  }

  get homebridgeUiVersion() {
    return process.env.HOMEBRIDGE_UI_VERSION
  }

  /**
   * Send a message to the Homebridge UI, unless the channel to it is closed.
   * The channel closes when the user closes the settings modal. A send after
   * that does not throw: Node emits an 'error' event on `process`, and with no
   * listener for it the process crashes with ERR_IPC_CHANNEL_CLOSED. A request
   * that finishes late, or a timer that pushes events, would hit this.
   * @param message - the message to send
   */
  private send(message: Record<string, unknown>) {
    if (!process.send || !process.connected) {
      return
    }
    process.send(message)
  }

  private sendResponse(request: UiRequest, data: unknown, success = true) {
    this.send({
      action: 'response',
      payload: {
        requestId: request.requestId,
        success,
        data,
      },
    })
  }

  private async processRequest(request: UiRequest) {
    const handler = this.handlers.get(request.path)
    if (handler) {
      try {
        // eslint-disable-next-line no-console
        console.log('Incoming Request:', request.path)
        const resp = await handler(request.body ?? {})
        return this.sendResponse(request, resp, true)
      } catch (e) {
        return this.sendError(request, e)
      }
    } else {
      console.error('No Registered Handler:', request.path)
      return this.sendResponse(request, { message: 'Not Found', path: request.path }, false)
    }
  }

  /**
   * Answer a request whose handler threw. Nothing here may throw: this runs in
   * a catch with no catch above it, so a throw would be an unhandled rejection,
   * which ends the process and leaves the UI waiting for an answer.
   * @param request - the request to answer
   * @param e - what the handler threw
   */
  private sendError(request: UiRequest, e: unknown) {
    if (e instanceof RequestError) {
      try {
        return this.sendResponse(request, { message: e.message, error: e.requestError }, false)
      } catch (sendError) {
        // process.send throws at once when the payload can not become JSON,
        // for example a circular object or a BigInt. Send the message alone.
        console.error(sendError)
        return this.sendResponse(request, { message: e.message }, false)
      }
    }
    console.error(e)
    return this.sendResponse(request, {
      message: describeThrown(e),
    }, false)
  }

  /**
   * Let the server and UI know you are ready to receive requests.
   * This method must be called when you are ready to process requests!
   * @example
   * ```ts
   * this.ready();
   * ```
   */
  public ready(): void {
    this.send({
      action: 'ready',
      payload: {
        server: true,
      },
    })
  }

  /**
   * Register a new request handler for a given route.
   * @param path the request route name
   * @param fn the function to handle the request and provide a response
   *
   * @example
   * ```ts
   * this.onRequest('/hello', async (payload) => {
   *  return {hello: 'user'};
   * });
   * ```
   *
   * You can then make requests to this endpoint from the client / ui using `homebridge.request`:
   * @example
   * ```ts
   * homebridge.request('/hello', {some: 'payload data'});
   * ```
   *
   */
  public onRequest(path: string, fn: RequestHandler) {
    this.handlers.set(path, fn)
  }

  /**
   * Push an event or stream data to the UI.
   * @param event the event name, the plugin UI can listen for this event
   * @param data the data to send
   *
   * @example
   * ```ts
   * this.pushEvent('my-event', {some: 'data'});
   * ```
   *
   * In the client / ui, you would then listen to this event using `homebridge.addEventListener`:
   *
   * @example
   * ```ts
   * homebridge.addEventListener('my-event', (event) => {
   *   // do something with the event
   * });
   * ```
   */
  public pushEvent(event: string, data: unknown) {
    this.send({
      action: 'stream',
      payload: {
        event,
        data,
      },
    })
  }
}

export class RequestError extends Error {
  public requestError: any

  constructor(message: string, requestError: any) {
    super(message)
    Object.setPrototypeOf(this, RequestError.prototype)

    this.name = 'RequestError'
    this.requestError = requestError
  }
}

/**
 * Turn any thrown value into a message. A handler can throw anything, not only
 * an Error: `.message` of `null` throws, and so does `String()` of an object
 * with no prototype.
 * @param e - the thrown value
 */
function describeThrown(e: unknown): string {
  if (e instanceof Error) {
    return e.message
  }
  try {
    return String(e)
  } catch {
    return Object.prototype.toString.call(e)
  }
}

/**
 * A request from the plugin's custom UI, as the Homebridge UI passes it on.
 * The fields come from the browser and are not checked.
 */
interface UiRequest {
  action: 'request'
  requestId: string
  path: string
  body?: unknown
}

// `any`, not `unknown`, where a plugin author's own code meets these types:
// a handler written as `(payload: { name: string }) => ...` must still be
// accepted, and RequestError.requestError is read back by plugin code.
type RequestResponse = string | number | boolean | null | void | Record<any, any> | Array<any>

type RequestHandler = (arg: any) => Promise<RequestResponse> | RequestResponse
