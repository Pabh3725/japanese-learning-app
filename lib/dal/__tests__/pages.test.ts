// readAllPages: đọc đủ mọi trang khi bảng vượt giới hạn 1000 dòng mỗi lần của Data API.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { IN_CHUNK, PAGE_SIZE, readAllPages, readInChunks } from '../pages'

// vi.mock được đưa lên trước các import: pages.ts import 'server-only', gói này báo lỗi ngoài React Server
vi.mock('server-only', () => ({}))

/** Giả lập Data API: trả đúng phần [from, to] của bảng, nhưng không quá PAGE_SIZE dòng (như max_rows). */
function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }))
  const calls: [number, number][] = []
  const page = (from: number, to: number) => {
    calls.push([from, to])
    return Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + PAGE_SIZE)), error: null })
  }
  return { page, calls }
}

describe('readAllPages', () => {
  it('đọc hết bảng vượt 1000 dòng, không trùng không sót', async () => {
    const { page, calls } = fakeTable(1947)
    const rows = await readAllPages('vocabularies', page)
    expect(rows).toHaveLength(1947)
    expect(new Set(rows.map((r) => r.id)).size).toBe(1947)
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
    ])
  })

  it('bảng đúng bội số 1000: đọc thêm một trang rỗng rồi dừng', async () => {
    const { page, calls } = fakeTable(2000)
    expect(await readAllPages('t', page)).toHaveLength(2000)
    expect(calls).toHaveLength(3)
  })

  it('bảng rỗng hoặc data null', async () => {
    expect(await readAllPages('t', fakeTable(0).page)).toEqual([])
    expect(await readAllPages('t', () => Promise.resolve({ data: null, error: null }))).toEqual([])
  })

  it('lỗi thì báo kèm tên bảng', async () => {
    await expect(readAllPages('learner_vocabulary', () => Promise.resolve({ data: null, error: { message: 'boom' } }))).rejects.toThrow(
      'Không đọc được learner_vocabulary: boom',
    )
  })
})

describe('DAL không xin quá 1000 dòng trong một lần', () => {
  it('mọi .range(0, N) có N < 1000; bảng lớn hơn phải dùng readAllPages', () => {
    const dir = join(__dirname, '..')
    const bad: string[] = []
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(join(dir, file), 'utf8')
      for (const m of src.matchAll(/\.range\(0,\s*([^)]+)\)/g)) {
        const end = m[1].trim()
        const literal = /^\d+$/.test(end) ? Number(end) : null
        const ok = literal !== null ? literal < PAGE_SIZE : /^(PAGE|MAX_ROWS|PAGE_SIZE) - 1$/.test(end)
        if (!ok) bad.push(`${file}: .range(0, ${end})`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('readInChunks', () => {
  it('1000 id chia thành nhóm 100, gộp đủ kết quả', async () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `id-${i}`)
    const sizes: number[] = []
    const rows = await readInChunks('vocabularies', ids, (chunk) => {
      sizes.push(chunk.length)
      return Promise.resolve({ data: chunk.map((id) => ({ id })), error: null })
    })
    expect(sizes).toEqual(Array(10).fill(IN_CHUNK))
    expect(rows.map((r) => r.id)).toEqual(ids)
  })

  it('không có id thì không gọi truy vấn', async () => {
    let calls = 0
    expect(await readInChunks('t', [], () => (calls++, Promise.resolve({ data: [], error: null })))).toEqual([])
    expect(calls).toBe(0)
  })

  it('một nhóm lỗi thì báo lỗi', async () => {
    await expect(readInChunks('vocabularies', ['a'], () => Promise.resolve({ data: null, error: { message: 'URI too long' } }))).rejects.toThrow(
      'Không đọc được vocabularies: URI too long',
    )
  })
})
