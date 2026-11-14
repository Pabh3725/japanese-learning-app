// Đọc đủ mọi trang của một truy vấn. Data API (PostgREST) trả tối đa 1000 dòng mỗi lần (max_rows),
// kể cả khi .range() xin nhiều hơn, nên bảng có thể vượt 1000 dòng phải đọc từng trang. Server-only.
import 'server-only'

export const PAGE_SIZE = 1000

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/**
 * `page(from, to)` dựng truy vấn cho một trang (gọi .range(from, to) ở cuối). Truy vấn phải sắp theo
 * cột không trùng (vd. id) để các trang không lặp hay sót dòng. `what` dùng cho thông báo lỗi.
 */
export async function readAllPages<T>(what: string, page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Không đọc được ${what}: ${error.message}`)
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGE_SIZE) return rows
  }
}

/** Số giá trị tối đa trong một bộ lọc .in(): id nằm trong URL, 1000 UUID dài khoảng 37KB, dễ bị máy chủ từ chối. */
export const IN_CHUNK = 100

/** Chạy truy vấn .in() theo từng nhóm IN_CHUNK giá trị rồi gộp kết quả. */
export async function readInChunks<T>(what: string, values: readonly string[], query: (chunk: string[]) => PageResult<T>): Promise<T[]> {
  const chunks: string[][] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) chunks.push(values.slice(i, i + IN_CHUNK))
  const results = await Promise.all(chunks.map((chunk) => query(chunk)))
  return results.flatMap(({ data, error }) => {
    if (error) throw new Error(`Không đọc được ${what}: ${error.message}`)
    return data ?? []
  })
}
