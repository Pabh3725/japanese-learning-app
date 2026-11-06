// SRS-04 — Ranh giới ngày học (giờ Việt Nam) khi dữ liệu lưu UTC.
// Mọi test truyền thời điểm CỐ ĐỊNH vào hàm → kết quả không phụ thuộc giờ / múi giờ của máy chạy test.
//
// Mốc cần nhớ: 00:00 giờ VN = 17:00 UTC hôm trước.
//   05/11 23:59 VN = 05/11 16:59Z  → ngày học 05/11
//   06/11 00:01 VN = 05/11 17:01Z  → ngày học 06/11 (dù ngày UTC vẫn là 05/11)
import { describe, expect, it } from 'vitest'
import { firstDueAt, applyPracticeToCard, newCardState } from '../cards'
import { allowedBorrow, planDailyCounts } from '../daily-plan'
import { applyStageAttempt } from '../stage'
import { addStudyDays, formatVnDateTime, isDueAt, nextStudyDayStart, studyDate } from '../time'
import { vn, word } from './helpers'

const utc = (iso: string) => new Date(iso)

describe('Case 1–2 · Thời điểm → ngày học', () => {
  it('1. 23:59:59 VN thuộc ngày cũ, 00:00:00 VN đã sang ngày mới', () => {
    expect(studyDate(new Date('2026-11-05T23:59:59+07:00'))).toBe('2026-11-05')
    expect(studyDate(new Date('2026-11-06T00:00:00+07:00'))).toBe('2026-11-06')
  })

  it('2. 00:01 VN = 17:01 UTC hôm trước: ngày UTC KHÁC ngày học', () => {
    const at = vn('2026-11-06 00:01')
    expect(at.toISOString()).toBe('2026-11-05T17:01:00.000Z') // cách database lưu
    expect(at.toISOString().slice(0, 10)).toBe('2026-11-05') // cắt ngày từ UTC → SAI
    expect(studyDate(at)).toBe('2026-11-06') // ngày học đúng
    // Cả buổi sáng tới 06:59 VN vẫn rơi vào khoảng "lệch" này
    expect(studyDate(vn('2026-11-06 06:59'))).toBe('2026-11-06')
    expect(studyDate(utc('2026-11-05T23:59:00Z'))).toBe('2026-11-06')
  })
})

describe('Case 3–4 · Hạn đầu tiên của card mới và qua tháng/năm', () => {
  it('3. tạo lúc 23:59 → hạn 00:00 sáng mai; tạo lúc 00:01 → hạn 00:00 NGÀY KIA (không phải 1 phút sau)', () => {
    expect(firstDueAt(vn('2026-11-05 23:59')).toISOString()).toBe('2026-11-05T17:00:00.000Z') // = 06/11 00:00 VN
    expect(firstDueAt(vn('2026-11-06 00:01')).toISOString()).toBe('2026-11-06T17:00:00.000Z') // = 07/11 00:00 VN
  })

  it('4. qua cuối tháng, cuối năm, năm nhuận', () => {
    expect(studyDate(nextStudyDayStart(vn('2026-11-30 12:00')))).toBe('2026-12-01')
    expect(studyDate(nextStudyDayStart(vn('2026-12-31 23:59')))).toBe('2027-01-01')
    expect(studyDate(nextStudyDayStart(vn('2028-02-28 08:00')))).toBe('2028-02-29')
    expect(addStudyDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(addStudyDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('Case 5–7 · Các trần "mỗi ngày" reset đúng 00:00 giờ VN', () => {
  it('5. trần ≤3 điểm +1/stage/ngày: 23:59 bị chặn, 00:01 được cộng lại', () => {
    // Đã +1 ba lần hôm 05/11, câu trước của từ là #40
    const s = word({ stage: 2, points: 3, plusToday: 3, plusDate: '2026-11-05', lastSeq: 40, lastSeqDate: '2026-11-05' })

    const late = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 50, now: vn('2026-11-05 23:59') })
    expect(late.delta).toBe(0)

    const early = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 1, now: vn('2026-11-06 00:01') })
    expect(early.delta).toBe(1)
    expect(early.state.plusDate).toBe('2026-11-06')
    expect(early.state.plusToday).toBe(1)
  })

  it('6. khoảng cách câu tính trong ngày: hôm qua câu #40, hôm nay câu #1 vẫn được tính', () => {
    const s = word({ stage: 2, lastSeq: 40, lastSeqDate: '2026-11-05' })
    const r = applyStageAttempt(s, { exercise: 'kana_to_meaning', outcome: 'correct', seq: 1, now: vn('2026-11-06 00:01') })
    expect(r.counted).toBe(true)
  })

  it('7. trần practice +3/card/ngày reset lúc 00:00 VN', () => {
    const card = { ...newCardState('vocab.meaning_kana', false), practicePlusToday: 3, practiceDate: '2026-11-05' }
    expect(applyPracticeToCard(card, 'correct', vn('2026-11-05 23:59')).delta).toBe(0)
    expect(applyPracticeToCard(card, 'correct', vn('2026-11-06 00:01')).delta).toBe(1)
  })
})

describe('Case 8–9 · Trần review/ngày và quota từ mới', () => {
  it('8. card hạn 00:00 06/11 không tính vào bài học 05/11, có tính vào bài học 06/11', () => {
    const dues = [
      firstDueAt(vn('2026-11-05 10:00')), // card tạo hôm 05/11 → hạn 06/11 00:00
      vn('2026-11-04 00:00'), // quá hạn từ trước
    ]
    const dueCount = (now: Date) => dues.filter((d) => isDueAt(d, now)).length

    expect(dueCount(vn('2026-11-05 23:59'))).toBe(1)
    expect(dueCount(vn('2026-11-06 00:00'))).toBe(2) // đúng giờ hạn là đã đến hạn

    // Trần review áp trên số chụp của TỪNG ngày học
    const settings = { newPerDay: 20, reviewCap: 1, unlockThreshold: 80 }
    expect(planDailyCounts({ dueSnapshot: dueCount(vn('2026-11-06 00:00')), borrowedForToday: 0, settings }))
      .toMatchObject({ reviewCount: 1, reviewDeferred: 1 })
  })

  it('9. "Học thêm" lúc 23:59 trừ quota 06/11; lúc 00:01 trừ quota 07/11', () => {
    const borrowFor = (now: Date) => addStudyDays(studyDate(now), 1)
    expect(borrowFor(vn('2026-11-05 23:59'))).toBe('2026-11-06')
    expect(borrowFor(vn('2026-11-06 00:01'))).toBe('2026-11-07')

    // Hôm 05/11 mượn 5 từ cho 06/11 → bài học 06/11 còn 15 từ mới; đã mượn trọn quota thì hết mượn
    const settings = { newPerDay: 20, reviewCap: 120, unlockThreshold: 80 }
    expect(planDailyCounts({ dueSnapshot: 10, borrowedForToday: 5, settings }).newWords).toBe(15)
    expect(allowedBorrow({ dueSnapshot: 10, alreadyBorrowedForTomorrow: 20, requested: 3, settings })).toBe(0)
  })
})

describe('Case 10 · Hiển thị giờ VN', () => {
  it('10. thời điểm UTC hiển thị theo giờ VN, không phụ thuộc múi giờ máy', () => {
    expect(formatVnDateTime(utc('2026-11-05T17:00:00Z'))).toBe('06/11/2026 00:00')
    expect(formatVnDateTime(utc('2026-11-05T16:59:00Z'))).toBe('05/11/2026 23:59')
    expect(formatVnDateTime(utc('2026-12-31T17:30:00Z'))).toBe('01/01/2027 00:30')
  })
})
