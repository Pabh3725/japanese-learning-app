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

/** Ngày học cách `date` n ngày (n âm = về trước). Dùng cho quota mượn, "hôm qua"… */
export function addStudyDays(date: StudyDate, n: number): StudyDate {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Card đã đến hạn ở thời điểm `now` chưa (đúng giờ hạn là đã đến hạn). */
export function isDueAt(due: Date, now: Date): boolean {
  return due.getTime() <= now.getTime()
}

/**
 * Hiển thị một thời điểm theo giờ Việt Nam, dạng 'DD/MM/YYYY HH:mm'.
 * Không dùng toLocaleString(): kết quả đó phụ thuộc múi giờ của máy đang chạy.
 */
export function formatVnDateTime(at: Date): string {
  const s = new Date(at.getTime() + OFFSET_MS).toISOString() // 'YYYY-MM-DDTHH:mm:…' theo giờ VN
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)} ${s.slice(11, 16)}`
}
