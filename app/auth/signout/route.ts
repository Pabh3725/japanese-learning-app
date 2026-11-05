// Đăng xuất. Chỉ nhận POST (form), để link hay prefetch không vô tình đăng xuất người dùng.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  // 303: trình duyệt chuyển sang GET /login sau khi POST
  return NextResponse.redirect(new URL('/login', request.nextUrl.origin), { status: 303 })
}
