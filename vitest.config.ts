import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'jsdom',
    // Worker threads, not forked processes: test/server.spec.ts replaces
    // process.send, which a forked worker needs for its own messages.
    pool: 'threads',
  },
})
