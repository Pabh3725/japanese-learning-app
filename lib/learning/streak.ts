import { addStudyDays } from './time'
import type { StudyDate } from './types'

/** Số ngày học liên tiếp. Hôm nay chưa học thì chuỗi vẫn còn, tính tới hôm qua. */
export function currentStreak(days: ReadonlySet<StudyDate>, today: StudyDate): number {
  let cursor = days.has(today) ? today : addStudyDays(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor = addStudyDays(cursor, -1)
  }
  return streak
}

/** Bảy ngày học gần nhất, cũ nhất trước. */
export function lastSevenDays(today: StudyDate): StudyDate[] {
  return Array.from({ length: 7 }, (_, i) => addStudyDays(today, i - 6))
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayLabel(date: StudyDate): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]
}
