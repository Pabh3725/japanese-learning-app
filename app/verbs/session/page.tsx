import type { Metadata } from 'next'
import { VerbSession, type VerbQuestion } from '@/components/preview/verb-session'
import { PREVIEW_VERBS, shuffled, VERB_FORMS, type VerbForm } from '@/lib/preview/grammar'

export const metadata: Metadata = { title: 'Verb forms · Nihongo' }

const QUESTIONS = 10

export default async function VerbSessionPage({ searchParams }: { searchParams: Promise<{ forms?: string; groups?: string; mode?: string }> }) {
  const { forms, groups, mode } = await searchParams
  const formIds = (forms?.split(',') ?? ['te']) as VerbForm[]
  const groupIds = groups?.split(',').map(Number) ?? [1, 2, 3]
  const verbs = PREVIEW_VERBS.filter((verb) => groupIds.includes(verb.group))
  const pool: VerbQuestion[] = verbs.flatMap((verb) =>
    VERB_FORMS.filter((form) => formIds.includes(form.id)).map((form) => {
      const answer = verb.forms[form.id]
      const wrong = shuffled(Object.values(verb.forms).filter((value) => value !== answer)).slice(0, 3)
      return { verb: verb.masu, meaning: verb.meaning, formLabel: form.label, answer, options: shuffled([answer, ...wrong]) }
    }),
  )
  return <VerbSession questions={shuffled(pool).slice(0, QUESTIONS)} typing={mode === 'typing'} />
}
