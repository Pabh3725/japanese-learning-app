

export type Rng = () => number

/** So nghĩa: bỏ khoảng trắng hai đầu, viết thường (data-spec §5.1). */
export function sameMeaning(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

const KATAKANA = /^[ァ-ヺー]+$/
export function isKatakana(kana: string): boolean {
  return KATAKANA.test(kana)
}

/** Hàm ngẫu nhiên có hạt giống (mulberry32) — để test và để dựng lại cùng một đề nếu cần. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
