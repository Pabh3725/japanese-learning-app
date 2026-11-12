/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Dev: không giữ lại kết quả fetch (Supabase) qua các lần HMR refresh. Để mặc định thì trang đọc phải dữ liệu cũ
    // (vd. bài Learn đã đóng vẫn thấy là đang làm) rồi ghi sai theo nó.
    serverComponentsHmrCache: false,
  },
}

export default nextConfig
