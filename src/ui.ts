/**
 * This script is injected into a plugins custom settings ui by the Homebridge UI
 * You should not include it in your own code, however you can use it for type information if desired.
 * It provides the interface to interact with the Homebridge UI service.
 */

let EventTargetConstructor = window.EventTarget;

/**
 * Pollyfill for older browsers that do not support EventTarget as a constructor.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
 */
if (!Object.prototype.hasOwnProperty.call(window.EventTarget, 'caller')) {
  EventTargetConstructor = function (this: EventTarget) {
    this['listeners'] = {};
  } as unknown as { new(): EventTarget; prototype: EventTarget };

  EventTargetConstructor.prototype['listeners'] = null;
  EventTargetConstructor.prototype.addEventListener = function (type, callback) {
    if (!(type in this['listeners'])) {
      this['listeners'][type] = [];
    }
    this['listeners'][type].push(callback);
  };

  EventTargetConstructor.prototype.removeEventListener = function (type, callback) {
    if (!(type in this['listeners'])) {
      return;
    }
    const stack = this['listeners'][type];
    for (let i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback) {
        stack.splice(i, 1);
        return;
      }
    }
  };

  EventTargetConstructor.prototype.dispatchEvent = function (event) {
    if (!(event.type in this['listeners'])) {
      return true;
    }
    const stack = this['listeners'][event.type].slice();

    for (let i = 0, l = stack.length; i < l; i++) {
      stack[i].call(this, event);
    }
    return !event.defaultPrevented;
  };
}

class HomebridgePluginUi extends EventTargetConstructor {
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

  public _postMessage(message) {
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

  public showSpinner(): void {
    this._postMessage({ action: 'spinner.show' });
  }

  public hideSpinner(): void {
    this._postMessage({ action: 'spinner.hide' });
  }

  public showSchemaForm(): void {
    this._postMessage({ action: 'schema.show' });
  }

  public hideSchemaForm(): void {
    this._postMessage({ action: 'schema.hide' });
  }

  public createForm(schema, data) {
    return new HomebridgeUiFormHelper(this, schema, data);
  }

  public endForm() {
    this._postMessage({ action: 'form.end' });
  }

  public async getPluginConfig() {
    return await this._requestResponse({ action: 'config.get' });
  }

  public async updatePluginConfig(pluginConfig) {
    return await this._requestResponse({ action: 'config.update', pluginConfig: pluginConfig });
  }

  public async savePluginConfig() {
    return await this._requestResponse({ action: 'config.save' });
  }

  public async getPluginConfigSchema() {
    return await this._requestResponse({ action: 'config.schema' });
  }

  public async request(path: string, body?: any) {
    return await this._requestResponse({ action: 'request', path: path, body: body });
  }

  public async i18nCurrentLang(): Promise<string> {
    return await this._requestResponse({ action: 'i18n.lang' });
  }

  public async i18nGetTranslation(): Promise<Record<string, string>> {
    return await this._requestResponse({ action: 'i18n.translations' });
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

class HomebridgeUiFormHelper {
  private formId = Math.random().toString(36).substring(2);
  private _changeHandle?: (change) => any;
  public end: () => void;

  constructor(
    private parent: HomebridgePluginUi,
    schema: Record<string, any>,
    data: Record<string, any>,
  ) {
    this.parent._postMessage({ action: 'form.create', formId: this.formId, schema: schema, data: data });

    const handle = this._eventHandle.bind(this);

    this.parent.addEventListener(this.formId, handle);

    this.end = () => {
      this.parent.removeEventListener(this.formId, handle);
      this.parent._postMessage({ action: 'form.end', formId: this.formId, schema: schema, data: data });
    };
  }

  private _eventHandle(event) {
    if (this._changeHandle && typeof this._changeHandle === 'function') {
      this._changeHandle(event.data);
    } else {
      console.info('Homebridge Custom Plugin UI: Missing form onChange handler.');
    }
  }

  public onChange(fn) {
    if (typeof fn !== 'function') {
      console.error('Homebridge Custom Plugin UI: Form onChange handler must be a function.');
      return;
    }
    this._changeHandle = fn;
  }
}

window['homebridge'] = new HomebridgePluginUi();
