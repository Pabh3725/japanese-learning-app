// Test RLS bằng hai tài khoản thật: đăng nhập lấy JWT, truy vấn qua Data API như browser.
// Cần stack local: `pnpm exec supabase start`, rồi `pnpm test:rls`.
// Kịch bản: docs/security.md §6 và §11; nghiệm thu: docs/mvp-scope.md §8.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  OWNED_TABLES,
  createLearner,
  keyOf,
  makeClient,
  readLocalStack,
  seedLearner,
  type Learner,
  type OwnedTable,
  type Parents,
  type Row,
} from './helpers'

const PERMISSION_DENIED = '42501'

let admin: SupabaseClient
let anon: SupabaseClient
let alice: Learner
let bob: Learner
let vocabularyIds: string[]
let kanjiId: string

/** Bảng nội dung cùng bộ lọc tới dòng mẫu và giá trị thử ghi đè. */
function contentTables() {
  return [
    { table: 'vocabularies', match: { id: vocabularyIds[0] }, patch: { meaning_vi: 'đã sửa' } },
    { table: 'kanji', match: { id: kanjiId }, patch: { meaning_vi: 'đã sửa' } },
    {
      table: 'vocabulary_kanji',
      match: { vocabulary_id: vocabularyIds[0], position: 0 },
      patch: { position: 1 },
    },
  ]
}

async function snapshot(table: string, match: Row): Promise<Row[]> {
  const { data, error } = await admin.from(table).select('*').match(match)
  if (error) throw error
  return data
}

/** Bị chặn có hai dạng hợp lệ: thiếu quyền (42501), hoặc RLS lọc hết nên không đụng dòng nào. */
function expectBlocked(data: unknown[] | null, error: { code: string } | null) {
  if (error) expect(error.code).toBe(PERMISSION_DENIED)
  else expect(data).toEqual([])
}

beforeAll(async () => {
  const stack = readLocalStack()
  admin = makeClient(stack.url, stack.secretKey)
  anon = makeClient(stack.url, stack.publishableKey)

  const vocabularies = await admin
    .from('vocabularies')
    .insert(
      [0, 1, 2].map((i) => ({
        code: `rls-test-${i}`,
        sort_order: 900000 + i,
        expression: `rls-test-${i}`,
        reading_kana: 'てすと',
        meaning_vi: 'Từ thử RLS',
        is_kana_only: true,
        jlpt_level: 5,
      })),
    )
    .select('id, sort_order')
    .order('sort_order')
  if (vocabularies.error) throw vocabularies.error
  vocabularyIds = vocabularies.data.map((v) => v.id)

  const kanji = await admin
    .from('kanji')
    .insert({ character: '鬱', han_viet: 'UẤT', meaning_vi: 'Chữ thử RLS', jlpt_level: 1 })
    .select('id')
    .single()
  if (kanji.error) throw kanji.error
  kanjiId = kanji.data.id

  const link = await admin
    .from('vocabulary_kanji')
    .insert({ vocabulary_id: vocabularyIds[0], position: 0, kanji_id: kanjiId })
  if (link.error) throw link.error

  alice = await seedLearner(admin, await createLearner(admin, stack), vocabularyIds)
  bob = await seedLearner(admin, await createLearner(admin, stack), vocabularyIds)
})

afterAll(async () => {
  // Xóa tài khoản cascade toàn bộ dữ liệu học, sau đó mới xóa được nội dung (FK RESTRICT).
  for (const learner of [alice, bob]) {
    if (learner) await admin.auth.admin.deleteUser(learner.id)
  }
  if (vocabularyIds) await admin.from('vocabularies').delete().in('id', vocabularyIds)
  if (kanjiId) await admin.from('kanji').delete().eq('id', kanjiId)
})

describe('Chưa đăng nhập (anon) bị từ chối ở mọi bảng', () => {
  const ALL_TABLES = ['vocabularies', 'kanji', 'vocabulary_kanji', ...OWNED_TABLES.map((t) => t.table)]

  it('đủ 18 bảng', () => {
    expect(new Set(ALL_TABLES).size).toBe(18)
  })

  it.each(ALL_TABLES)('%s: không đọc được', async (table) => {
    const { error } = await anon.from(table).select('*')
    expect(error?.code).toBe(PERMISSION_DENIED)
  })

  it.each(ALL_TABLES)('%s: không ghi được', async (table) => {
    const { error } = await anon.from(table).insert({})
    expect(error?.code).toBe(PERMISSION_DENIED)
  })
})

describe.each(['vocabularies', 'kanji', 'vocabulary_kanji'])('Bảng nội dung %s chỉ đọc', (table) => {
  const target = () => contentTables().find((t) => t.table === table)!

  it('người đã đăng nhập đọc được', async () => {
    const { data, error } = await alice.client.from(table).select('*').match(target().match)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('không INSERT được', async () => {
    const row: Row =
      table === 'vocabularies'
        ? { code: 'rls-hack', sort_order: 999999, expression: 'hack', reading_kana: 'はっく', meaning_vi: 'x', is_kana_only: true, jlpt_level: 5 }
        : table === 'kanji'
          ? { character: '鬼', han_viet: 'QUỶ', meaning_vi: 'x', jlpt_level: 1 }
          : { vocabulary_id: vocabularyIds[1], position: 0, kanji_id: kanjiId }
    const { error } = await alice.client.from(table).insert(row)
    expect(error?.code).toBe(PERMISSION_DENIED)
  })

  it('không UPDATE được, dữ liệu không đổi', async () => {
    const { match, patch } = target()
    const before = await snapshot(table, match)
    const { data, error } = await alice.client.from(table).update(patch).match(match).select()
    expectBlocked(data, error)
    expect(await snapshot(table, match)).toEqual(before)
  })

  it('không DELETE được, dữ liệu không đổi', async () => {
    const { match } = target()
    const before = await snapshot(table, match)
    const { data, error } = await alice.client.from(table).delete().match(match).select()
    expectBlocked(data, error)
    expect(await snapshot(table, match)).toEqual(before)
  })
})

describe.each(OWNED_TABLES.map((spec) => [spec.table, spec] as [string, OwnedTable]))(
  'Bảng của người học %s',
  (table, spec) => {
    const aliceRow = () => keyOf(spec, alice.rows[table])

    it('chủ đọc được dòng của mình, không thấy dòng của người kia', async () => {
      const { data, error } = await alice.client.from(table).select('*')
      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThan(0)
      expect(data!.every((r) => r.user_id === alice.id)).toBe(true)
    })

    it('B lọc đúng khóa dòng của A vẫn nhận 0 dòng', async () => {
      const { data, error } = await bob.client.from(table).select('*').match(aliceRow())
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it('B không UPDATE được dòng của A', async () => {
      const before = await snapshot(table, aliceRow())
      const { data, error } = await bob.client.from(table).update(spec.patch).match(aliceRow()).select()
      expect(error).toBeNull()
      expect(data).toEqual([])
      expect(await snapshot(table, aliceRow())).toEqual(before)
    })

    it('B không DELETE được dòng của A', async () => {
      const before = await snapshot(table, aliceRow())
      const { data, error } = await bob.client.from(table).delete().match(aliceRow()).select()
      expect(error).toBeNull()
      expect(data).toEqual([])
      expect(await snapshot(table, aliceRow())).toEqual(before)
    })

    it('B không INSERT được dòng mang user_id của A', async () => {
      const row = { ...spec.row(alice.parents, 2, vocabularyIds), user_id: alice.id }
      const { error } = await bob.client.from(table).insert(row)
      expect(error?.code).toBe(PERMISSION_DENIED)
    })

    it('chủ cũng không DELETE được dòng của mình (SEC-D5)', async () => {
      const before = await snapshot(table, aliceRow())
      const { data, error } = await alice.client.from(table).delete().match(aliceRow()).select()
      expect(error).toBeNull()
      expect(data).toEqual([])
      expect(await snapshot(table, aliceRow())).toEqual(before)
    })

    it('chủ INSERT được dòng mới, user_id tự lấy từ JWT', async () => {
      // Mỗi người chỉ có một dòng settings: xóa dòng mẫu để thử tạo lại như lần đăng nhập đầu.
      if (table === 'learner_settings') await admin.from(table).delete().eq('user_id', alice.id)
      const { data, error } = await alice.client
        .from(table)
        .insert(spec.row(alice.parents, 1, vocabularyIds))
        .select()
        .single()
      expect(error).toBeNull()
      expect(data!.user_id).toBe(alice.id)
    })

    if (spec.appendOnly) {
      it('append-only: chủ không UPDATE được dòng của mình', async () => {
        const before = await snapshot(table, aliceRow())
        const { data, error } = await alice.client.from(table).update(spec.patch).match(aliceRow()).select()
        expect(error).toBeNull()
        expect(data).toEqual([])
        expect(await snapshot(table, aliceRow())).toEqual(before)
      })
    } else {
      it('chủ UPDATE được dòng của mình', async () => {
        const { data, error } = await alice.client.from(table).update(spec.patch).match(aliceRow()).select()
        expect(error).toBeNull()
        expect(data).toHaveLength(1)
      })

      it('chủ không chuyển được dòng của mình sang user_id của người kia', async () => {
        const before = await snapshot(table, aliceRow())
        const { error } = await alice.client.from(table).update({ user_id: bob.id }).match(aliceRow())
        expect(error?.code).toBe(PERMISSION_DENIED)
        expect(await snapshot(table, aliceRow())).toEqual(before)
      })
    }
  },
)

describe('A không gắn được dữ liệu của mình vào dòng cha của B', () => {
  const CROSS_REFERENCES: [string, keyof Parents][] = [
    ['learner_skill_progress', 'lv'],
    ['checkpoint_completions', 'lv'],
    ['lesson_queue_items', 'lv'],
    ['lesson_queue_items', 'session'],
    ['lesson_attempts', 'queue'],
    ['xp_events', 'session'],
    ['review_cards', 'lv'],
    ['review_logs', 'card'],
    ['practice_attempts', 'practice'],
    ['practice_attempts', 'card'],
    ['exercise_logs', 'lv'],
  ]

  it.each(CROSS_REFERENCES)('INSERT %s với %s của B', async (table, parent) => {
    const spec = OWNED_TABLES.find((t) => t.table === table)!
    const parents = { ...alice.parents, [parent]: bob.parents[parent] }
    const { error } = await alice.client.from(table).insert(spec.row(parents, 2, vocabularyIds))
    expect(error?.code).toBe(PERMISSION_DENIED)
  })

  it.each([
    ['learner_skill_progress', 'learner_vocabulary_id'],
    ['lesson_queue_items', 'learner_vocabulary_id'],
    ['review_cards', 'learner_vocabulary_id'],
  ])('UPDATE %s.%s sang dòng của B', async (table, column) => {
    const spec = OWNED_TABLES.find((t) => t.table === table)!
    const key = keyOf(spec, alice.rows[table])
    const before = await snapshot(table, key)
    const { error } = await alice.client.from(table).update({ [column]: bob.parents.lv }).match(key)
    expect(error?.code).toBe(PERMISSION_DENIED)
    expect(await snapshot(table, key)).toEqual(before)
  })
})
