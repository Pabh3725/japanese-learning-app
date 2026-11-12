// Thể động từ (Grammar G5): kiểu dữ liệu động từ / tính từ. Danh sách ở data/n5/verbs.json (pnpm verbs:build).

/** v5: nhóm I; v5-iku: 行く (って/った); v5-aru: ある (ない); v1: nhóm II; kuru, suru: nhóm III; adj-i, adj-ii (いい), adj-na. */
export type VerbKind = 'v5' | 'v5-iku' | 'v5-aru' | 'v1' | 'kuru' | 'suru' | 'adj-i' | 'adj-ii' | 'adj-na'

export interface VerbWord {
  /** code của từ trong vocabularies */
  code: string
  /** Như trong lộ trình: thể ます với động từ, dạng gốc với tính từ. */
  expression: string
  reading: string
  meaning: string
  lesson: number
  level: number
  kind: VerbKind
  /** Dạng từ điển (gồm tiền tố của cụm từ): 気を付ける. */
  dict: string
  dictReading: string
  /** Tiền tố của cụm từ, giữ nguyên khi chia: 気を. */
  prefix?: string
  prefixReading?: string
}

export const isVerb = (k: VerbKind) => k !== 'adj-i' && k !== 'adj-ii' && k !== 'adj-na'
