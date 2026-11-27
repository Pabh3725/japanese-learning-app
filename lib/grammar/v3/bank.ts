// Grammar V3 — ngân hàng bài 5 câu (data/grammar/v3/bank-*.json, sinh ở nhánh content/grammar-v3-data bằng v3_bank.py).
// Có đáp án: chỉ dùng ở server. Câu gửi xuống trình duyệt đi qua publicQuestion (lib/dal/grammar-v3.ts).
import 'server-only'
import bank0105 from '@/data/grammar/v3/bank-01-05.json'
import bank0610 from '@/data/grammar/v3/bank-06-10.json'
import type { V3Type } from './rules'

export interface BankQuestion {
  k: 'choice' | 'tf' | 'err' | 'star' | 'type'
  sid: string
  ex: string
  vi?: string | null
  // choice
  opts?: string[]
  text?: string
  lines?: [string, string][]
  prompt?: string
  promptVi?: string
  audio?: string
  audioKana?: string
  many?: boolean
  /** Câu hỏi đi trước, làm ngữ cảnh cho câu trả lời ngắn. */
  ctx?: string
  // tf
  a?: boolean | number
  fix?: string | null
  // err
  segs?: [string, boolean][]
  // star
  pre?: string
  pieces?: string[]
  star?: number
  post?: string
  // type
  hint?: string
  acc?: string[]
}

export interface BankBai {
  type: V3Type
  name: string
  lv: string
  guide: string
  stage: string
  qs: BankQuestion[]
  extra: BankQuestion[]
  fallbackFor?: string
}

export interface BankPoint {
  code: string
  lesson: number
  pattern: string
  meaning: string
  explanation: string
  examples: { sid: string; jp: string; kana: string; vi: string }[]
  days: { '1': BankBai[]; '2': BankBai[] }
  review: Partial<Record<V3Type, BankQuestion[]>>
}

const BANK: ReadonlyMap<string, BankPoint> = new Map(
  [bank0105, bank0610].flatMap((file) => Object.values((file as unknown as { points: Record<string, BankPoint> }).points)).map((p) => [p.code, p]),
)

export function bankPoint(code: string): BankPoint | undefined {
  return BANK.get(code)
}

export const hasBank = (code: string) => BANK.has(code)

/** Câu của một chỗ trong ngân hàng, theo mã tham chiếu (xem refOf). */
export type BankRef =
  | { code: string; kind: 'intro'; day: 1 | 2; bai: number; pool: 'q' | 'x'; index: number }
  | { code: string; kind: 'review'; type: V3Type; index: number }

export function refOf(r: BankRef): string {
  return r.kind === 'intro' ? `${r.code}|${r.day}|${r.bai}|${r.pool}|${r.index}` : `${r.code}|r|${r.type}|${r.index}`
}

export function parseRef(s: unknown): BankRef | null {
  if (typeof s !== 'string' || s.length > 40) return null
  const p = s.split('|')
  if (!/^g\d{2}-\d{2}$/.test(p[0] ?? '')) return null
  if (p.length === 5 && (p[1] === '1' || p[1] === '2') && (p[3] === 'q' || p[3] === 'x')) {
    const bai = Number(p[2])
    const index = Number(p[4])
    if (Number.isInteger(bai) && Number.isInteger(index) && bai >= 0 && index >= 0) return { code: p[0], kind: 'intro', day: Number(p[1]) as 1 | 2, bai, pool: p[3], index }
  }
  if (p.length === 4 && p[1] === 'r' && /^G(1|2|3|5|6|7|9|10)$/.test(p[2])) {
    const index = Number(p[3])
    if (Number.isInteger(index) && index >= 0) return { code: p[0], kind: 'review', type: p[2] as V3Type, index }
  }
  return null
}

export function questionAt(r: BankRef): BankQuestion | undefined {
  const p = BANK.get(r.code)
  if (!p) return undefined
  if (r.kind === 'review') return p.review[r.type]?.[r.index]
  const b = p.days[String(r.day) as '1' | '2'][r.bai]
  return b?.[r.pool === 'q' ? 'qs' : 'extra'][r.index]
}

/** Dạng bài của một câu trong ngân hàng (bài thay bằng G1 tính là G1). */
export function typeAt(r: BankRef): V3Type | undefined {
  if (r.kind === 'review') return r.type
  return BANK.get(r.code)?.days[String(r.day) as '1' | '2'][r.bai]?.type
}

/** Mọi câu cùng dạng của một mẫu (bài Intro + câu ôn), để chọn câu ôn lâu chưa gặp nhất. */
export function refsOfType(code: string, type: V3Type): BankRef[] {
  const p = BANK.get(code)
  if (!p) return []
  const out: BankRef[] = (p.review[type] ?? []).map((_, index) => ({ code, kind: 'review', type, index }))
  for (const day of [1, 2] as const) {
    p.days[String(day) as '1' | '2'].forEach((b, bai) => {
      if (b.type !== type) return
      b.qs.forEach((_, index) => out.push({ code, kind: 'intro', day, bai, pool: 'q', index }))
      b.extra.forEach((_, index) => out.push({ code, kind: 'intro', day, bai, pool: 'x', index }))
    })
  }
  return out
}

/** Các dạng mẫu làm được ở phần ôn. */
export function reviewTypesAvailable(code: string): Set<V3Type> {
  const p = BANK.get(code)
  const out = new Set<V3Type>()
  if (!p) return out
  for (const [t, qs] of Object.entries(p.review)) if (qs && qs.length) out.add(t as V3Type)
  for (const day of ['1', '2'] as const) for (const b of p.days[day]) out.add(b.type)
  return out
}
