[![npm](https://badgen.net/npm/v/@homebridge/plugin-ui-utils)](https://www.npmjs.com/package/@homebridge/plugin-ui-utils)
[![npm](https://badgen.net/npm/dt/@homebridge/plugin-ui-utils)](https://www.npmjs.com/package/@homebridge/plugin-ui-utils)
[![Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/kqNCe2D)

# Homebridge Plugin Custom UI Utils

The package assists plugin developers creating fully customisable configuration user interfaces for their plugins.

- [Implementation](#implementation)
  * [Project Layout](#project-layout)
- [User Interface API](#user-interface-api)
  * [Config](#config)
  * [Requests](#requests)
  * [Toast Notifications](#toast-notifications)
  * [Modal](#modal)
  * [Forms](#forms)
  * [Events](#events)
  * [Plugin / Server Information](#plugin--server-information)
- [Server API](#server-api)
  * [Setup](#setup)
  * [Request Handling](#request-handling)
  * [Request Error Handling](#request-error-handling)
  * [Push Events](#push-events)
  * [Server Information](#server-information)
- [Examples](#examples)
- [Development](#development)

# Implementation

A plugin's custom user interface has two main components:

* [User Interface](#user-interface-api) - this is the HTML / CSS / JavaScript code the users interact with
* [Server](#server-api) - this is an optional server side script that provides endpoints the UI can call

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

You may customise the location of the `homebridge-ui` by setting the `customUiPath` property in the `config.schema.json`. For example: `"customUiPath": "./dist/homebridge-ui"`.

# User Interface API

A plugin's custom user interface is displayed inside an iframe in the settings modal, in place of the schema-generated form. 

The user interface API is provided to the plugin's custom UI via the `window.homebridge` object. This is injected into the plugin's custom UI during render.

<p align="center">
<img width="700px" src="https://user-images.githubusercontent.com/3979615/97826339-73d83500-1d15-11eb-8a14-a2a8e4895959.png">
</p>

Note:
  * Developers are free to use front end frameworks such as Angular, Vue, or React to create the plugin's custom user interface.
  * Developers should make use [Bootstrap 4](https://getbootstrap.com/docs) CSS classes, as these will automatically be styled and themed correctly. There is no need to include the boostrap css yourself, this will be injected by the Homebridge UI during render.
  * As the user interface is displayed in an isolated iframe, you can safely use any custom JavaScript and CSS.
  * The `index.html` file should not include `<html>`, `<head>`, or `<body>` tags, as these are added by the Homebridge UI during the render process.
  * You may include external assets in your HTML.

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

## Config

### `homebridge.getPluginConfig`

> `homebridge.getPluginConfig(): Promise<PluginConfig[]>;`

Returns a promise that resolves an array of accessory or platform config blocks for the plugin.

An empty array will be returned if the plugin is not currently configured.

```ts
const pluginConfigBlocks = await homebridge.getPluginConfig();
// [{ platform: 'ExamplePlatform', name: 'example' }]
```

### `homebridge.updatePluginConfig`

> `homebridge.updatePluginConfig(pluginConfig: PluginConfig[]): Promise<PluginConfig[]>;`

Update the plugin config.

* `pluginConfig`: A full array of platform and accessory config blocks.

This should be called whenever a change to the config is made.

This does not save the plugin config to disk.

Existing blocks not included will be removed.

```ts
const pluginConfig = [
  {
    name: 'my light 1',
    accessory: 'ExampleAccessory'
  },
  {
    name: 'my light 2',
    accessory: 'ExampleAccessory'
  }
]

await homebridge.updatePluginConfig(pluginConfig);
```

### `homebridge.savePluginConfig`

> `homebridge.savePluginConfig(): Promise<void>`

Saves the plugin config changes to the Homebridge `config.json`. This is the equivalent of clicking the *Save* button.

This should be used sparingly, for example, after a access token is generated.

You must call `await homebridge.updatePluginConfig()` first.

```ts
// update config first!
await homebridge.updatePluginConfig(pluginConfig);

// save config
await homebridge.savePluginConfig();
```

### `homebridge.getPluginConfigSchema`

> `homebridge.getPluginConfigSchema(): Promise<PluginSchema>;`

Returns the plugin's config.schema.json.

```ts
const schema = await homebridge.getPluginConfigSchema();
```

### `homebridge.getCachedAccessories`

> `homebridge.getCachedAccessories(): Promise<CachedAccessory[]>;`

Returns the any cached accessories for the plugin

```ts
const cachedAccessories = await homebridge.getCachedAccessories();
```

## Requests

This allows the custom UI to make API requests to their `server.js` script.

### `homebridge.request`

> `homebridge.request(path: string, body?: any): Promise<any>`

Make a request to the plugin's server side script.

* `path`: the path handler on the server that the request should be sent to
* `body`: an optional payload

Returns a promise with the response from the server.

User Interface Example:

```ts
const response = await homebridge.request('/hello', { who: 'world' });
console.log(response); // the response from the server
```

The corresponding code in the `server.js` file would look like this:

```js
// server side request handler
this.onRequest('/hello', async (payload) => {
  console.log(payload) // the payload sent from the UI
  return { hello: 'user' };
});
```

## Toast Notifications

Toast notifications are the pop-up notifications displayed in the bottom right corner. A plugin's custom UI can generate custom notifications with custom content.

<p align="center">
<img src="https://user-images.githubusercontent.com/3979615/97829910-7e97c780-1d1f-11eb-95ff-7d85d883b44c.png">
</p>

### `homebridge.toast.success`

> `homebridge.toast.success(message: string, title?: string): void`

Shows a green "success" notification.

* `message`: the toast content
* `title`: an optional title

### `homebridge.toast.error`

> `homebridge.toast.error(message: string, title?: string): void`

Shows a red "error" notification.

* `message`: the toast content
* `title`: an optional title

### `homebridge.toast.warning`

> `homebridge.toast.success(message: string, title?: string): void`

Shows an amber "warning" notification.

* `message`: the toast content
* `title`: an optional title

### `homebridge.toast.info`

> `homebridge.toast.success(message: string, title?: string): void`

Shows a blue "info" notification.

* `message`: the toast content
* `title`: an optional title

## Modal

### `homebridge.closeSettings`

> `homebridge.closeSettings(): void`

Close the settings modal.

This action does not save any config changes.

```ts
homebridge.closeSettings();
```

### `homebridge.showSpinner`

> `homebridge.showSpinner(): void`

Displays a spinner / loading overlay, preventing user input until cleared with `homebridge.hideSpinner`.

```ts
// show the spinner overlay
homebridge.showSpinner();

// wait for the request to process
await homebridge.request('/hello');

// hide the spinner overlay
homebridge.hideSpinner();
```

### `homebridge.hideSpinner`

> `homebridge.hideSpinner(): void`

Hide the spinner / loading overlay.

```ts
homebridge.hideSpinner();
```

## Forms

The custom user interface allows you to create two types of forms:

1. A form based on your plugin's `config.schema.json` file
    * User input is automatically mapped to the plugin config object
    * You can listen for change events from your custom user interface
    * The schema must contain all config options
2. A standalone form
    * Not linked to your `config.schema.json` form in any way
    * You must listen for change events, process the event, and update the plugin config
    * The form does not need to include all config options

Developers are also able to create their own forms using HTML.

### `homebridge.showSchemaForm`

> `homebridge.showSchemaForm(): void`

Show the schema-generated form below the custom user interface.
This feature only works for platform plugins that have set `singular` = `true` in their config.schema.json file.

```ts
homebridge.showSchemaForm();
```

When enabling the schema form, you should listen for the `configChanged` event to keep your config in sync. This event is triggered whenever the user makes a change in the schema-generated form (250ms debounce).

```ts
window.homebridge.addEventListener('configChanged', (event: MessageEvent) => {
  console.log('Updated config:', event.data);
});
```

### `homebridge.hideSchemaForm`

> `homebridge.hideSchemaForm(): void`

Hides the schema-generated form.

```ts
homebridge.hideSchemaForm();
```

### `homebridge.createForm`

> `homebridge.createForm(schema: FormSchema, data: any): IHomebridgeUiFormHelper;`

Create a new standalone form. You may pass in an arbitrary schema using the same options as the [config.schema.json](https://developers.homebridge.io/#/config-schema).

Only one standalone form can be displayed at a time. The main config-schema based form cannot be shown while a standalone form is being displayed.

* `schema`: The [form schema object](https://developers.homebridge.io/#/config-schema), may also contain layout metadata
* `data`: The initial form data
* `submitButton`: String. Optional label for a submit button, if not provided, no submit button will be displayed
* `cancelButton`: String. Optional label for a cancel button, if not provided, no cancel button will be displayed

Example:

```ts
// create the form
const myForm = homebridge.createForm(
   {
      schema: {
        type: 'object',
        properties: {
          name: {
            title: 'Name',
            type: 'string',
            required: true,
          }
        }
      },
      layout: null,
      form: null,
   },
   {
      name: 'initial name value'
   }
);

// watch for change events
myForm.onChange((change) => {
  console.log(change);
});

// watch for submit button click events
myForm.onSubmit((form) => {
  console.log(form);
});

// watch for cancel button click events
myForm.onCancel((form) => {
  console.log(form);
});

// stop listening to change events and hide the form
myForm.end();
```

## Events

The `homebridge` object is an [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget), this allows you to use the browsers built in [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) and [removeEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener) functions to subscribe and unsubscribe from events.

### Ready Event

Called when the Homebridge UI has completed rendering the plugin's custom UI.

```ts
homebridge.addEventListener('ready', () => {
  // do something with event
});
```

### Custom Events

Custom events can be pushed from the plugin's `server.js` script.

UI Example:

```ts
homebridge.addEventListener('my-event', (event) => {
  console.log(event.data); // the event payload from the server
});
```

The corresponding code in the `server.js` file would look like this:

```ts
this.pushEvent('my-event', { some: 'data' });
```

## Plugin / Server Information

### `homebridge.plugin`

> `homebridge.plugin`

Is an object that contains plugin metadata. 

```ts
{
  name: string;
  description: string;
  installedVersion: string;
  latestVersion: string;
  verifiedPlugin: boolean;
  updateAvailable: boolean;
  publicPackage: boolean;
  links: {
    npm: string;
    homepage?: string;
  }
}
```

### homebridge.serverEnv

> `homebridge.serverEnv`

Is an object containing some server metadata

```ts
{
  env: {
    platform: string;       // darwin, win32, linux, freebsd etc.
    nodeVersion: string;    // Node.js version
  }
}
```

# Server API

To provide server API endpoints that can be called from the custom UI, a plugin must place a `server.js` file in the `homebridge-ui` directory.

You will need to include the  `@homebridge/plugin-ui-utils` library as a prod dependency:

```
npm install --save @homebridge/plugin-ui-utils
```

Note:
  * This `server.js` script will be spawned as a child process when the plugin's settings modal is opened, and is terminated when the settings modal is closed.
  * The `server.js` script must create a new instance of a class that extends `HomebridgePluginUiServer` from the `@homebridge/plugin-ui-utils` library.
  * This file will be spawned as a child process when the plugin's settings modal is opened, and is terminated when the settings modal is closed.
  * The server side script must extend the class provided by the `@homebridge/plugin-ui-utils` library.

Example `server.js`:

```js
const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');

// your class MUST extend the HomebridgePluginUiServer
class UiServer extends HomebridgePluginUiServer {
  constructor () { 
    // super must be called first
    super();

    // Example: create api endpoint request handlers (example only)
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

## Setup

### `this.ready`

> `this.ready(): void`

Let the UI know the server is ready to accept requests.

```ts
this.ready();
```

## Request Handling

### `this.onRequest`

> `this.onRequest(path: string, fn: RequestHandler)`

Handle requests sent from the UI to the given path.

* `path`: the request path name
* `fn`: a function to handle the incoming requests

The value returned/resolved from the request handler function will be sent back to the UI as the request response.

Example creating a request handler on the server:

```ts
// server side code
this.onRequest('/hello', async (payload) => {
  console.log(payload) // the payload sent from the UI
  return { hello: 'user' };
});
```

The corresponding call in the UI to send requests to this endpoint:

```ts
// ui code
const response = await homebridge.request('/hello', { who: 'world' });
console.log(response); // the response from the server
```

## Request Error Handling

If you need to throw an error during your request, you should throw an instance of `RequestError` instead of a normal `Error`:

Example:

```ts
// server side code
const { RequestError } = require('@homebridge/plugin-ui-utils');

this.onRequest('/hello', async (payload) => {
  // something went wrong, throw a RequestError:
  throw new RequestError('Something went wrong!', { status: 404 });
});
```

You can then catch this in the UI:

```ts
try {
  await homebridge.request('/hello', { who: 'world' });
} catch (e) {
  console.log(e.message); // 'Something went wrong!'
  console.log(e.error); // { status: 404 }
}
```

Uncaught errors in event handlers, or errors thrown using `new Error` will still result in the waiting promise in the UI being rejected, however the error stack trace will also be shown in the Homebridge logs which should be avoided.

## Push Events

### `this.pushEvent`

> `this.pushEvent(event: string, data: any)`

Push events allow you to send data to the UI, without needed the UI to request it first.

* `event`: a string to describe the event type
* `data`: any data to send as an event payload to the UI.

Example pushing an event payload to the UI:

```ts
this.pushEvent('my-event', { some: 'data' });
```

The corresponding code to watch for the event in the UI:

```ts
homebridge.addEventListener('my-event', (event) => {
  console.log(event.data); // the event payload from the server
});
```

## Server Information

### `this.homebridgeStoragePath`

> `this.homebridgeStoragePath: string`

Returns the Homebridge instance's current storage path.

```ts
const storagePath = this.homebridgeStoragePath;
```

### `this.homebridgeConfigPath`

> `this.homebridgeConfigPath: string`

Returns the path to the Homebridge `config.json` file:

```ts
const configPath = this.homebridgeConfigPath;
```

### `this.homebridgeUiVersion`

> `this.homebridgeUiVersion: string`

Returns the version of the Homebridge UI:

```ts
const uiVersion = this.homebridgeUiVersion;
```

# Examples

* [Basic Example](./examples/basic-ui-server) - demos a minimal custom user interface, interacting with server side scripts, updating the plugin config, and using toast notifications.
* [Push Events](./examples/push-events) - demos how to send push events from the server, and listen for them in the custom user interface.


A full list of plugins that have implemented the custom user interface can be found [here](https://www.npmjs.com/package/@homebridge/plugin-ui-utils?activeTab=dependents).

#### homebridge-mercedesme

The [homebridge-mercedesme](https://github.com/SeydX/homebridge-mercedesme) plugin by [@SeydX](https://github.com/SeydX) allows users to pair their vehicle using a custom user interface:

<p align="center">
<img src="https://raw.githubusercontent.com/SeydX/homebridge-mercedesme/beta/images/hb_mercedesme_ui.gif" width="600px">
</p>

#### homebridge-bravia-tvos

The [homebridge-bravia-tvos](https://github.com/SeydX/homebridge-bravia-tvos) plugin by [@SeydX](https://github.com/SeydX) allows users to pair and dynamically configure a user's TV using a custom user interface:

<p align="center">
<img src="https://user-images.githubusercontent.com/3979615/99958753-0a13ee00-2dde-11eb-95fb-69a896d37545.png" width="600px">
</p>

#### homebridge-electra-smart

The [homebridge-electra-smart](https://github.com/nitaybz/homebridge-electra-smart) plugin by [nitaybz](https://github.com/nitaybz) allows users to request a OTP and enter it in exchange for an authentication token:

<p align="center">
<img src="https://user-images.githubusercontent.com/3979615/99959242-be157900-2dde-11eb-8114-6394da2a2e14.png" width="600px">
</p>

# Development

For hints and tips on how to develop your custom user interface, see [DEVELOPMENT.md](./DEVELOPMENT.md).
