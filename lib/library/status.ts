// V10 — Trạng thái hiển thị trong Library: Not started → Learning → Reviewing → Learned (chủ dự án duyệt 2026-11-14).
// Pure: chỉ nhận dữ liệu đã đọc, không đọc database.

export type LibraryStatus = 'not_started' | 'learning' | 'reviewing' | 'learned'

export const STATUS_LABELS: Record<LibraryStatus, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  reviewing: 'Reviewing',
  learned: 'Learned',
}

/**
 * Trạng thái của một từ hoặc một chữ:
 * - Learning: đã bắt đầu, còn đang học (Stage 1–3 của từ, giai đoạn Học của chữ).
 * - Reviewing: đã có Card ôn, còn ít nhất một Card chưa lưu trữ.
 * - Learned: mọi Card đều đã lưu trữ ("Đã học xong").
 * `cards`: Card chính (không tính Card sao), số còn ôn và số đã lưu trữ.
 */
export function libraryStatus(item: { started: boolean; doneLearning: boolean; cards: { active: number; archived: number } }): LibraryStatus {
  if (!item.started) return 'not_started'
  if (!item.doneLearning) return 'learning'
  if (item.cards.active === 0 && item.cards.archived > 0) return 'learned'
  return 'reviewing'
}

/** "N5 · U1": cấp và bài (unit) của giáo trình. */
export function unitLabel(level: string | null, unit: number | null): string {
  if (!level) return unit === null ? '' : `U${unit}`
  return unit === null ? level : `${level} · U${unit}`
}
