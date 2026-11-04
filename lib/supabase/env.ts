// Biến môi trường public của Supabase. Chỉ hai biến này được có prefix NEXT_PUBLIC_
// (docs/security.md §5). Secret key KHÔNG bao giờ được đọc ở đây.

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      'Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Xem .env.example.',
    )
  }
  return { url, key }
}
