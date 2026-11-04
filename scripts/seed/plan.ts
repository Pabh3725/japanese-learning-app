// So data trong file với data đang có trong DB → kế hoạch ghi.
// Hàm thuần, không gọi DB. Đây là nội dung của báo cáo dry-run.

export interface RowChange<T> {
  key: string
  row: T
  /** Các cột khác với DB; rỗng nghĩa là dòng mới. */
  changedColumns: string[]
}

export interface TablePlan<T> {
  inserts: RowChange<T>[]
  updates: RowChange<T>[]
  unchanged: number
  /** Có trong DB nhưng không còn trong file. Seed KHÔNG xoá (data-spec §1.4). */
  missingInFile: string[]
}

function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  return (a ?? null) === (b ?? null)
}

/**
 * @param desired  dòng từ file
 * @param existing dòng đang có trong DB
 * @param keyOf    khoá ổn định (code, character...)
 * @param columns  các cột cần so sánh và ghi
 */
export function planTable<T extends Record<string, unknown>>(
  desired: T[],
  existing: Record<string, unknown>[],
  keyOf: (row: Record<string, unknown>) => string,
  columns: readonly (keyof T & string)[],
): TablePlan<T> {
  const existingByKey = new Map(existing.map((r) => [keyOf(r), r]))
  const desiredKeys = new Set<string>()
  const plan: TablePlan<T> = { inserts: [], updates: [], unchanged: 0, missingInFile: [] }

  for (const row of desired) {
    const key = keyOf(row)
    desiredKeys.add(key)
    const current = existingByKey.get(key)
    if (!current) {
      plan.inserts.push({ key, row, changedColumns: [] })
      continue
    }
    const changedColumns = columns.filter((c) => !same(row[c], current[c]))
    if (changedColumns.length === 0) plan.unchanged++
    else plan.updates.push({ key, row, changedColumns })
  }

  for (const key of existingByKey.keys()) {
    if (!desiredKeys.has(key)) plan.missingInFile.push(key)
  }
  return plan
}

export function isEmpty(plan: TablePlan<unknown>): boolean {
  return plan.inserts.length === 0 && plan.updates.length === 0
}

/**
 * sort_order là UNIQUE và Postgres kiểm tra từng dòng ngay lúc ghi. Đổi chỗ hai từ
 * (A lấy số cũ của B) sẽ bị từ chối nếu ghi thẳng. Cách làm: bước 1 chuyển mọi dòng
 * có sort_order thay đổi sang số tạm TEMP_SORT_OFFSET + số mới (không thể trùng),
 * bước 2 ghi số thật.
 */
export const TEMP_SORT_OFFSET = 1_000_000

export function rowsMovingSortOrder<T>(plan: TablePlan<T>): RowChange<T>[] {
  return plan.updates.filter((c) => c.changedColumns.includes('sort_order'))
}
