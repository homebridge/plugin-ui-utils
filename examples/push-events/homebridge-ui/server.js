const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

class PluginUiServer extends HomebridgePluginUiServer {
  constructor() {
    // super() MUST be called first
    super();

    // this MUST be called when you are ready to accept requests
    this.ready();

    // push event example: push the current server time every second
    setInterval(() => {
      this.pushEvent('server-time-event', {
        time: new Date().toLocaleString(),
      });
    }, 1000);
  }
}

(() => {
  return new PluginUiServer();
})();
