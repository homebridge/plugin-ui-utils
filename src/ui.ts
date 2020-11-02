type PluginConfig = Array<Record<string, any>>;

/**
 * This script is injected into a plugins custom settings ui by the Homebridge UI
 * You should not include it in your own code, however you can use it for type information if desired.
 * It provides the interface to interact with the Homebridge UI service.
 */
class HomebridgePluginUi extends EventTarget {
  private origin = '';
  private lastBodyHeight = 0;

  public toast = new HomebridgeUiToastHelper();
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
        this._monitorFrameHeight();
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

  private _monitorFrameHeight() {
    if (window['ResizeObserver']) {
      // use ResizeObserver if available
      const resizeObserver = new window['ResizeObserver'](() => {
        this.fixScrollHeight();
      });
      resizeObserver.observe(document.body);
    } else {
      // fall back to polling
      setInterval(() => {
        if (document.body.scrollHeight !== this.lastBodyHeight) {
          this.lastBodyHeight = document.body.scrollHeight;
          this.fixScrollHeight();
        }
      }, 250);
    }
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

  public fixScrollHeight() {
    this._postMessage({ action: 'scrollHeight', scrollHeight: document.body.scrollHeight });
  }

  public closeSettings(): void {
    this._postMessage({ action: 'close' });
  }

  public async getPluginConfig(): Promise<PluginConfig> {
    return await this._requestResponse({ action: 'config.get' });
  }

  public async updatePluginConfig(pluginConfig: PluginConfig): Promise<PluginConfig> {
    return await this._requestResponse({ action: 'config.update', pluginConfig: pluginConfig });
  }

  public async savePluginConfig(): Promise<void> {
    return await this._requestResponse({ action: 'config.save' });
  }

  public async request(path: string, body?: any): Promise<any> {
    return await this._requestResponse({ action: 'request', path: path, body: body });
  }
}

class HomebridgeUiToastHelper {
  private _postMessage(type: string, message: string, title?: string) {
    window.parent.postMessage({ action: 'toast.' + type, message: message, title: title }, '*');
  }

  public success(message: string, title?: string) {
    this._postMessage('success', message, title);
  }

  public error(message: string, title?: string) {
    this._postMessage('error', message, title);
  }

  public warning(message: string, title?: string) {
    this._postMessage('warning', message, title);
  }

  public info(message: string, title?: string) {
    this._postMessage('info', message, title);
  }
}

window['homebridge'] = new HomebridgePluginUi();
