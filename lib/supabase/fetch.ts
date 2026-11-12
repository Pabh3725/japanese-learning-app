// fetch dùng cho Supabase ở server: giữ kết nối và dùng HTTP/2.
// fetch mặc định của Node chỉ giữ kết nối rảnh khoảng 4s và mở thêm kết nối cho mỗi truy vấn song song.
// Mỗi kết nối mới phải bắt tay TLS lại, mà đường mạng tới Supabase (qua Cloudflare) có lúc treo khoảng 3.7s ở bước này,
// nên một action nhiều truy vấn mất 4–18s. HTTP/2 cho mọi truy vấn đi chung một kết nối được giữ lâu, đo được 0.3–0.7s.
import 'server-only'
import { Agent, fetch as undiciFetch } from 'undici'

const AGENT_KEY = Symbol.for('projap.supabaseAgent')

/** Một Agent cho cả tiến trình. Lưu trên globalThis để HMR lúc dev không tạo thêm Agent (và thêm kết nối) mới. */
function sharedAgent(): Agent {
  const store = globalThis as typeof globalThis & { [AGENT_KEY]?: Agent }
  store[AGENT_KEY] ??= new Agent({
    allowH2: true,
    keepAliveTimeout: 60_000,
    keepAliveMaxTimeout: 10 * 60_000,
  })
  return store[AGENT_KEY]
}

export const supabaseFetch: typeof fetch = (input, init) =>
  undiciFetch(input as Parameters<typeof undiciFetch>[0], { ...(init as Parameters<typeof undiciFetch>[1]), dispatcher: sharedAgent() }) as unknown as Promise<Response>
