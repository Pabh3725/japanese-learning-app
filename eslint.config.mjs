import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Hai quy tắc này dành cho React Compiler (project không bật). Chỗ bị báo đều là Date.now() hay ref
      // trong hàm xử lý sự kiện, không chạy lúc render.
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      // Biến bắt đầu bằng _ là cố ý bỏ qua (vd. tách id ra khỏi object: ({ id: _id, ...rest }))
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
  globalIgnores([
    // Mặc định của eslint-config-next
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Thư mục cục bộ, không đưa lên git
    '_local/**',
  ]),
])

export default eslintConfig
