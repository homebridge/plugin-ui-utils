# Homebridge Plugin Custom UI Utils

The package assists plugin developers creating fully customisable configuration UIs for their plugins.

# Implementation

A plugin's custom UI has two main components:

* User Interface - this is the HTML / CSS / JavaScript code the users interact with
* Server - this is an optional server side script that provides endpoints the UI can call

## Project Layout

A custom UI should be published under a directory named `homebridge-ui`:

* `homebridge-ui/public/index.html` - required - this is the plugin UI entry point.
* `homebridge-ui/public/` - you can store any other assets (`.css`, `.js`, images etc.) in the public folder.
* `homebridge-ui/server.js` - optional - this is the server side script containing API endpoints for your plugin UI.
* `config.schema.json` - required - set `customUi` to `true` in the schema to enable custom UI.

Basic structure example:

```bash
homebridge-example-plugin/
├── homebridge-ui
│   ├── public
│   │   └── index.html
│   └── server.js
├── config.schema.json
├── package.json
```

## User Interface

A plugin's custom UI is displayed inside an iframe in the settings modal, in place of the schema-generated form. As the custom UI is displayed in an iframe, the custom UI is isolated from the main UI, so custom JavaScript and CSS can be used safely.

<p align="center">
<img width="700px" src="https://user-images.githubusercontent.com/3979615/97826339-73d83500-1d15-11eb-8a14-a2a8e4895959.png">
</p>


Developers are free to create their UI using any framework they wish, such as Angular, Vue, or React - or they can also just use plain vanilla JavaScript.

Developers should make use [Bootstrap 4](https://getbootstrap.com/docs) css classes, as these will automatically be styled and themed correctly.

The `index.html` file should not include `<html>`, `<head>`, or `<body>` tags, as these are added by the Homebridge UI during the render process.

You may include external assets in your HTML.

Example `index.html`:

```html
<link rel="stylesheet" href="your-plugin.css">

<div class="card">
  <div class="form-group">
    <label for="exampleInputEmail1">Email address</label>
    <input type="email" class="form-control" id="exampleInputEmail1" aria-describedby="emailHelp">
    <small id="emailHelp" class="form-text text-muted">Help text...</small>
  </div>
</div>

<script>
(async () => {
  // get the current homebridge config
  const pluginConfig = await homebridge.getPluginConfig();

  // make requests to your server.js script
  const result = await homebridge.request('/hello', { name: 'world' });
})();
</script>
```

## Server

To provide server API endpoints that can be called from the custom UI, a plugin must place a `server.js` file in the `homebridge-ui` directory.

This file will be spawned as a child process when the plugin's settings modal is opened, and is terminated when the settings modal is closed.

The server side script must extend the class provided by the `@homebridge/plugin-ui-utils` library.

Example `server.js`:

```js
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

// your class MUST extend the HomebridgePluginUiServer
class UiServer extends HomebridgePluginUiServer {
  constructor () { 
    // super must be called first
    super();

    // create api endpoint request handlers (example only)
    this.onRequest('/hello', this.handleHelloRequest.bind(this));

    // this.ready() must be called to let the UI know you are ready to accept api calls
    this.ready();
  }

  /**
   * Example only.
   * Handle requests made from the UI to the `/hello` endpoint.
   */
  async handleHelloRequest(payload) {
    return { hello: 'world'; }
  }
}

// start the instance of the class
(() => {
  return new UiServer;
})();
```