import { newStageState, type StageState } from '../stage'

/** Tạo thời điểm theo giờ Việt Nam: vn('2026-11-01 21:00'). */
export function vn(local: string): Date {
  return new Date(local.replace(' ', 'T') + ':00+07:00')
}

/** Tạo trạng thái của từ ở một stage với các trường cần thiết cho ví dụ. Mặc định Stage 2. */
export function word(partial: Partial<StageState> = {}): StageState {
  return { ...newStageState(partial.stage ?? 2), ...partial }
}
