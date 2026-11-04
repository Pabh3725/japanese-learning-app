// Supabase client cho trình duyệt (Client Component). Dùng publishable key, mọi truy vấn vẫn qua RLS.
import { createBrowserClient } from '@supabase/ssr'
import { supabaseEnv } from './env'

export function createClient() {
  const { url, key } = supabaseEnv()
  return createBrowserClient(url, key)
}
