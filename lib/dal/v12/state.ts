// V12: đọc tiến độ của người học (mục, điểm từng loại thẻ, Card) và chuyển sang kiểu của lõi thuần lib/v12. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { readAllPages } from '@/lib/dal/pages'
import type { Area, CardType, ReviewCardType, Stage } from '@/lib/v12/card-types'
import type { ItemState, TypeState } from '@/lib/v12/stage'
import type { Schedule, ScheduleState } from '@/lib/srs/scheduler'

type Supabase = Awaited<ReturnType<typeof createClient>>

export interface ItemRow {
  id: string
  area: Area
  /** vocabulary_id / kanji_id / số bộ (dạng chuỗi). */
  ref: string
  stage: Stage | 'review'
  stageFrom: string
  introSeen: boolean
  known: boolean
  version: number
  state: ItemState
}

export interface CardRow {
  id: string
  itemId: string
  type: ReviewCardType
  version: number
  archived: boolean
  schedule: Schedule
}

const ITEM_COLUMNS = 'id, area, vocabulary_id, kanji_id, radical_number, stage, stage_from, intro_seen_at, has_similar, known_at, version'

type RawItem = { id: string; area: Area; vocabulary_id: string | null; kanji_id: string | null; radical_number: number | null; stage: string; stage_from: string; intro_seen_at: string | null; has_similar: boolean; known_at: string | null; version: number }
type RawType = { learner_item_id: string; stage: number; card_type: CardType; points: number; seen_date: string | null; seen_today: number; wrong_today: number }

function toItem(r: RawItem, types: readonly RawType[]): ItemRow {
  const stage = r.stage === 'review' ? 'review' : (Number(r.stage) as Stage)
  const current = types.filter((t) => t.learner_item_id === r.id && t.stage === stage)
  const state: ItemState = {
    area: r.area,
    stage,
    stageFrom: r.stage_from,
    hasSimilar: r.has_similar,
    types: Object.fromEntries(current.map((t) => [t.card_type, { points: t.points, seenDate: t.seen_date, seenToday: t.seen_today, wrongToday: t.wrong_today } satisfies TypeState])),
  }
  return {
    id: r.id,
    area: r.area,
    ref: r.vocabulary_id ?? r.kanji_id ?? String(r.radical_number),
    stage,
    stageFrom: r.stage_from,
    introSeen: r.intro_seen_at !== null,
    known: r.known_at !== null,
    version: r.version,
    state,
  }
}

/** Mọi mục và Card của người học (chia trang vì có thể hơn 1000 dòng). */
export async function readV12State(supabase: Supabase, userId: string): Promise<{ items: ItemRow[]; cards: CardRow[] }> {
  const [items, types, cards] = await Promise.all([
    readAllPages('learner_items', (from, to) => supabase.from('learner_items').select(ITEM_COLUMNS).eq('user_id', userId).order('id').range(from, to)),
    readAllPages('learner_item_types', (from, to) =>
      supabase.from('learner_item_types').select('learner_item_id, stage, card_type, points, seen_date, seen_today, wrong_today').eq('user_id', userId).order('learner_item_id').order('stage').order('card_type').range(from, to),
    ),
    readAllPages('item_cards', (from, to) =>
      supabase
        .from('item_cards')
        .select('id, learner_item_id, card_type, state, due_at, stability, difficulty, scheduled_days, learning_steps, reps, lapses, last_review_at, archived_at, version')
        .eq('user_id', userId)
        .order('id')
        .range(from, to),
    ),
  ])
  return {
    items: (items as RawItem[]).map((r) => toItem(r, types as RawType[])),
    cards: (cards as Record<string, unknown>[]).map((c) => toCard(c)),
  }
}

/** Một mục (để ghi câu trả lời). */
export async function readItem(supabase: Supabase, userId: string, itemId: string): Promise<ItemRow | null> {
  const [{ data, error }, { data: types, error: typesError }] = await Promise.all([
    supabase.from('learner_items').select(ITEM_COLUMNS).eq('id', itemId).eq('user_id', userId).maybeSingle(),
    supabase.from('learner_item_types').select('learner_item_id, stage, card_type, points, seen_date, seen_today, wrong_today').eq('learner_item_id', itemId).eq('user_id', userId),
  ])
  if (error) throw new Error(`Không đọc được learner_items: ${error.message}`)
  if (typesError) throw new Error(`Không đọc được learner_item_types: ${typesError.message}`)
  return data ? toItem(data as RawItem, (types ?? []) as RawType[]) : null
}

export function toCard(c: Record<string, unknown>): CardRow {
  return {
    id: c.id as string,
    itemId: c.learner_item_id as string,
    type: c.card_type as ReviewCardType,
    version: c.version as number,
    archived: c.archived_at !== null,
    schedule: {
      state: c.state as ScheduleState,
      due: new Date(c.due_at as string),
      stability: c.stability as number,
      difficulty: c.difficulty as number,
      scheduledDays: c.scheduled_days as number,
      learningSteps: c.learning_steps as number,
      reps: c.reps as number,
      lapses: c.lapses as number,
      lastReviewAt: c.last_review_at ? new Date(c.last_review_at as string) : null,
    },
  }
}
