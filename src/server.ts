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
  private handlers: Record<string, RequestHandler> = {}

  constructor() {
    if (!process.send) {
      console.error('This script can only run as a child process.')
      process.exit(1)
    }

    process.addListener('message', (request: any) => {
      switch (request.action) {
        case 'request': {
          this.processRequest(request)
        }
      }
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

  private sendResponse(request: any, data: any, success = true) {
    if (!process.send) {
      return
    }

    process.send({
      action: 'response',
      payload: {
        requestId: request.requestId,
        success,
        data,
      },
    })
  }

  private async processRequest(request: { action: string, requestId: string, path: string, body: any }) {
    if (this.handlers[request.path]) {
      try {
        // eslint-disable-next-line no-console
        console.log('Incoming Request:', request.path)
        const resp = await this.handlers[request.path](request.body || {})
        return this.sendResponse(request, resp, true)
      } catch (e) {
        if (e instanceof RequestError) {
          return this.sendResponse(request, { message: e.message, error: e.requestError }, false)
        } else {
          console.error(e)
          return this.sendResponse(request, { message: (e as Error).message }, false)
        }
      }
    } else {
      console.error('No Registered Handler:', request.path)
      return this.sendResponse(request, { message: 'Not Found', path: request.path }, false)
    }
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
    if (!process.send) {
      return
    }

    process.send({
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
    this.handlers[path] = fn
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
  public pushEvent(event: string, data: any) {
    if (!process.send) {
      return
    }

    process.send({
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

    this.requestError = requestError
  }
}

type RequestResponse = string | number | boolean | null | void | Record<any, any> | Array<any>

type RequestHandler = (arg: any) => Promise<RequestResponse> | RequestResponse

// Node emits 'disconnect' on the child as soon as the parent's IPC channel
// closes (either via child.disconnect() or because the parent process
// exited), so this single handler is enough to terminate the server. The
// previous 10s setInterval check was both redundant and kept the event
// loop alive, preventing natural process exit.
process.on('disconnect', () => {
  process.kill(process.pid, 'SIGTERM')
})
