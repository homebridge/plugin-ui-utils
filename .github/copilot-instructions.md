# Homebridge Plugin UI Utils

`@homebridge/plugin-ui-utils` is a small TypeScript helper library that Homebridge plugin authors install to build a custom config UI for their plugin. It is published to npm as an ESM package. It contains no application — just a server-side base class, a browser-side runtime script, type declarations, and a test mock.

Always reference these instructions first and fall back to search or bash commands only when you encounter unexpected information that does not match the info here.

## Pull Request Guidelines

- **Target Branch**: The default branch is `latest`. Target `latest` unless a `beta-X.Y.Z` branch exists for the current release cycle — check with `git branch -a | grep beta` and prefer the beta branch when there is one.
- **Commit / PR titles**: Follow Conventional Commits (e.g. `fix(ui): …`, `feat(server): …`, `docs(readme): …`). Release notes are assembled from these by Release Drafter.
- **Never push to** `beta-*.*.*` or `alpha-*.*.*` branches casually — any push to those branches triggers an automatic npm prerelease publish (see `.github/workflows/release.yml`).

## Working Effectively

- Install dependencies: `npm install`
- Build: `npm run build` — takes a few seconds. This cleans `dist/` and runs **two** TypeScript projects:
  - `tsconfig.json` — everything in `src/` except `ui.ts` → `dist/` (the importable package)
  - `tsconfig.ui.json` — only `ui.ts` → `dist/ui.js` (the script the Homebridge UI injects into the plugin's iframe)
  - Never run `tsc` directly with a single project; each project alone misses part of the output. After a build, `dist/ui.js` existing is the proof the second project ran.
- Lint: `npm run lint` (fix with `npm run lint:fix`) — ESLint with `@antfu/eslint-config`. `prepublishOnly` runs lint + build, and CI runs both, so run them before finalizing any change.
- Tests: **there is no test suite**. `npm test` is a stub that exits 0. Do not add test infrastructure unless explicitly asked. Validation is lint + build + (for behaviour changes) manual testing inside a real Homebridge UI, as described in `DEVELOPMENT.md`.

## Project Structure

The library spans two completely different runtime environments — keep each file inside its own runtime (the shared tsconfig has both DOM and Node types enabled, so the compiler will not catch a mix-up):

- `src/server.ts` — **Node.js**. `HomebridgePluginUiServer` base class + `RequestError`. Runs as a child process spawned by the Homebridge UI when the user opens the plugin's settings modal; talks to the parent over Node IPC (`process.send` / `process.on('message')`); SIGTERMs itself on IPC `disconnect`.
- `src/ui.ts` — **Browser**. `HomebridgePluginUi`, injected into the plugin's iframe by the Homebridge UI and assigned to `window.homebridge`; talks to the parent window via `window.postMessage`. Incoming messages are security-filtered: only `window.parent` is accepted as a source, and the origin is pinned from the first message — do not weaken these checks.
- `src/ui.interface.ts` — type declarations for everything on `window.homebridge`. Consumers import this for types only (`@homebridge/plugin-ui-utils/ui.interface`).
- `src/ui.mock.ts` — `MockHomebridgePluginUi` for plugin authors' own Jest/Karma tests; exposed as the `./ui.mock` subpath, intentionally not re-exported from the root.
- `src/index.ts` — public entrypoint; re-exports the server class, `RequestError`, and interface types. It does **not** export `ui.ts` (the UI runtime is injected, never imported).
- `examples/` — two standalone mini-plugins (`basic-ui-server`, `push-events`) that demonstrate the API. Not part of the published package.

## API Surface Consistency (important)

`ui.ts`, `ui.interface.ts`, `ui.mock.ts`, and `README.md` all describe the same `window.homebridge` API, but the build does not link them — `ui.ts` compiles in a separate project from its declarations. When adding or changing any method on `HomebridgePluginUi`, update **all four files** in the same change:

1. Implementation in `src/ui.ts`
2. Declaration in `src/ui.interface.ts`
3. Mock in `src/ui.mock.ts`
4. Documentation in `README.md`

The same applies on the server side: changes to `HomebridgePluginUiServer` need a matching `README.md` update.

## Validation

- Always run `npm run lint && npm run build` before finalizing changes; both must pass with no errors.
- Check `dist/` after the build: it should contain `index.js`, `server.js`, `ui.interface.js`, `ui.mock.js`, **and** `ui.js` (plus `.d.ts` files for everything except `ui.js`'s project output).
- ESLint also formats Markdown files (`formatters.markdown: true`), so lint any `.md` you touch — only `README.md` and `DEVELOPMENT.md` are excluded.

## Troubleshooting

- **`dist/ui.js` missing after build**: you ran `tsc` with only `tsconfig.json`. Use `npm run build`, which runs both projects.
- **Import sorting lint errors**: the config uses `perfectionist/sort-imports` with grouped order (types → builtin → external → internal → relative → side-effect) and newlines between groups; `npm run lint:fix` resolves these automatically.
- **ESM pitfalls**: the package is `"type": "module"` — local imports in `src/` use the `.js` extension (e.g. `from './server.js'`), and the examples are ESM too.
- **Message protocol changes**: the request/response protocol (`requestId` correlation, `action: 'request' | 'response' | 'stream' | 'ready'`) is shared with `homebridge-config-ui-x`, which sits between the two ends of this library. Changing a payload shape here breaks compatibility with the Homebridge UI — coordinate any protocol change with that repo.
