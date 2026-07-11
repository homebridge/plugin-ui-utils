# Change Log

All notable changes to `@homebridge/plugin-ui-utils` will be documented in this file. This project tries to adhere to [Semantic Versioning](http://semver.org/).

## v2.2.5 (Pending Release)

### Changes

- chore: update action versions in `release.yml`
- chore: dependency updates

## v2.2.4 (2026-05-26)

### Changes

- chore: dependency updates
- docs: add `CLAUDE.md` for claude code
- fix(ui): verify origin and source on incoming postMessage
- fix(ui): pin toast notifications to parent origin
- fix(mock): defer ready event so listeners can attach
- fix(ui): time out link-element loads so ready does not hang
- fix(server): remove redundant heartbeat interval
- fix(mock): align mock signatures with IHomebridgePluginUi
- fix(server): widen RequestResponse to include boolean, null and void
- chore(server): correct processRequest IPC payload type
- docs(readme): sync serverEnv documentation with ServerEnvMetadata
- docs(readme): document endForm, fixScrollHeight and i18nGetTranslation

## v2.2.3 (2026-03-29)

### Changes

- dependency updates

## v2.2.2 (2026-03-21)

### Changes

- updated dependencies, fix linting issues

## v2.2.1 (2026-03-04)

### Changes

- chore: expose HomebridgeUi types (#30) (@kovapatrik)
- updated dependencies

## v2.2.0 (2026-02-14)

### Changes

- updated dependencies
- added methods for future homebridge versions

## v2.1.3 (2026-02-08)

### Changes

- updated dependencies
- update release script for oidc releases
- add empty method for future homebridge version

## v2.1.2 (2025-11-22)

### Changes

- updated dependencies

## v2.1.1 (2025-11-15)

### Changes

- updated dependencies

## v2.1.0 (2025-06-02)

### Changes

- add method `userCurrentLightingMode` to get the current lighting mode
  - requires homebridge ui `^4.75.1-beta.2 || ^5.0.0-beta.76`

## v2.0.2 (2025-03-30)

### Homebridge UI Bootstrap Version

Please note that the Boostrap version in the UI was recently updated from `v4` to `v5`.
This may cause some style changes to your custom UIs.

For more information about the changes, please refer to the [Bootstrap v5 migration guide](https://getbootstrap.com/docs/5.0/migration/).

### Changes

- update `README` to document updated UI bootstrap version
- updated dependencies
- improve typings

## v2.0.1 (2025-01-21)

### Changes

- fix: package.json not export `ui.interface` (#23) (@baranwang)
- updated dependencies

## v2.0.0 (2024-11-22)

### Notable Changes

- ⚠️ update to esm package
- add methods for enabling and disabling save button
  - requires homebridge ui `^5.0.0-beta.4`

## v1.0.3 (2024-04-06)

### Other Changes

- update CHANGELOG to match hb repo formats
- update example folder package json files
- update LICENSE file to match hb repo formats
- spelling and grammar in code comments
- update README with hb logo and formatting
- update dependencies

## v1.0.2 (2024-03-30)

### Other Changes

- update dependencies

## v1.0.1 (2024-01-08)

### Other Changes

- Add discord webhook to notify developers of new updates
- update dependencies

## v1.0.0 (2023-10-23)

### Other Changes

- Initial release
