// SRS-02 — Test bộ tính lịch. Số mong đợi lấy từ docs/fsrs-notes.md §6
// (chạy thật ts-fsrs 5.4.2 và 6.0.0, tắt fuzz — hai bản cho kết quả giống nhau).
import { describe, expect, it } from 'vitest'
import { createScheduler } from '../scheduler'

/** Thời điểm theo giờ Việt Nam: vn('2026-11-05 20:00'). */
const vn = (local: string) => new Date(local.replace(' ', 'T') + ':00+07:00')

const s = createScheduler({ enableFuzz: false })


/** Làm tròn 2 chữ số để so với bảng trong tài liệu. */
const r2 = (n: number) => Math.round(n * 100) / 100

describe('createScheduler', () => {
  it('tạo Card theo stage: Stage 2 có Card Kana, Stage 6 có Card Kanji, còn lại không', () => {
    const now = vn('2026-11-05 20:00')
    expect(s.createCardsForStage(2, now).map((c) => c.type)).toEqual(['vocab.kana'])
    expect(s.createCardsForStage(6, now).map((c) => c.type)).toEqual(['vocab.kanji'])
    expect(s.createCardsForStage(4, now)).toEqual([])
    expect(s.createCardsForStage(5, now)).toEqual([])
  })

  it('không ôn được Card đang tạm dừng', () => {
    const [card] = s.createCardsForStage(2, vn('2026-11-05 20:00'))
    expect(() => s.reviewCard({ ...card, status: 'suspended' }, { outcome: 'correct', exercise: 'kana_free_recall', responseMs: 1 }, card.schedule.due)).toThrow()
  })
})
