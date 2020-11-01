declare global {
  interface Window {
    homebridge: HomebridgePluginUi;
  }
}

type PluginConfig = Array<Record<string, any>>;

/**
 * This script is injected into a plugins custom settings ui by the Homebridge UI
 * You should not include it in your own code, however you can use it for type information if desired.
 * It provides the interface to interact with the Homebridge UI service.
 */
export class HomebridgePluginUi extends EventTarget {
  public toast = new HomebridgeUiToastHelper();
  public origin = '';

  public plugin = window['_homebridge'].plugin;
  public serverEnv = window['_homebridge'].serverEnv;

  constructor() {
    super();
    window.addEventListener('message', this._handleIncomingMessage.bind(this), false);
  }

  private _handleIncomingMessage(e) {
    switch (e.data.action) {
      case 'ready': {
        this.origin = e.origin;
        document.body.style.display = 'block';
        this.dispatchEvent(new Event('ready'));
        this.fixScrollHeight();
        break;
      }
      case 'response': {
        this.dispatchEvent(new MessageEvent(e.data.requestId, {
          data: e.data,
        }));
        break;
      }
      case 'stream': {
        this.dispatchEvent(new MessageEvent(e.data.event, {
          data: e.data.data,
        }));
        break;
      }
      case 'body-class': {
        this._setBodyClass(e);
        break;
      }
      case 'inline-style': {
        this._setInlineStyle(e);
        break;
      }
      case 'link-element': {
        this._setLinkElement(e);
        break;
      }
      default:
        console.log(e.data);
    }
  }

  private _postMessage(message) {
    window.parent.postMessage(message, this.origin || '*');
  }

  private _setBodyClass(e) {
    document.body.classList.add(e.data.class);
  }

  private _setInlineStyle(e) {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = e.data.style;
    document.head.appendChild(styleElement);
  }

  private _setLinkElement(e) {
    const linkElement = document.createElement('link');
    linkElement.setAttribute('href', e.data.href);
    linkElement.setAttribute('rel', e.data.rel);
    document.head.appendChild(linkElement);
  }

  private async _requestResponse(payload): Promise<any> {
    // generate a random request id so we can link the response
    const requestId = Math.random().toString(36).substring(2);
    payload.requestId = requestId;

    // post message to parent
    this._postMessage(payload);

    // wait for response
    return new Promise((resolve, reject) => {
      const responseHandler = (event) => {
        this.removeEventListener(requestId, responseHandler);
        if (event.data.success) {
          resolve(event.data.data);
        } else {
          reject(event.data.data);
        }
      };

      this.addEventListener(requestId, responseHandler);
    });
  }

  /**
   * Tell the UI to adjust the height of the iframe container to the same as your document body
   */
  public fixScrollHeight() {
    this._postMessage({ action: 'scollHeight', scrollHeight: document.body.scrollHeight });
  }

  /**
   * Close the Plugin Settings modal.
   * This action does not save any config changes.
   */
  public closeSettings(): void {
    this._postMessage({ action: 'close' });
  }

  /**
   * Get the current config for the plugin.
   * @returns an array of platforms or accessory config blocks.
   * @returns an empty array if the plugin has no current config.
   * 
   * @example
   * ```ts
   * const pluginConfigBlocks = await homebridge.getPluginConfig();
   * ```
   */
  public async getPluginConfig(): Promise<PluginConfig> {
    return await this._requestResponse({ action: 'config.get' });
  }

  /**
  * Update the plugin config.
  * This should be called whenever a change to the config is made.
  * This method does not save the changes to the config.json file.
  * Existing blocks not included will be removed.
  *
  * @example
  * ```ts
  * await homebridge.updatePluginConfig(
  *   [
  *      {
  *         "name": "my light",
  *         "platform": "example_platform"
  *      }
  *   ]
  * );
  * ```
  */
  public async updatePluginConfig(pluginConfig: PluginConfig): Promise<PluginConfig> {
    return await this._requestResponse({ action: 'config.update', pluginConfig: pluginConfig });
  }

  /**
   * Save the plugin config.
   * You must called `homebridge.updatePluginConfig` first.
   * 
   * @example
   * ```ts
   * await homebridge.savePluginConfig();
   * ```
   */
  public async savePluginConfig(): Promise<void> {
    return await this._requestResponse({ action: 'config.save' });
  }

  /**
   * Make a request to the plugins server side script
   * @param path - the path handler to send the request to
   * @param body - an optional payload
   * 
   * @example
   * ```ts
   * 
   * const response = await homebridge.request('/hello', { who: 'world' });
   * console.log(response); // the response from the server
   * ```
   * 
   * The server side component would handle this using `this.onRequest`.
   * 
   * @example
   * ```ts
   * this.onRequest('/hello', async (payload) => {
   *  return {hello: 'user'};
   * });
   * ```
   */
  public async request(path: string, body?: any): Promise<any> {
    return await this._requestResponse({ action: 'request', path: path, body: body });
  }

}

class HomebridgeUiToastHelper {
  private _postMessage(type: string, message: string, title?: string) {
    window.parent.postMessage({ action: 'toast.' + type, message: message, title: title }, '*');
  }

  /**
   * Trigger a success toast notification in the UI
   * @param message 
   * @param title - optional title
   */
  public success(message: string, title?: string) {
    this._postMessage('success', message, title);
  }

  /**
   * Trigger an error toast notification in the UI
   * @param message 
   * @param title  - optional title
   */
  public error(message: string, title?: string) {
    this._postMessage('error', message, title);
  }

  /**
   * Trigger a warning toast notification in the UI
   * @param message 
   * @param title  - optional title
   */
  public warning(message: string, title?: string) {
    this._postMessage('warning', message, title);
  }

  /**
   * Trigger an info toast notification in the UI
   * @param message 
   * @param title  - optional title
   */
  public info(message: string, title?: string) {
    this._postMessage('info', message, title);
  }
}

window.homebridge = new HomebridgePluginUi();
