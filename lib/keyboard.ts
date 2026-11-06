// Phím tắt dùng chung cho các màn học. Pure, trừ phần đọc KeyboardEvent.

/** Phím chọn mảnh theo thứ tự. Một câu có tối đa 18 mảnh. */
const PIECE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i'] as const

/** Phím chọn ô cột phải trong vòng ghép ô. */
const MATCH_RIGHT_KEYS = ['a', 's', 'd', 'f', 'g', 'h'] as const

export const REPLAY_KEY = 'p'

export function pieceKeyLabel(index: number): string | null {
  return PIECE_KEYS[index]?.toUpperCase() ?? null
}

export function pieceIndexForKey(key: string): number {
  return (PIECE_KEYS as readonly string[]).indexOf(key.toLowerCase())
}

export function matchRightKeyLabel(index: number): string | null {
  return MATCH_RIGHT_KEYS[index]?.toUpperCase() ?? null
}

export function matchRightIndexForKey(key: string): number {
  return (MATCH_RIGHT_KEYS as readonly string[]).indexOf(key.toLowerCase())
}

/**
 * Bỏ qua phím khi đang gõ trong ô nhập, đang soạn bằng bộ gõ, giữ phím, hoặc nhấn kèm Ctrl/Cmd/Alt
 * (để Ctrl+R, Ctrl+C vẫn hoạt động bình thường).
 */
export function isShortcutEvent(e: KeyboardEvent): boolean {
  if (e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return false
  const target = e.target
  if (target instanceof HTMLElement) {
    if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return false
  }
  return true
}
