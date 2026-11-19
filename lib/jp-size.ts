export function jpSizeClass(text: string, kind: 'kanji' | 'vocab' | 'kana') {
  const len = Array.from(text).length
  if (kind === 'kanji' || (kind === 'vocab' && len === 1)) return 'text-[112px] md:text-[140px]'
  if (kind === 'vocab') {
    if (len <= 2) return 'text-[80px] md:text-[96px]'
    if (len <= 3) return 'text-[64px] md:text-[84px]'
    return 'text-[52px] md:text-[64px]'
  }
  if (len <= 4) return 'text-[40px] md:text-[48px]'
  return 'text-[32px] md:text-[40px]'
}
