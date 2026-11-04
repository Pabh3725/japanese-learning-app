import { defineConfig } from 'vitest/config'

// Tách khỏi `pnpm test`: bộ này cần stack Supabase local đang chạy.
export default defineConfig({
  test: {
    include: ['supabase/tests/rls/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})
