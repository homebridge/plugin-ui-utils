# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this package is

- `@homebridge/plugin-ui-utils` — a helper library that plugin authors install to build a custom config UI for their Homebridge plugin.
- Published as an ESM package. Consumers import either the root (`HomebridgePluginUiServer`, `RequestError`, UI types) or `./ui.interface` for just the type declarations of `window.homebridge`.
- There are no automated tests in this repo. `npm test` is a stub.

## Commands

- `npm run build` — clean `dist/`, then run **both** TypeScript projects (`tsconfig.json` + `tsconfig.ui.json`). Always use this, not `tsc` alone — see the dual-build note below.
- `npm run lint` / `npm run lint:fix` — ESLint via `@antfu/eslint-config`. Run before any commit; `npm run prepublishOnly` runs `lint` + `build`.
- `npm run check` — `npm install` followed by `npm outdated`. Used to review dependency drift.

## Architecture

This library spans **two completely different runtime environments**, which is the main thing to understand before changing code:

1. **Server side** — Node.js. Runs as a child process that the Homebridge UI spawns when the user opens the plugin's settings modal, and terminates when they close it.
2. **UI side** — Browser. Runs inside an iframe that the Homebridge UI renders to host the plugin's custom HTML/CSS/JS.

Each side has its own source file, its own communication mechanism, and its own tsconfig.

### Source layout

- `src/server.ts` — `HomebridgePluginUiServer` base class (and `RequestError`). Plugin authors extend this in their own `server.js`. Communicates with the parent Homebridge UI process over **Node IPC** (`process.send` / `process.on('message')`). Includes a 10-second heartbeat: if `process.connected` is false, the process SIGTERMs itself. This is how the server cleans up when the user closes the settings modal.
- `src/ui.ts` — `HomebridgePluginUi` class. The Homebridge UI **injects** this script into the plugin's iframe at render time and assigns the instance to `window.homebridge`. Plugin authors never import this file — they only consume it via `window.homebridge`. Communicates with the parent window using **`window.postMessage`**. Includes a polyfill for browsers where `EventTarget` is not a constructor.
- `src/ui.interface.ts` — TypeScript declarations for everything on `window.homebridge` (`IHomebridgePluginUi`, `IHomebridgeUiFormHelper`, `IHomebridgeUiToastHelper`, plus `PluginConfig`, `PluginSchema`, `PluginMetadata`, `ServerEnvMetadata`, `CachedAccessory`, `CachedMatterAccessory`). Plugin authors import this for types only.
- `src/ui.mock.ts` — `MockHomebridgePluginUi` for plugin authors to use in their own Jest/Karma tests. Implements `IHomebridgePluginUi` against in-memory mock data.
- `src/index.ts` — public entrypoint. Re-exports `HomebridgePluginUiServer`, `RequestError`, and the UI interface types. Does **not** export `ui.ts` (UI runtime is injected, not imported).

### Request / response correlation

Both sides use a small request/response protocol:

- UI → server: `ui.ts:_requestResponse` generates a random `requestId`, posts a `{ action: 'request', path, body, requestId }` message to the parent window, and resolves a promise when a `MessageEvent` with that `requestId` arrives.
- Server → UI: `server.ts:processRequest` looks up the registered handler for `request.path`, calls it, and sends `{ action: 'response', payload: { requestId, success, data } }` back via `process.send`. A `RequestError` thrown by the handler is unwrapped into `{ message, error: requestError }` and returned with `success: false`.
- Streaming the other way: `server.ts:pushEvent` emits `{ action: 'stream', payload: { event, data } }` over IPC; the UI dispatches it as a `MessageEvent` named after `event` on the `homebridge` EventTarget so consumers can `addEventListener`.

The Homebridge UI itself is the intermediary between these two channels — this repo only owns each end.

### Dual TypeScript build (important)

There are two tsconfigs because the two sides have different inputs/outputs:

- `tsconfig.json` — builds everything in `src/` **except `ui.ts`** into `dist/`. This is what consumers `import` from the package.
- `tsconfig.ui.json` — extends the above but **only includes `ui.ts`**. Produces `dist/ui.js` for the Homebridge UI to inject into the iframe.

The `build` script runs both. `tsc --project tsconfig.json` alone will silently miss `ui.ts`; `tsc --project tsconfig.ui.json` alone will miss everything else. If you change either tsconfig, make sure `ui.ts` is in exactly one project.

## Lint rules worth knowing

`eslint.config.js` uses `@antfu/eslint-config` with these notable overrides:

- Single quotes only (`'quotes': ['error', 'single']`).
- Sorted exports and named exports (`perfectionist/sort-exports`, `perfectionist/sort-named-exports`).
- Sorted imports with grouped order (types → builtin → external → internal → relative → side-effect). Newlines between groups.
- `import/order` is off (the perfectionist rules above replace it).
- `1tbs` brace style.
- Markdown is formatted by ESLint (`formatters.markdown: true`).

## Examples

`examples/basic-ui-server` and `examples/push-events` are standalone mini-plugins demonstrating the API. They live in this repo but are not part of the published package — they each have their own `package.json` and `homebridge-ui/` directory in the layout described in `README.md`.
