// Hạ tầng cho test RLS: đọc cấu hình stack local, tạo client và dữ liệu mẫu của từng người học.
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Row = Record<string, unknown>

/** Các dòng cha mà bảng con trỏ tới. */
export interface Parents {
  lv: string
  session: string
  queue: string
  card: string
  practice: string
}

export interface Learner {
  id: string
  client: SupabaseClient
  parents: Parents
  /** Dòng mẫu của người này, theo tên bảng. */
  rows: Record<string, Row>
}

export interface LocalStack {
  url: string
  publishableKey: string
  secretKey: string
}

/**
 * Lấy URL và key từ `supabase status`. Test tạo và xóa tài khoản bằng secret key
 * nên chặn mọi URL không phải máy local: không thể chạy nhầm lên DB thật.
 */
export function readLocalStack(): LocalStack {
  const output = execSync('pnpm exec supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const env = Object.fromEntries(
    [...output.matchAll(/^([A-Z_]+)="?([^"\r\n]*)"?\r?$/gm)].map((m) => [m[1], m[2]]),
  )
  const url = env.API_URL
  const publishableKey = env.PUBLISHABLE_KEY ?? env.ANON_KEY
  const secretKey = env.SECRET_KEY ?? env.SERVICE_ROLE_KEY
  if (!url || !publishableKey || !secretKey) {
    throw new Error('Không đọc được cấu hình. Chạy `pnpm exec supabase start` trước.')
  }
  const { hostname } = new URL(url)
  if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error(`Test RLS chỉ chạy trên stack local, nhận được: ${hostname}`)
  }
  return { url, publishableKey, secretKey }
}

export function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Tạo tài khoản qua admin API rồi đăng nhập thật để client mang JWT của người đó. */
export async function createLearner(admin: SupabaseClient, stack: LocalStack): Promise<Pick<Learner, 'id' | 'client'>> {
  const email = `rls-${randomUUID()}@example.com`
  const password = randomUUID()
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw created.error

  const client = makeClient(stack.url, stack.publishableKey)
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error

  return { id: created.data.user.id, client }
}

export interface OwnedTable {
  table: string
  key: string[]
  /** Không có policy UPDATE: nhật ký và checkpoint. */
  appendOnly: boolean
  patch: Row
  /** Dòng hợp lệ, chưa có user_id. `n` khác nhau cho giá trị khác nhau, tránh đụng UNIQUE. */
  row: (p: Parents, n: number, vocabularyIds: string[]) => Row
}

const SKILLS = ['meaning', 'kana', 'kanji', 'han_viet']
const CHECKPOINTS: [number, string][] = [
  [1, 'intro_viewed'],
  [2, 'kana_to_meaning'],
  [3, 'kanji_hanviet_intro_viewed'],
]
const CARD_TYPES = ['vocab.meaning_kana', 'vocab.kana_hanviet', 'vocab.meaning_kanji']

/** 15 bảng của người học, theo thứ tự cha trước con. */
export const OWNED_TABLES: OwnedTable[] = [
  {
    table: 'learner_settings',
    key: ['user_id'],
    appendOnly: false,
    patch: { show_romaji: false },
    row: () => ({}),
  },
  {
    table: 'learner_vocabulary',
    key: ['id'],
    appendOnly: false,
    patch: { current_stage: 2 },
    row: (_p, n, vocabularyIds) => ({ vocabulary_id: vocabularyIds[n] }),
  },
  {
    table: 'learner_skill_progress',
    key: ['learner_vocabulary_id', 'skill_code'],
    appendOnly: false,
    patch: { attempts_total: 1 },
    row: (p, n) => ({ learner_vocabulary_id: p.lv, skill_code: SKILLS[n] }),
  },
  {
    table: 'learner_stage_schedules',
    key: ['id'],
    appendOnly: false,
    patch: { stage_points: 1 },
    // Stage 2 do trigger tự tạo; ở đây dùng stage khác để không đụng UNIQUE.
    row: (p, n) => ({ learner_vocabulary_id: p.lv, stage_number: [4, 5][n] }),
  },
  {
    table: 'checkpoint_completions',
    key: ['id'],
    appendOnly: true,
    patch: { rules_version: 2 },
    row: (p, n) => ({ learner_vocabulary_id: p.lv, stage_number: CHECKPOINTS[n][0], checkpoint_code: CHECKPOINTS[n][1] }),
  },
  {
    table: 'lesson_sessions',
    key: ['id'],
    appendOnly: false,
    patch: { lesson_goal: 'đã sửa' },
    row: () => ({}),
  },
  {
    table: 'lesson_queue_items',
    key: ['id'],
    appendOnly: false,
    patch: { status: 'answered' },
    row: (p, n) => ({
      lesson_session_id: p.session,
      learner_vocabulary_id: p.lv,
      position: n,
      stage_number: 2,
      skill_code: 'meaning',
      exercise_type: 'choice',
    }),
  },
  {
    table: 'lesson_attempts',
    key: ['id'],
    appendOnly: true,
    patch: { answer_text: 'đã sửa' },
    row: (p) => ({ lesson_queue_item_id: p.queue, client_event_id: randomUUID(), is_correct: true }),
  },
  {
    table: 'xp_events',
    key: ['id'],
    appendOnly: true,
    patch: { points: 99 },
    row: (p) => ({ lesson_session_id: p.session, client_event_id: randomUUID(), points: 1 }),
  },
  {
    table: 'review_cards',
    key: ['id'],
    appendOnly: false,
    patch: { reps: 1 },
    row: (p, n) => ({ learner_vocabulary_id: p.lv, skill_code: SKILLS[n], card_type: CARD_TYPES[n] }),
  },
  {
    table: 'review_logs',
    key: ['id'],
    appendOnly: true,
    patch: { rating: 1 },
    row: (p) => ({
      review_card_id: p.card,
      client_event_id: randomUUID(),
      rating: 3,
      state_before: 0,
      due_after: new Date().toISOString(),
      stability_after: 1,
      difficulty_after: 5,
    }),
  },
  {
    table: 'practice_sessions',
    key: ['id'],
    appendOnly: false,
    patch: { score: 1 },
    row: () => ({ game_code: 'speed_matching' }),
  },
  {
    table: 'practice_attempts',
    key: ['id'],
    appendOnly: true,
    patch: { is_correct: false },
    row: (p, _n, vocabularyIds) => ({
      practice_session_id: p.practice,
      vocabulary_id: vocabularyIds[0],
      review_card_id: p.card,
      client_event_id: randomUUID(),
      skill_code: 'meaning',
      is_correct: true,
    }),
  },
  {
    table: 'exercise_logs',
    key: ['id'],
    appendOnly: true,
    patch: { response_time_ms: 1 },
    row: (p) => ({
      learner_vocabulary_id: p.lv,
      client_event_id: randomUUID(),
      stage_number: 2,
      exercise_type: 'kana_to_meaning',
      outcome: 'correct',
      study_date: '2026-11-04',
      day_seq: 1,
    }),
  },
  {
    table: 'learner_vocabulary_exclusions',
    key: ['user_id', 'vocabulary_id'],
    appendOnly: false,
    patch: { excluded_at: null },
    row: (_p, n, vocabularyIds) => ({ vocabulary_id: vocabularyIds[n] }),
  },
  {
    table: 'learner_daily_plans',
    key: ['user_id', 'study_date'],
    appendOnly: false,
    patch: { due_snapshot: 1 },
    row: (_p, n) => ({ study_date: `2026-11-0${n + 1}`, due_snapshot: 0 }),
  },
]

/** Bảng được điền dòng nào thì ghi id dòng đó vào Parents để bảng con dùng tiếp. */
const PARENT_FIELD: Record<string, keyof Parents> = {
  learner_vocabulary: 'lv',
  lesson_sessions: 'session',
  lesson_queue_items: 'queue',
  review_cards: 'card',
  practice_sessions: 'practice',
}

/** Điền một dòng cho mỗi bảng bằng secret key (bỏ qua RLS): đây là dữ liệu sẵn có để thử tấn công. */
export async function seedLearner(
  admin: SupabaseClient,
  learner: Pick<Learner, 'id' | 'client'>,
  vocabularyIds: string[],
): Promise<Learner> {
  const parents = {} as Parents
  const rows: Record<string, Row> = {}
  for (const spec of OWNED_TABLES) {
    // upsert: trigger của AUTH-01 đã tạo sẵn learner_settings khi có tài khoản mới.
    const { data, error } = await admin
      .from(spec.table)
      .upsert({ ...spec.row(parents, 0, vocabularyIds), user_id: learner.id })
      .select()
      .single()
    if (error) throw new Error(`Không tạo được dòng mẫu cho ${spec.table}: ${error.message}`)
    rows[spec.table] = data
    const field = PARENT_FIELD[spec.table]
    if (field) parents[field] = data.id
  }
  return { ...learner, parents, rows }
}

export function keyOf(spec: OwnedTable, row: Row): Record<string, string> {
  return Object.fromEntries(spec.key.map((k) => [k, String(row[k])]))
}
