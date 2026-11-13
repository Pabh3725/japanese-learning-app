import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    // Vài test duyệt toàn bộ dữ liệu (ngữ pháp, kanji, thể động từ) chạy song song nên có thể quá 5 giây mặc định
    testTimeout: 30_000,
  },
})
