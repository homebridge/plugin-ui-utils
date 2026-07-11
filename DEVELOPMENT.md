# Homebridge Custom UI Development FAQ

## How to get started developing locally?

You're probably used to using

```sh
npm run watch
```

in your plugin's root directory to test functionality while iterating. In order to do something similar when working on your UI, you'll need to install `homebridge-config-ui-x` as a dev dependency, and then start the homebridge-config-ui-x service itself.

```sh
npm i --save-dev homebridge-config-ui-x
npx homebridge-config-ui-x
```

Open your browser to port 8080 (the default when your config has no port set) or the port you've specified. Your `server.js` is started when you click "Settings" in the Plugins view, and terminated when you close the view. To "refresh" the view, you only need to dismiss the modal and re-open it.

Working examples of the plugin layout (a `homebridge-ui/` directory containing `server.js` and `public/index.html`) live in this repo under [`examples/`](./examples/).

## Where does `console.log` from `server.js` go?

The Homebridge UI forks your `server.js` as a child process and pipes its stdout and stderr into its own log, prefixed with your plugin's name:

```
[homebridge-example] Incoming Request: /token
```

So look in the Homebridge UI log output (the terminal where you ran `npx homebridge-config-ui-x`, or the log viewer in a real install) — not the browser console. `console.log` in your UI's HTML/JS goes to the browser console as usual.

The child process also receives these environment variables, exposed as getters on `HomebridgePluginUiServer`: `homebridgeStoragePath`, `homebridgeConfigPath` and `homebridgeUiVersion`.

## How to prevent asset caching during development?

1. Open DevTools
2. Go to the "Network" tab
3. Check the "Disable Cache" checkbox at the top

Caching will now be disabled whenever the DevTools are open.

See https://stackoverflow.com/a/7000899.

## How to use the Angular / Vue / Webpack development server?

To facilitate streamlined development when using compiled frameworks such as Angular or Vue, the Homebridge UI allows you to load your custom user interface directly from your development server.

To do this you will need to set `private` to `true` in the plugin's `package.json`.

The Homebridge UI will only allow you to load content from a development webserver when this attribute is set. This is to prevent published plugins from using the feature (either accidentally or intentionally).

You will need to remove this flag before you can publish your plugin to npm.

```json
{
  "private": true,
  "name": "homebridge-example",
  ...
}
```

Next, set the path to your development server in the `config.schema.json` using the `customUiDevServer` attribute:

```json
{
  "pluginAlias": "homebridge-example",
  "pluginType": "platform",
  "customUi": true,
  "customUiDevServer": "http://localhost:4200",
  ...
}
```

Finally, ensure you are starting your development server without "Live Reload" enabled.

**Angular**:

```sh
ng serve --no-live-reload
```

**Vue**, in the `vue.config.js` file:

```js
module: {
  rules: [
    {
      test: /\.vue$/,
      loader: 'vue-loader',
      options: {
        hotReload: false // disables Hot Reload
      }
    }
  ]
}
```

You will need to restart the Homebridge UI after making changes to the dev server configuration.

## How to get TypeScript types for `window.homebridge`?

Import this into your project, it will register the types for the `window.homebridge` object:

```ts
import '@homebridge/plugin-ui-utils/ui.interface'
```

You can also import the individual types (`IHomebridgePluginUi`, `PluginConfig`, `PluginSchema`, etc.) from the same path.

## How to test `window.homebridge` using Jest / Karma etc.?

As `window.homebridge` is injected at run time, you will need to mock the object in your tests. This package provides a class that helps you do this, `MockHomebridgePluginUi`.

:warning: Do not include `MockHomebridgePluginUi` in your production build!

Here is a simple example using Jest:

```ts
// example.spec.ts
import { MockHomebridgePluginUi } from '@homebridge/plugin-ui-utils/ui.mock'

describe('TestCustomUi', () => {
  let homebridge: MockHomebridgePluginUi

  beforeEach(() => {
    homebridge = new MockHomebridgePluginUi()
    window.homebridge = homebridge
  })

  it('should return the plugin config and schema when called', async () => {
    // mock the config
    homebridge.mockPluginConfig = [
      {
        platform: 'homebridge-example'
      }
    ]

    // mock the schema
    homebridge.mockPluginSchema = {
      pluginAlias: 'homebridge-example',
      pluginType: 'platform'
    }

    expect(await window.homebridge.getPluginConfig()).toHaveLength(1)
    expect(await window.homebridge.getPluginConfigSchema()).toHaveProperty('pluginAlias')
  })
})
```

The mock fires its `ready` event automatically (on the next microtask after construction), and you can set `mockPluginConfig` and `mockPluginSchema` at any time before your code calls the matching getters.
