// Cấp đang học của từng kỹ năng. Không có dòng nghĩa là N5. Server-only.
import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal/auth'
import { FIRST_LEVEL, isLearnSkill, type LearnSkill } from '@/lib/learn/levels'

type Supabase = Awaited<ReturnType<typeof createClient>>

export async function readSkillLevels(supabase: Supabase, userId: string): Promise<Record<LearnSkill, number>> {
  const { data, error } = await supabase.from('learner_skill_levels').select('skill, jlpt_level').eq('user_id', userId)
  if (error) throw new Error(`Không đọc được learner_skill_levels: ${error.message}`)
  const levels: Record<LearnSkill, number> = { vocabulary: FIRST_LEVEL, word_kanji: FIRST_LEVEL, kanji: FIRST_LEVEL }
  for (const row of data ?? []) if (isLearnSkill(row.skill)) levels[row.skill] = row.jlpt_level
  return levels
}

/** Người học đồng ý mở cấp sau. Chỉ đi xuống cấp khó hơn, không lùi. */
export async function raiseSkillLevel(skill: unknown, level: unknown): Promise<{ status: 'saved' | 'invalid' }> {
  if (!isLearnSkill(skill) || !Number.isInteger(level) || (level as number) < 1 || (level as number) > 5) return { status: 'invalid' }
  const user = await requireUser()
  const supabase = await createClient()
  const levels = await readSkillLevels(supabase, user.id)
  if ((level as number) >= levels[skill]) return { status: 'invalid' }
  const { error } = await supabase
    .from('learner_skill_levels')
    .upsert({ user_id: user.id, skill, jlpt_level: level as number, updated_at: new Date().toISOString() }, { onConflict: 'user_id,skill' })
  if (error) throw new Error(`Không ghi được learner_skill_levels: ${error.message}`)
  return { status: 'saved' }
}
