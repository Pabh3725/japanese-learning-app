// Supabase client cho server (Server Component, Server Function, Route Handler).
// Đọc session từ cookie. Server Component không ghi được cookie, nên lỗi khi set bị bỏ qua:
// việc làm mới session nằm ở proxy.ts (docs/architecture.md ADR-003).
import 'server-only'
import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseEnv } from './env'
import { supabaseFetch } from './fetch'

// Bọc React cache: trong một render pass mọi DAL dùng chung một client, nhờ vậy các reader bọc cache()
// (nhận client làm tham số) khử trùng được giữa các component. Server Action / Route Handler không có render pass
// nên cache() không có tác dụng: mỗi lần gọi vẫn tạo client mới như trước.
export const createClient = cache(async () => {
  const { url, key } = supabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    // Giữ kết nối, dùng HTTP/2: xem lib/supabase/fetch.ts
    global: { fetch: supabaseFetch },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Gọi từ Server Component: không ghi được cookie. proxy.ts sẽ làm mới session.
        }
      },
    },
  })
})
