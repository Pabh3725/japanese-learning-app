// Supabase client cho server (Server Component, Server Function, Route Handler).
// Đọc session từ cookie. Server Component không ghi được cookie, nên lỗi khi set bị bỏ qua:
// việc làm mới session nằm ở proxy.ts (docs/architecture.md ADR-003).
import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseEnv } from './env'

export async function createClient() {
  const { url, key } = supabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
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
}
