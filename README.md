# Homebridge Plugin Custom UI Utils

The package assists plugin developers creating fully customisable configuration UIs for their plugins.

# Implementation

A plugin's custom UI has two main components:

* UI - this is the HTML / CSS / JavaScript code the users interact with
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
