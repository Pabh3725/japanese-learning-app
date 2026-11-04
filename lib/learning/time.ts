// "Ngày học" theo giờ Việt Nam. Hàm nhận `now` làm tham số, KHÔNG tự đọc đồng hồ,
// để test truyền được mọi thời điểm (vd. 23:59, 00:01).

import { RULES_V2 } from './rules'
import type { StudyDate } from './types'

const OFFSET_MS = RULES_V2.utcOffsetMinutes * 60_000

/** Ngày học (giờ VN) của một thời điểm, dạng 'YYYY-MM-DD'. */
export function studyDate(now: Date): StudyDate {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10)
}

/** Thời điểm 00:00 giờ VN của ngày học kế tiếp. */
export function nextStudyDayStart(now: Date): Date {
  const [y, m, d] = studyDate(now).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1) - OFFSET_MS)
}
