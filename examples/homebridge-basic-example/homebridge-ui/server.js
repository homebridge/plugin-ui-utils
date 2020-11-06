const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const { createHash } = require('crypto');

class PluginUiServer extends HomebridgePluginUiServer {
  constructor() {
    // super() MUST be called first
    super();

    // handle request for the /token route
    this.onRequest('/token', this.generateToken.bind(this));

    // this MUST be called when you are ready to accept requests
    this.ready();
  }

  async generateToken(payload) {
    console.log('Username:', payload.username);

    // sleep for 1 second, just to demo async works
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      // generate a sha256 from the username and use that as a fake token
      const hashedUsername = createHash('sha256').update(payload.username).digest().toString('hex');

      // return data to the ui
      return {
        token: hashedUsername,
      }
    } catch (e) {
      throw new RequestError('Failed to Generate Token', { message: e.message });
    }

  }
}

(() => {
  return new PluginUiServer();
})();
