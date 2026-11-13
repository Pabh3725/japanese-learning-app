// Grammar G4a — engine trên toàn bộ dữ liệu thật (data/grammar), không vùng xám: đáp án đúng chấm đúng, mọi đáp án sai chấm sai.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { availableExercises, chooseExercise, chooseQuestion, levelsFor, type ExerciseHistory } from '../pick'
import { acceptableOrders, buildQuestion, chunksOf, gradeQuestion, publicQuestion, seededRng, type SentenceRow } from '../questions'
import { applyLearningAnswer, canComplete, GRAMMAR_V1, lessonUnlock, nextSittingAt, reviewRating, tierOf, type LearningLog } from '../rules'
import { exercisesFor, GRAMMAR_EXERCISES, isPunctuation, sentenceText, type GrammarLessonFile } from '../types'

const dir = join(process.cwd(), 'data', 'grammar')
const points = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => (JSON.parse(readFileSync(join(dir, f), 'utf8')) as GrammarLessonFile).points)
  .map((p) => ({ ...p, rows: p.sentences.map((s) => ({ ...s, id: s.code }) as SentenceRow) }))

const SEP = '\u0001'
const vn = (d: number, h = 13) => new Date(Date.UTC(2026, 10, d, h))

describe('Mọi câu, mọi dạng: đáp án đúng chấm đúng, đáp án sai chấm sai', () => {
  it('trên toàn bộ dữ liệu, 3 seed mỗi câu mỗi dạng', () => {
    let checked = 0
    for (const p of points) {
      for (const s of p.rows) {
        for (const exercise of exercisesFor(s)) {
          for (const seed of [1, 2, 3]) {
            const q = buildQuestion(s, exercise, p.rows, seed)
            if (!q) continue
            checked++
            const where = `${s.code} ${exercise} seed ${seed}`
            // Bản gửi trình duyệt không lộ đáp án
            const pub = JSON.stringify(publicQuestion(q))
            if (q.sentence?.blank !== undefined) expect(publicQuestion(q).sentence!.pieces[q.sentence.blank].t, where).toBe('')
            expect(pub.includes(`"id":"${s.id}"`), where).toBe(false)
            if (q.answer === 'option') {
              const right = q.options!.filter((o) => gradeQuestion(s, q, o.id).correct)
              expect(right, where).toHaveLength(1)
              expect(new Set(q.options!.map((o) => o.id)).size, where).toBe(q.options!.length)
            } else if (q.answer === 'truefalse') {
              const r = gradeQuestion(s, q, 'true')
              expect(gradeQuestion(s, q, r.correct ? 'false' : 'true').correct, where).toBe(false)
            } else if (q.answer === 'tiles') {
              const original = s.pieces.filter((x) => !isPunctuation(x)).map((x) => x.t)
              expect(gradeQuestion(s, q, original).correct, where).toBe(true)
              // Dịch-ghép: dùng mảnh nhiễu là sai
              const extra = q.tiles!.map((x) => x.t).filter((t) => !original.includes(t))
              if (extra.length) expect(gradeQuestion(s, q, [...original.slice(0, -1), extra[0]]).correct, where).toBe(false)
              // Đảo vị ngữ lên đầu luôn sai
              expect(gradeQuestion(s, q, [original[original.length - 1], ...original.slice(0, -1)]).correct, where).toBe(false)
            } else {
              const blank = s.pieces[q.sentence!.blank!]
              expect(gradeQuestion(s, q, blank.t).correct, where).toBe(true)
              if (blank.r) expect(gradeQuestion(s, q, blank.r).correct, where).toBe(true)
              const slot = s.slots!.find((x) => x.piece === q.sentence!.blank)!
              for (const d of slot.distractors) expect(gradeQuestion(s, q, d).correct, where).toBe(false)
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(15000)
  }, 60_000) // duyệt mọi câu × mọi dạng × 3 seed; dữ liệu càng nhiều bài càng lâu

  it('★: mọi cách điền đúng đều cho cùng một mảnh ở ★', () => {
    for (const p of points) {
      for (const s of p.rows) {
        const q = buildQuestion(s, 'star', p.rows, 7)
        if (!q) continue
        const accepted = acceptableOrders(s.pieces)
        const ids = s.pieces.map((x, i) => ({ x, i })).filter(({ x }) => !isPunctuation(x)).map(({ i }) => i)
        const hidden = q.sentence!.hidden!
        // Thử đặt mỗi lựa chọn vào ★, các ô còn lại điền đúng: chỉ đáp án tạo được câu đúng
        for (const o of q.options!) {
          const others = hidden.filter((i) => i !== q.sentence!.star).map((i) => s.pieces[i].t)
          const pool = [...others, s.pieces[q.sentence!.star!].t].filter((t) => t !== o.id)
          const perms = (a: string[]): string[][] => (a.length <= 1 ? [a] : a.flatMap((x, k) => perms([...a.slice(0, k), ...a.slice(k + 1)]).map((r) => [x, ...r])))
          const possible = perms(pool).some((fill) => {
            let k = 0
            const seq = ids.map((i) => (i === q.sentence!.star ? o.id : hidden.includes(i) ? fill[k++] : s.pieces[i].t))
            return accepted.has(seq.join(SEP))
          })
          expect(possible, `${s.code} ★ ${o.id}`).toBe(gradeQuestion(s, q, o.id).correct)
        }
      }
    }
  })
})

describe('Sắp xếp theo cụm', () => {
  const piece = (...t: string[]) => t.map((x) => ({ t: x }))
  it('cụm "danh từ + trợ từ" đổi chỗ được, vị ngữ luôn cuối', () => {
    const ok = acceptableOrders(piece('私', 'は', '毎日', '勉強します', '。'))
    expect(ok.has(['私', 'は', '毎日', '勉強します'].join(SEP))).toBe(true)
    expect(chunksOf(piece('私', 'は', '毎日', '勉強します'))).toEqual([['私', 'は'], ['毎日', '勉強します']])
  })
  it('の và この dính vào danh từ sau, không tách', () => {
    const ok = acceptableOrders(piece('これ', 'は', '私', 'の', '本', 'です', '。'))
    expect(ok.has(['私', 'の', 'これ', 'は', '本', 'です'].join(SEP))).toBe(false)
    const two = acceptableOrders(piece('私', 'は', '友達', 'と', '電車', 'で', '行きます'))
    expect(two.has(['友達', 'と', '私', 'は', '電車', 'で', '行きます'].join(SEP))).toBe(true)
    expect(two.has(['私', 'は', '電車', '友達', 'と', 'で', '行きます'].join(SEP))).toBe(false)
  })
})

describe('Luật Học', () => {
  it('đúng +1, tối đa +8 mỗi ngày; sai −2, không dưới 0', () => {
    let st = { points: 0, pointsToday: 0, pointsDate: null as string | null }
    for (let i = 0; i < 10; i++) st = applyLearningAnswer(st, 'correct', vn(1)).state
    expect(st.points).toBe(8)
    expect(applyLearningAnswer({ points: 1, pointsToday: 0, pointsDate: null }, 'wrong', vn(2)).state.points).toBe(0)
    expect(applyLearningAnswer(st, 'correct', vn(2)).state.points).toBe(9)
  })

  it('bậc: 0–14 G1, 15–29 G2, 30+ G3', () => {
    expect([0, 14, 15, 29, 30, 40].map(tierOf)).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('buổi học rơi vào ngày 1, 2, 3, 5, 8', () => {
    let day = 1
    const days = [day]
    for (let n = 1; n <= 4; n++) {
      const { days: gap } = nextSittingAt(vn(day), n)
      day += gap
      days.push(day)
    }
    expect(days).toEqual([1, 2, 3, 5, 8])
  })

  it('giả lập trên dữ liệu thật: đúng hết thì mọi mẫu học xong đúng ở buổi 5 (ngày 8)', () => {
    for (const p of points) {
      const available = availableExercises(p.rows)
      const rng = seededRng(42)
      let state = { points: 0, pointsToday: 0, pointsDate: null as string | null }
      const logs: LearningLog[] = []
      const history: ExerciseHistory[] = []
      let doneAt: number | null = null
      const sittingDays = [1, 2, 3, 5, 8, 9, 10]
      for (const day of sittingDays) {
        for (let k = 0; k < GRAMMAR_V1.learning.questionsPerSitting && doneAt === null; k++) {
          const tier = tierOf(state.points)
          const exercise = chooseExercise(available, tier, history, history[0]?.exercise ?? null, rng)!
          const q = chooseQuestion(p.rows, exercise, levelsFor('learning', tier), new Set(p.rows.flatMap((s) => s.uses ?? [])), new Map(), vn(day).getTime(), rng)
          expect(q, `${p.code} ${exercise}`).not.toBeNull()
          state = applyLearningAnswer(state, 'correct', vn(day, 13 + k / 60)).state
          logs.unshift({ exercise, tier, outcome: 'correct' })
          history.unshift({ exercise, correct: true })
          if (canComplete(state.points, logs, available.length)) doneAt = day
        }
      }
      expect(doneAt, p.code).toBe(8)
    }
  })

  it('chưa đủ dạng, thiếu câu đúng ở một bậc, hoặc chưa 3 câu đúng liên tiếp thì chưa xong', () => {
    const many = (tier: 1 | 2 | 3, n: number, ex: LearningLog['exercise'] = 'meaning_choice'): LearningLog[] => Array.from({ length: n }, () => ({ exercise: ex, tier, outcome: 'correct' }))
    const types = GRAMMAR_EXERCISES.slice(0, 8).map((exercise): LearningLog => ({ exercise, tier: 3, outcome: 'correct' }))
    expect(canComplete(40, [...types, ...many(1, 3), ...many(2, 3)], 10)).toBe(true)
    expect(canComplete(40, [...types, ...many(1, 3)], 10)).toBe(false)
    expect(canComplete(40, [...many(3, 8), ...many(1, 3), ...many(2, 3)], 10)).toBe(false)
    expect(canComplete(40, [{ exercise: 'order', tier: 3, outcome: 'wrong' }, ...types, ...many(1, 3), ...many(2, 3)], 10)).toBe(false)
    expect(canComplete(39, [...types, ...many(1, 3), ...many(2, 3)], 10)).toBe(false)
  })
})

describe('Chọn dạng đều', () => {
  it('200 câu trả lời đúng: mọi dạng hợp lệ được hỏi gần như ngang nhau, không hai câu liền cùng dạng', () => {
    const p = points.find((x) => x.code === 'g04-03')!
    const available = availableExercises(p.rows)
    const rng = seededRng(3)
    const history: ExerciseHistory[] = []
    for (let i = 0; i < 200; i++) history.unshift({ exercise: chooseExercise(available, null, history, history[0]?.exercise ?? null, rng)!, correct: true })
    const counts = available.map((e) => history.filter((h) => h.exercise === e).length)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2)
    for (let i = 1; i < history.length; i++) expect(history[i].exercise).not.toBe(history[i - 1].exercise)
  })

  it('dạng hay sai được hỏi nhiều hơn', () => {
    const available = ['meaning_choice', 'particle_choice', 'true_false', 'listening'] as const
    const rng = seededRng(5)
    const history: ExerciseHistory[] = []
    for (let i = 0; i < 120; i++) {
      const e = chooseExercise(available, null, history, history[0]?.exercise ?? null, rng)!
      history.unshift({ exercise: e, correct: e !== 'particle_choice' })
    }
    const n = (e: string) => history.filter((h) => h.exercise === e).length
    expect(n('particle_choice')).toBeGreaterThan(n('listening'))
  })
})

describe('Ôn và mở bài', () => {
  it('gộp kết quả ôn: đúng hết Good, sai 1/3 Hard, sai ≥ một nửa Again', () => {
    expect(reviewRating(['correct', 'correct', 'correct'])).toBe('Good')
    expect(reviewRating(['correct', 'wrong', 'correct'])).toBe('Hard')
    expect(reviewRating(['wrong', 'correct'])).toBe('Again')
    expect(reviewRating(['wrong', 'wrong', 'correct'])).toBe('Again')
  })

  it('mở bài n: ≥ 50% từ xong Stage 3 và ≥ 50% mẫu bài trước học xong', () => {
    expect(lessonUnlock({ vocabTotal: 39, vocabDone: 20, previousTotal: 4, previousDone: 2 }).open).toBe(true)
    expect(lessonUnlock({ vocabTotal: 39, vocabDone: 19, previousTotal: 4, previousDone: 2 })).toEqual({ open: false, vocabMissing: 1, previousMissing: 0 })
    expect(lessonUnlock({ vocabTotal: 47, vocabDone: 24, previousTotal: 0, previousDone: 0 }).open).toBe(true)
  })

  it('mỗi câu gốc hiện lại được thành chữ', () => {
    for (const p of points) for (const s of p.rows) expect(sentenceText(s.pieces).length).toBeGreaterThan(0)
  })
})
