import type { Metadata } from 'next'
import { LearningSession } from '@/components/learning/learning-session'

export const metadata: Metadata = { title: 'Learning session · Nihongo' }

export default async function LearnSessionPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams
  return <LearningSession mode={mode === 'kanji' ? 'kanji' : 'vocab'} />
}
