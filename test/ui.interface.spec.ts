import type { CachedAccessory, PluginMetadata, ServerEnvMetadata } from '../src/ui.interface.js'

import { describe, expectTypeOf, it } from 'vitest'

// Type-level checks: `npm test` runs `tsc` over this file first, so a wrong
// type fails there. The shapes are what the Homebridge UI really sends.
describe('ui.interface types', () => {
  it('types a cached accessory category as the number Homebridge stores', () => {
    expectTypeOf<CachedAccessory['category']>().toEqualTypeOf<number>()
  })

  it('types the plugin links as one object and funding as package.json allows it', () => {
    expectTypeOf<{ npm: string, homepage: string, bugs: null }>().toExtend<PluginMetadata['links']>()
    expectTypeOf<'https://example.com/fund'>().toExtend<NonNullable<PluginMetadata['funding']>>()
    expectTypeOf<{ type: 'github', url: string }>().toExtend<NonNullable<PluginMetadata['funding']>>()
    expectTypeOf<Array<string | { type: string, url: string }>>().toExtend<NonNullable<PluginMetadata['funding']>>()
  })

  it('types formAuth as a boolean and allows the env fields the Homebridge UI no longer sends to be missing', () => {
    expectTypeOf<ServerEnvMetadata['formAuth']>().toEqualTypeOf<boolean>()
    expectTypeOf<Omit<ServerEnvMetadata['env'], 'ableToConfigureSelf' | 'serviceMode'>>().toExtend<ServerEnvMetadata['env']>()
  })
})
