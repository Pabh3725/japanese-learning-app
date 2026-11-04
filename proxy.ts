// Next.js 16 Proxy (tên mới của Middleware).
// Việc 1: làm mới Supabase session cookie — nơi DUY NHẤT làm việc này.
// Việc 2: kiểm tra lạc quan (optimistic): chưa đăng nhập thì về /login.
// Đây KHÔNG phải lớp phân quyền chính: DAL (getCurrentUser) và RLS mới là lớp chặn thật.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseEnv } from './lib/supabase/env'

/** Đường dẫn không cần đăng nhập. */
const PUBLIC_PATHS = ['/login']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
      },
    },
  })

  // Không chèn code giữa createServerClient và getClaims: getClaims là bước làm mới session.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (!signedIn && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return withCookies(NextResponse.redirect(loginUrl), response)
  }

  if (signedIn && pathname === '/login') {
    return withCookies(NextResponse.redirect(new URL('/', request.url)), response)
  }

  return response
}

/** Khi redirect, giữ lại cookie session vừa được làm mới. */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  return target
}

export const config = {
  matcher: [
    // Bỏ qua file tĩnh, ảnh tối ưu, favicon và file ảnh trong public/
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
