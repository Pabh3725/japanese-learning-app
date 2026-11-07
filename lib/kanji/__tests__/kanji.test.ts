import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RULES_V4 } from '../../learning/rules'
import { newLongTermSchedule, reviewLongTermSchedule } from '../schedule'
import { buildKanjiQuestion, gradeKanjiAnswer, plainHanViet, showReading, type KanjiRow } from '../questions'
import {
  applyLearningAnswer,
  chooseReviewExercise,
  kanjiLoadAdvice,
  KANJI_EXERCISES,
  newKanjiToday,
  nextSittingAt,
  planSitting,
  type KanjiLearningState,
} from '../rules'

const parseArray = (value: string) => (value === '{}' ? [] : value.slice(1, -1).split(',').map((part) => part.replace(/"/g, '')))
function readCsv(): KanjiRow[] {
  const lines = readFileSync(join(process.cwd(), 'data', 'n5', 'kanji.csv'), 'utf8').trim().split('\n').slice(1)
  return lines.map((line, i) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'))
    return { id: String(i), character: cells[0], han_viet: cells[1], meaning_vi: cells[2], onyomi: parseArray(cells[3]), kunyomi: parseArray(cells[4]) }
  })
}
const all = readCsv()
const fresh: KanjiLearningState = { points: 0, pointsToday: 0, pointsDate: null, counts: {}, correctStreak: 0 }
const vn = (d: number, minute = 0) => new Date(Date.UTC(2026, 10, d, 13, minute))
const seeded = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296

/** Mỗi tối một buổi, làm hết câu của buổi đó. `wrongAt`: thứ tự câu trả lời sai. */
function runLearning(wrongAt = -1, hasWord = false) {
  let state = fresh
  let due = vn(1)
  let sittings = 0
  const days: number[] = []
  const asked: string[] = []
  let total = 0
  for (let d = 1; d < 40; d++) {
    if (due.getTime() > vn(d, 30).getTime()) continue
    sittings++
    for (const exercise of planSitting(state.points, state.counts, RULES_V4.kanji.questionsPerSitting, hasWord, seeded(d))) {
      const outcome = total === wrongAt ? 'wrong' : 'correct'
      const result = applyLearningAnswer(state, exercise, outcome, vn(d, total))
      state = result.state
      days.push(d)
      asked.push(exercise)
      total++
      if (result.completed) return { days, state, asked, lastDay: d }
    }
    due = nextSittingAt(vn(d), sittings).due
  }
  throw new Error('Không hoàn tất')
}

describe('12 điểm trong 4 buổi', () => {
  it('đúng hết: ngày 1, 2, 3, 5, mỗi buổi 3 câu, hoàn tất với 12 điểm', () => {
    const { days, state } = runLearning()
    expect(days).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 5, 5, 5])
    expect(state.points).toBe(12)
  })

  it('đi từ dễ tới khó: buổi 1 chọn, buổi 2 chọn chữ và âm, buổi 3 gõ', () => {
    const { asked } = runLearning()
    expect(asked.slice(0, 3).every((e) => e === 'kanji_to_meaning' || e === 'kanji_to_hanviet')).toBe(true)
    expect(asked.slice(3, 6).every((e) => e === 'pick_kanji' || e === 'kanji_reading')).toBe(true)
    expect(new Set(asked.slice(6, 8))).toEqual(new Set(['hanviet_typing', 'reading_typing']))
  })

  it('đủ mặt: nghĩa, Hán Việt, âm mỗi mặt đúng ít nhất 2 lần, gõ Hán Việt và gõ âm ít nhất 1 lần', () => {
    for (const hasWord of [false, true]) {
      const { state: { counts } } = runLearning(-1, hasWord)
      expect((counts.kanji_to_meaning ?? 0) + (counts.word_meaning ?? 0)).toBeGreaterThanOrEqual(2)
      expect((counts.kanji_to_hanviet ?? 0) + (counts.hanviet_typing ?? 0)).toBeGreaterThanOrEqual(2)
      expect((counts.kanji_reading ?? 0) + (counts.reading_typing ?? 0)).toBeGreaterThanOrEqual(2)
      expect(counts.hanviet_typing).toBeGreaterThanOrEqual(1)
      expect(counts.reading_typing).toBeGreaterThanOrEqual(1)
    }
  })

  it('có từ đã gặp thì hỏi từ; không có thì không bắt buộc', () => {
    expect(runLearning(-1, true).asked).toContain('word_meaning')
    expect(runLearning(-1, false).asked).not.toContain('word_meaning')
  })

  it('sai một lần thì thêm buổi, hoàn tất muộn hơn', () => {
    const { lastDay } = runLearning(4)
    expect(lastDay).toBeGreaterThan(5)
    expect(lastDay).toBeLessThanOrEqual(9)
  })

  it('đủ 12 điểm mà thiếu mặt hoặc thiếu 3 câu đúng liên tiếp thì chưa hoàn tất', () => {
    const counts = { kanji_to_meaning: 2, kanji_to_hanviet: 1, hanviet_typing: 1, kanji_reading: 1, reading_typing: 1 }
    const base = { ...fresh, points: 11, pointsDate: '2026-11-02', correctStreak: 2 }
    expect(applyLearningAnswer({ ...base, counts: { ...counts, reading_typing: 0 } }, 'pick_kanji', 'correct', vn(3)).completed).toBe(false)
    expect(applyLearningAnswer({ ...base, counts, correctStreak: 0 }, 'pick_kanji', 'correct', vn(3)).completed).toBe(false)
    expect(applyLearningAnswer({ ...base, counts }, 'pick_kanji', 'correct', vn(3)).completed).toBe(true)
  })

  it('lịch buổi kế tiếp không vượt 2 ngày và rơi vào 00:00 giờ VN', () => {
    expect(nextSittingAt(vn(1), 1).days).toBe(1)
    expect(nextSittingAt(vn(1), 3).days).toBe(2)
    expect(nextSittingAt(vn(1), 4).days).toBe(1)
    expect(nextSittingAt(vn(1), 3).due.toISOString()).toBe('2026-11-02T17:00:00.000Z')
  })
})

describe('Ôn dài hạn', () => {
  it('bắt đầu 00:00 hôm sau, đúng hết thì giãn 2, 11, 46 ngày', () => {
    const finished = vn(5)
    let schedule = newLongTermSchedule(finished)
    expect(schedule.due.getTime() - finished.getTime()).toBeLessThan(864e5)
    expect(schedule.due.getTime()).toBeGreaterThan(finished.getTime())
    const gaps: number[] = []
    let now = schedule.due
    for (let i = 0; i < 4; i++) {
      schedule = reviewLongTermSchedule(schedule, 'correct', now, false)
      gaps.push(Math.round((schedule.due.getTime() - now.getTime()) / 864e5))
      now = schedule.due
    }
    expect(gaps).toEqual([0, 2, 11, 46])
  })

  it('sai thì lịch ngắn lại', () => {
    let schedule = newLongTermSchedule(vn(5))
    let now = schedule.due
    for (let i = 0; i < 3; i++) {
      schedule = reviewLongTermSchedule(schedule, 'correct', now, false)
      now = schedule.due
    }
    const before = schedule.scheduledDays
    schedule = reviewLongTermSchedule(schedule, 'wrong', now, false)
    expect(schedule.scheduledDays).toBeLessThan(before)
  })

  it('chỉ có gõ và viết rồi tự chấm, không lặp dạng lần trước, tối đa 90 ngày', () => {
    for (let s = 1; s < 40; s++) {
      const exercise = chooseReviewExercise('hanviet_typing', seeded(s))
      expect(['reading_typing', 'kanji_write']).toContain(exercise)
    }
    let schedule = newLongTermSchedule(vn(5))
    let now = schedule.due
    for (let i = 0; i < 8; i++) {
      schedule = reviewLongTermSchedule(schedule, 'correct', now, false)
      expect(schedule.scheduledDays).toBeLessThanOrEqual(90)
      now = schedule.due
    }
  })
})

describe('Điểm', () => {
  it('đúng +1, tối đa 3 điểm cộng mỗi ngày; sai −2, không xuống dưới 0', () => {
    let state = fresh
    for (let i = 0; i < 4; i++) state = applyLearningAnswer(state, 'kanji_to_meaning', 'correct', vn(1, i)).state
    expect(state.points).toBe(3)
    expect(applyLearningAnswer(state, 'kanji_to_meaning', 'wrong', vn(1, 9)).state.points).toBe(1)
    expect(applyLearningAnswer(fresh, 'kanji_to_meaning', 'wrong', vn(1)).state.points).toBe(0)
    expect(applyLearningAnswer(state, 'kanji_to_meaning', 'correct', vn(2)).state.points).toBe(4)
  })
})

describe('Chữ mới mỗi ngày', () => {
  const day = { newPerDay: 10, cap: 100, answeredToday: 0, openedToday: 0, dueQuestions: 0, notOpened: 100 }
  it('mở đủ khi còn chỗ', () => expect(newKanjiToday(day)).toBe(10))
  it('trừ số đã mở hôm nay', () => expect(newKanjiToday({ ...day, openedToday: 3 })).toBe(7))
  it('mỗi chữ mới cần chỗ cho cả buổi đầu; câu đến hạn và câu đã làm được ưu tiên', () => {
    expect(newKanjiToday({ ...day, answeredToday: 50, dueQuestions: 44 })).toBe(2)
    expect(newKanjiToday({ ...day, answeredToday: 60, dueQuestions: 40 })).toBe(0)
  })
  it('hết chữ thì thôi', () => expect(newKanjiToday({ ...day, notOpened: 1 })).toBe(1))
})

describe('Thông báo quá tải', () => {
  it('vượt trần dưới 10 câu thì chưa báo', () => {
    expect(kanjiLoadAdvice({ dueQuestions: 49, room: 40, cap: 100, newPerDay: 10 })).toBeNull()
  })
  it('vượt từ 10 câu thì gợi ý giảm chữ mới và tăng trần', () => {
    expect(kanjiLoadAdvice({ dueQuestions: 130, room: 100, cap: 100, newPerDay: 10 })).toEqual({ over: 30, suggestCap: 130, suggestNewPerDay: 5 })
  })
  it('số chữ mới đã vừa thì chỉ gợi ý tăng trần', () => {
    expect(kanjiLoadAdvice({ dueQuestions: 115, room: 100, cap: 100, newPerDay: 3 })).toEqual({ over: 15, suggestCap: 120, suggestNewPerDay: null })
  })
  it('gợi ý trần không vượt 500', () => {
    expect(kanjiLoadAdvice({ dueQuestions: 900, room: 100, cap: 490, newPerDay: 3 })?.suggestCap).toBe(500)
  })
})

describe('Trên toàn bộ chữ trong data', () => {
  it('mọi chữ có âm để hỏi', () => {
    expect(all.length).toBe(823)
    for (const k of all) expect(k.onyomi.length + k.kunyomi.length, k.character).toBeGreaterThan(0)
  })

  it('mọi dạng: đủ 4 đáp án, đáp án đúng chấm đúng, đáp án nhiễu không bao giờ được chấm đúng', () => {
    let seed = 1
    for (const kanji of all) {
      for (const exercise of KANJI_EXERCISES.filter((e) => e !== 'word_meaning' && e !== 'kanji_write')) {
        const q = buildKanjiQuestion(kanji, exercise, all, null, seeded(seed++))
        if (q.kind !== 'choice') continue
        expect(new Set(q.options).size, `${kanji.character} ${exercise}`).toBe(4)
        expect(q.options).toContain(q.answer)
        expect(gradeKanjiAnswer(kanji, exercise, q.answer).outcome, `${kanji.character} ${exercise}`).toBe('correct')
        for (const option of q.options.filter((o) => o !== q.answer)) {
          expect(gradeKanjiAnswer(kanji, exercise, option).outcome, `${kanji.character} ${exercise} ${option}`).toBe('wrong')
        }
      }
    }
  })

  it('đáp án nhiễu không trùng nghĩa, trùng âm Hán Việt với chữ đúng', () => {
    const kanji = all.find((k) => k.character === '学')!
    for (let s = 1; s < 30; s++) {
      const pick = buildKanjiQuestion(kanji, 'pick_kanji', all, null, seeded(s))
      if (pick.kind !== 'choice') continue
      for (const option of pick.options.filter((o) => o !== '学')) {
        const other = all.find((k) => k.character === option)!
        expect(plainHanViet(other.han_viet)).not.toBe(plainHanViet(kanji.han_viet))
      }
    }
  })

  it('chữ không có Kun chỉ hỏi On, chữ không có On chỉ hỏi Kun', () => {
    const onOnly = all.find((k) => k.kunyomi.length === 0)!
    const kunOnly = all.find((k) => k.onyomi.length === 0)!
    for (let s = 1; s < 20; s++) {
      expect(buildKanjiQuestion(onOnly, 'kanji_reading', all, null, seeded(s)).question).toContain('On')
      expect(buildKanjiQuestion(kunOnly, 'kanji_reading', all, null, seeded(s)).question).toContain('Kun')
    }
  })

  it('gõ Hán Việt: không cần dấu, không phân biệt hoa thường', () => {
    const kanji = all.find((k) => k.character === '学')!
    expect(gradeKanjiAnswer(kanji, 'hanviet_typing', 'hoc').outcome).toBe('correct')
    expect(gradeKanjiAnswer(kanji, 'hanviet_typing', 'HỌC').outcome).toBe('correct')
    expect(gradeKanjiAnswer(kanji, 'hanviet_typing', 'sinh').outcome).toBe('wrong')
    expect(gradeKanjiAnswer(kanji, 'kanji_write', 'remembered').outcome).toBe('correct')
    expect(gradeKanjiAnswer(kanji, 'kanji_write', 'forgot').outcome).toBe('wrong')
    expect(showReading('ひと.つ')).toBe('ひとつ')
  })

  it('gõ âm: đủ một âm của chữ là đúng, Katakana hay Hiragana đều được; mọi âm trong data gõ lại đều chấm đúng', () => {
    const kanji = all.find((k) => k.character === '学')!
    expect(gradeKanjiAnswer(kanji, 'reading_typing', 'ガク').outcome).toBe('correct')
    expect(gradeKanjiAnswer(kanji, 'reading_typing', 'がく').outcome).toBe('correct')
    expect(gradeKanjiAnswer(kanji, 'reading_typing', 'まなぶ').outcome).toBe('correct')
    expect(gradeKanjiAnswer(kanji, 'reading_typing', 'ひと').outcome).toBe('wrong')
    for (const k of all) for (const reading of [...k.onyomi, ...k.kunyomi]) {
      expect(gradeKanjiAnswer(k, 'reading_typing', showReading(reading)).outcome, k.character).toBe('correct')
    }
  })

  it('câu về từ: chỉ nghĩa thật của từ mới đúng, đáp án nhiễu không trùng', () => {
    const kanji = all.find((k) => k.character === '学')!
    const word = { id: 'w', expression: '学校', reading: 'がっこう', meaning: 'trường học', distractors: ['trường học', 'con chó', 'cái bàn', 'quyển sách', 'bệnh viện'] }
    const q = buildKanjiQuestion(kanji, 'word_meaning', all, word, seeded(3))
    if (q.kind !== 'choice') throw new Error('sai dạng')
    expect(q.prompt.display).toBe('学校')
    expect(q.options.filter((o) => o === 'trường học')).toHaveLength(1)
    expect(q.wordId).toBe('w')
    expect(gradeKanjiAnswer(kanji, 'word_meaning', 'trường học', 'trường học').outcome).toBe('correct')
    expect(gradeKanjiAnswer(kanji, 'word_meaning', 'con chó', 'trường học').outcome).toBe('wrong')
    expect(gradeKanjiAnswer(kanji, 'word_meaning', 'trường học', null).outcome).toBe('wrong')
  })
})
