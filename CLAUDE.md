# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this package is

- `@homebridge/plugin-ui-utils` — a helper library that plugin authors install to build a custom config UI for their Homebridge plugin.
- Published as an ESM package (`"type": "module"`). The `exports` map exposes three entry points: the root (`HomebridgePluginUiServer`, `RequestError`, UI interface types), `./ui.interface` (just the type declarations for `window.homebridge`), and `./ui.mock` (the Jest/Karma mock — deliberately not re-exported from the root, because it must never end up in a production build).
- There are no automated tests in this repo. `npm test` is a stub — validation is `npm run lint && npm run build` plus manual testing against a real Homebridge UI (see `DEVELOPMENT.md`).

## Commands

```sh
npm run build       # clean dist/, then run BOTH tsc projects — see dual-build note below
npm run lint        # eslint via @antfu/eslint-config; prepublishOnly runs lint + build
npm run lint:fix
npm run check       # npm install + npm outdated, used to review dependency drift
```

Always use `npm run build`, never `tsc` alone — `tsc --project tsconfig.json` silently misses `ui.ts`, and `tsc --project tsconfig.ui.json` misses everything else.

## Architecture

This library spans **two completely different runtime environments**, which is the main thing to understand before changing code:

1. **Server side** — Node.js. Runs as a child process that the Homebridge UI spawns when the user opens the plugin's settings modal, and terminates when they close it.
2. **UI side** — Browser. Runs inside an iframe that the Homebridge UI renders to host the plugin's custom HTML/CSS/JS.

The Homebridge UI itself (the `homebridge-config-ui-x` package) is the intermediary between the two — this repo only owns each end of the conversation, not the middle.

### Source layout

- `src/server.ts` — `HomebridgePluginUiServer` base class and `RequestError`. Plugin authors extend the class in their own `server.js`. Communicates with the parent Homebridge UI process over **Node IPC** (`process.send` / `process.on('message')`). Lifecycle: the constructor registers a `process.on('disconnect')` handler that SIGTERMs the process as soon as the parent closes the IPC channel — this is how the server exits when the user closes the settings modal. The handler lives in the constructor (not module scope) so that merely importing the package does not install it. (There used to be a 10-second `process.connected` polling heartbeat; it was removed because `disconnect` covers it and the interval kept the event loop alive.)
- `src/ui.ts` — `HomebridgePluginUi` class. The Homebridge UI **injects** this script into the plugin's iframe at render time and assigns the instance to `window.homebridge`. Plugin authors never import this file — they only consume it via `window.homebridge`. Communicates with the parent window using **`window.postMessage`**. Includes a polyfill for browsers where `EventTarget` is not a constructor.
- `src/ui.interface.ts` — TypeScript declarations for everything on `window.homebridge` (`IHomebridgePluginUi`, `IHomebridgeUiFormHelper`, `IHomebridgeUiToastHelper`, plus `PluginConfig`, `PluginSchema`, `PluginFormSchema`, `PluginMetadata`, `ServerEnvMetadata`, `CachedAccessory`, `CachedMatterAccessory`). Plugin authors import this for types only.
- `src/ui.mock.ts` — `MockHomebridgePluginUi` for plugin authors to use in their own Jest/Karma tests. Implements `IHomebridgePluginUi` against in-memory mock data. It dispatches its `ready` event via `queueMicrotask` so listeners attached right after construction still see it.
- `src/index.ts` — public entrypoint. Re-exports `HomebridgePluginUiServer`, `RequestError`, and the UI interface types. Does **not** export `ui.ts` (the UI runtime is injected, not imported).

### Keep the four UI files in sync

`ui.ts` (implementation), `ui.interface.ts` (declarations), `ui.mock.ts` (mock), and `README.md` (docs) all describe the same `window.homebridge` surface. When you add or change a method on `HomebridgePluginUi`, update all four — there is no compiler link between `ui.ts` and `ui.interface.ts` (they are separate tsc projects), so drift will not be caught by the build.

### Request / response correlation

Both sides use a small request/response protocol:

- UI → server: `ui.ts:_requestResponse` generates a random `requestId`, posts a `{ action: 'request', path, body, requestId }` message to the parent window, and resolves a promise when a `MessageEvent` with that `requestId` arrives.
- Server → UI: `server.ts:processRequest` looks up the registered handler for `request.path`, calls it, and sends `{ action: 'response', payload: { requestId, success, data } }` back via `process.send`. A `RequestError` thrown by the handler is unwrapped into `{ message, error: requestError }` and returned with `success: false`.
- Streaming the other way: `server.ts:pushEvent` emits `{ action: 'stream', payload: { event, data } }` over IPC; the UI dispatches it as a `MessageEvent` named after `event` on the `homebridge` EventTarget so consumers can `addEventListener`.

### postMessage hardening in `ui.ts` (don't loosen)

`_handleIncomingMessage` enforces two checks that exist for security, not correctness:

- Messages are only accepted from `window.parent` (`e.source !== window.parent` is dropped) — otherwise sibling iframes or popups could inject styles or spoof responses.
- The origin is **pinned to whatever the first message arrived from**, and anything from a different origin is rejected afterwards. It cannot wait for `ready` to capture the origin, because the parent's wrapper posts `body-class` / `link-element` / `inline-style` before `ready`. Outgoing messages (including toasts, which route through the parent instance for this reason) target the pinned origin.

Related timing detail: the `ready` handler awaits every `link-element` load before unhiding `document.body`, and each link resolves after 5 s even if `onload`/`onerror` never fires — a stuck stylesheet must not leave the plugin UI hidden forever.

### Dual TypeScript build (important)

There are two tsconfigs because the two sides have different inputs/outputs:

- `tsconfig.json` — builds everything in `src/` **except `ui.ts`** into `dist/`. This is what consumers `import` from the package.
- `tsconfig.ui.json` — extends the above but **only includes `ui.ts`**. Produces `dist/ui.js` for the Homebridge UI to inject into the iframe.

If you change either tsconfig, make sure `ui.ts` is in exactly one project. Also note the shared `compilerOptions` include both `DOM` in `lib` and `node` in `types`, so the compiler will **not** stop you from using `window` in `server.ts` or `node:process` in `ui.ts` — keeping each file inside its own runtime is on you.

## Lint rules worth knowing

`eslint.config.js` uses `@antfu/eslint-config` with these notable overrides:

- Single quotes only (`'quotes': ['error', 'single']`).
- Sorted exports and named exports (`perfectionist/sort-exports`, `perfectionist/sort-named-exports`).
- Sorted imports with grouped order (types → builtin → external → internal → relative → side-effect), newlines between groups. `import/order` and core `sort-imports` are off — the perfectionist rules replace them.
- `1tbs` brace style.
- Markdown files are formatted by ESLint (`formatters.markdown: true`), except `README.md` and `DEVELOPMENT.md`, which are in the ignore list — so this file and others **will** be lint-formatted.

## Commits and releases

- Commit messages follow Conventional Commits (`fix(ui): …`, `docs(readme): …`); release notes are assembled by Release Drafter.
- Publishing (`release.yml`): a GitHub release tagged `vX.Y.Z` publishes to npm as `latest`; a push to a `beta-X.Y.Z` or `alpha-X.Y.Z` branch publishes a prerelease under the matching npm dist-tag. The default branch is `latest`.

## Examples

`examples/basic-ui-server` and `examples/push-events` are standalone mini-plugins demonstrating the API. They live in this repo but are not part of the published package — they each have their own `package.json` and a `homebridge-ui/` directory (`server.js` + `public/index.html`) in the layout described in `README.md`.
