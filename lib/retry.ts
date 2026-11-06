const RETRY_DELAYS_MS = [1000, 3000]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Gửi lại khi lỗi mạng hoặc khi `shouldRetry` nói cần thử lại. Chỉ dùng cho lệnh gửi lại an toàn, tức có mã chống trùng.
 * Hết lượt thì trả kết quả cuối, hoặc ném lỗi cuối.
 */
export async function withRetry<T>(
  send: () => Promise<T>,
  shouldRetry: (result: T) => boolean = () => false,
  delays: readonly number[] = RETRY_DELAYS_MS,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<T> {
  for (const delay of delays) {
    try {
      const result = await send()
      if (!shouldRetry(result)) return result
    } catch {
      // thử lại ở lượt sau
    }
    await wait(delay)
  }
  return send()
}
