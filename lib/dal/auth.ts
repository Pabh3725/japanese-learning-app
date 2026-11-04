// Data Access Layer — xác thực ở server. Mọi page, Server Function, Route Handler cần dữ liệu
// của người học phải đi qua đây (docs/security.md §4, quy tắc getClaims).
import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { emailToUsername } from '@/lib/auth/username'

export interface CurrentUser {
  id: string
  username: string | null
}

/** Người đang đăng nhập, hoặc null. Dùng getClaims() (có xác minh), không dùng getSession(). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  const email = typeof claims.email === 'string' ? claims.email : null
  return { id: claims.sub, username: emailToUsername(email) }
})

/** Bắt buộc đăng nhập: chưa đăng nhập thì chuyển về /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
