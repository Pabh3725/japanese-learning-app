import { newWordState, type WordState } from '../stage'

/** Tạo thời điểm theo giờ Việt Nam: vn('2026-11-01 21:00'). */
export function vn(local: string): Date {
  return new Date(local.replace(' ', 'T') + ':00+07:00')
}

/** Tạo trạng thái từ với các trường cần thiết cho ví dụ. */
export function word(partial: Partial<WordState> & { isKanaOnly?: boolean }): WordState {
  return { ...newWordState(partial.isKanaOnly ?? false), ...partial }
}
