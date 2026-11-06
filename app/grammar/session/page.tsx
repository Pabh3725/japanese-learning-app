import type { Metadata } from 'next'
import { GrammarSession } from '@/components/preview/grammar-session'
import { GRAMMAR_POINTS, shuffled } from '@/lib/preview/grammar'

export const metadata: Metadata = { title: 'Grammar practice · Nihongo' }

export default async function GrammarSessionPage({ searchParams }: { searchParams: Promise<{ points?: string; types?: string; count?: string }> }) {
  const { points, types, count } = await searchParams
  const pointIds = points?.split(',')
  const typeIds = types?.split(',')
  const pool = GRAMMAR_POINTS.filter((p) => !pointIds || pointIds.includes(p.id))
    .flatMap((p) => p.questions)
    .filter((q) => !typeIds || typeIds.includes(q.type))
  const limit = Number(count) > 0 ? Number(count) : 10
  return <GrammarSession questions={shuffled(pool).slice(0, limit)} />
}
