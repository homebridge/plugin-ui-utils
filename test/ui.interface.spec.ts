import type { CachedAccessory } from '../src/ui.interface.js'

import { describe, expectTypeOf, it } from 'vitest'

// Type-level checks: `npm test` runs `tsc` over this file first, so a wrong
// type fails there. The shapes are what the Homebridge UI really sends.
describe('ui.interface types', () => {
  it('types a cached accessory category as the number Homebridge stores', () => {
    expectTypeOf<CachedAccessory['category']>().toEqualTypeOf<number>()
  })
})
