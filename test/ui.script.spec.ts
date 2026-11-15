import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// A path, not a URL: jsdom replaces the global URL class, and node:fs only
// accepts Node's own.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Compile src/ui.ts with the options of tsconfig.ui.json, as `npm run build` does.
 * @param source - the TypeScript source
 */
function compileLikeTheBuild(source: string) {
  return transpileLikeTheBuild(source).outputText
}

/**
 * Compile src/ui.ts as the build does, and return the output with its source map.
 * @param source - the TypeScript source
 */
function transpileLikeTheBuild(source: string) {
  const configPath = resolve(root, 'tsconfig.ui.json')
  const config = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(String(d.messageText))
    },
  })!
  return ts.transpileModule(source, { compilerOptions: config.options, fileName: 'ui.ts' })
}

const source = readFileSync(resolve(root, 'src/ui.ts'), 'utf8')

// The Homebridge UI loads dist/ui.js with a plain <script> tag. A file with an
// import or export statement is a module, and a plain script tag can not run one.
describe('dist/ui.js', () => {
  it('compiles to a plain script with no import or export statement', () => {
    const output = compileLikeTheBuild(source)

    expect(output).not.toMatch(/^\s*(?:import|export)\b/m)
  })

  it('runs as a plain script and sets window.homebridge', () => {
    ;(window as any)._homebridge = {
      plugin: { name: 'homebridge-test' },
      serverEnv: {},
    }

    // eslint-disable-next-line no-new-func
    new Function(compileLikeTheBuild(source))()

    expect((window as any).homebridge.plugin).toEqual({ name: 'homebridge-test' })
    expect(typeof (window as any).homebridge.getAccessoryLayout).toBe('function')
  })

  it('would fail if a top-level import were added', () => {
    const withImport = `import type { PluginConfig } from './ui.interface.js'\n${source}`

    expect(compileLikeTheBuild(withImport)).toMatch(/^\s*export\b/m)
  })

  // Every top-level name in a plain script is shared with the plugin's own
  // scripts on the same page. If both declare a name, the plugin's script
  // fails with "Identifier has already been declared" and does not run.
  it('adds no top-level names beyond the three classes v2.3.0 already had', () => {
    const file = ts.createSourceFile('ui.js', compileLikeTheBuild(source), ts.ScriptTarget.Latest)
    const names = file.statements.flatMap((statement) => {
      if (ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) {
        return [statement.name!.text]
      }
      if (ts.isVariableStatement(statement)) {
        return statement.declarationList.declarations.map(d => d.name.getText(file))
      }
      return []
    })

    expect(names).toEqual(['HomebridgePluginUi', 'HomebridgeUiToastHelper', 'HomebridgeUiFormHelper'])
  })

  it('lets a plugin script on the same page declare lastId and uniqueId', () => {
    // Scripts run in one vm context share their top-level names, as <script>
    // tags on one page do.
    const page: Record<string, unknown> = {
      EventTarget,
      Event,
      MessageEvent,
      _homebridge: { plugin: {}, serverEnv: {} },
      addEventListener: () => {},
    }
    page.window = page
    const context = vm.createContext(page)
    vm.runInContext(compileLikeTheBuild(source), context)

    expect(() => vm.runInContext('let lastId = 0; const uniqueId = () => lastId', context)).not.toThrow()
    expect(page.homebridge).toBeDefined()
  })

  it('carries its own source in the source map', () => {
    // The Homebridge UI copies only dist/ui.js and dist/ui.js.map, and the
    // package ships no src/, so a map without the source can show nothing.
    const map = JSON.parse(transpileLikeTheBuild(source).sourceMapText!)

    expect(map.sourcesContent).toEqual([source])
  })
})
