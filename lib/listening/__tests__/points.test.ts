// Grammar · Listening theo từng mẫu trên dữ liệu thật: mọi mẫu đủ 3 chặng × 10 câu, khó dần, dạng hỏi theo chặng.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { GrammarLessonFile } from '../../grammar/types'
import { buildPointStage, pointStages, POINT_LISTENING, stagePassed } from '../points'
import type { LessonSentence } from '../questions'

const seeded = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
const dir = join(process.cwd(), 'data', 'grammar')
const points: { code: string; lesson: number; sentences: LessonSentence[] }[] = []
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const file = JSON.parse(readFileSync(join(dir, f), 'utf8')) as GrammarLessonFile
  for (const p of file.points) {
    points.push({ code: p.code, lesson: file.lesson, sentences: p.sentences.filter((s) => !s.hidden).map((s) => ({ ...s, pattern: p.pattern, patternMeaning: p.meaning, pointCode: p.code })) })
  }
}
const poolOf = (lesson: number) => points.filter((p) => p.lesson <= lesson).flatMap((p) => p.sentences)
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

describe('Grammar · Listening theo mẫu', () => {
  it('mọi mẫu: 3 chặng × 10 câu, không trùng câu, độ khó tăng dần', () => {
    expect(points.length).toBeGreaterThan(200)
    for (const p of points) {
      const stages = pointStages(p.sentences)
      expect(stages.map((s) => s.length), p.code).toEqual([10, 10, 10])
      expect(new Set(stages.flat().map((s) => s.code)).size, p.code).toBe(30)
      const level = stages.map((s) => avg(s.map((x) => x.level ?? 1)))
      expect(level[0], p.code).toBeLessThanOrEqual(level[1])
      expect(level[1], p.code).toBeLessThanOrEqual(level[2])
      // Ổn định giữa các lần gọi
      expect(pointStages(p.sentences).map((s) => s.map((x) => x.code))).toEqual(stages.map((s) => s.map((x) => x.code)))
    }
  })

  it('chặng khó ưu tiên câu kết hợp mẫu đã học', () => {
    let combined = 0
    let total = 0
    for (const p of points) {
      for (const s of pointStages(p.sentences)[2]) {
        total++
        if ((s.uses ?? []).length > 0) combined++
      }
    }
    expect(combined / total).toBeGreaterThan(0.5)
  })

  it('dựng câu đủ 10 mỗi chặng; dạng hỏi theo chặng', () => {
    for (const [i, p] of points.entries()) {
      const stages = pointStages(p.sentences)
      const pool = poolOf(p.lesson)
      const s1 = buildPointStage(1, stages[0], pool, seeded(i))
      const s2 = buildPointStage(2, stages[1], pool, seeded(i))
      const s3 = buildPointStage(3, stages[2], pool, seeded(i))
      for (const [n, qs] of [s1, s2, s3].entries()) expect(qs.length, `${p.code} chặng ${n + 1}`).toBe(POINT_LISTENING.perStage)
      expect(s1.every((q) => q.type === 'heard_sentence' || q.type === 'sentence_meaning')).toBe(true)
      expect(s2.every((q) => q.type === 'heard_sentence' || q.type === 'sentence_meaning')).toBe(true)
      // Chặng 3: câu có câu hỏi thì hỏi–đáp
      for (const q of s3) {
        const s = stages[2].find((x) => x.code === q.ref)!
        if (s.prompt) expect(q.type, `${p.code} ${q.ref}`).toBe('reply')
      }
    }
    // Phần lớn chặng 1 là chọn câu đã nghe
    const s1 = points.flatMap((p, i) => buildPointStage(1, pointStages(p.sentences)[0], poolOf(p.lesson), seeded(i)))
    expect(s1.filter((q) => q.type === 'heard_sentence').length / s1.length).toBeGreaterThan(0.8)
  })

  it('đạt chặng: ≥ 8/10', () => {
    expect(stagePassed(8, 10)).toBe(true)
    expect(stagePassed(7, 10)).toBe(false)
    expect(stagePassed(0, 0)).toBe(false)
  })
})
