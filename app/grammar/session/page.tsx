import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { GrammarSessionPlayer } from '@/components/grammar/grammar-session'
import { V3SessionPlayer } from '@/components/grammar/v3/v3-session'
import { buildPracticeSession } from '@/lib/dal/grammar'
import { buildV3Session } from '@/lib/dal/grammar-v3'

export const metadata: Metadata = { title: 'Grammar · Nihongo' }

export default async function GrammarSessionPage({ searchParams }: { searchParams: Promise<{ mode?: string; points?: string; count?: string; ex?: string }> }) {
  const { mode, points, count, ex } = await searchParams
  if (mode === 'practice') {
    const session = await buildPracticeSession({ points: points?.split(',') ?? [], count: Number(count), exercises: ex?.split(',') ?? [] })
    if ('status' in session) redirect('/grammar/practice')
    return <GrammarSessionPlayer session={session} />
  }
  // Grammar V3: Học (thẻ giới thiệu + bài Intro hôm nay) và Ôn theo bài 5 câu
  return <V3SessionPlayer session={await buildV3Session(mode === 'review' ? 'review' : 'learn')} />
}
