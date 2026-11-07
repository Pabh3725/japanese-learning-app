// R5 — Card: hạn đầu tiên. docs/learning-rules.md §7.

import { nextStudyDayStart } from './time'

/** Card mới được ôn lần đầu lúc 00:00 (giờ VN) ngày học hôm sau. */
export function firstDueAt(createdAt: Date): Date {
  return nextStudyDayStart(createdAt)
}
