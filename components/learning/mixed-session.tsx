'use client'

import { useState } from 'react'
import { KanjiPractice } from '@/components/kanji/kanji-session'
import { LearnPractice } from '@/components/learning/learn-practice'
import { SessionComplete } from '@/components/learning/session-complete'
import type { KanjiSessionQuestion } from '@/lib/dal/kanji'
import type { StageQuestion } from '@/lib/dal/stage-session'

export type MixedSegment = { kind: 'stage'; questions: StageQuestion[] } | { kind: 'kanji'; questions: KanjiSessionQuestion[] }

/** Học hỗn hợp: luân phiên các cụm câu của Từ vựng, Từ Kanji và Kanji, mỗi cụm giữ cách lưu của khu đó. */
export function MixedSession({ segments }: { segments: MixedSegment[] }) {
  const [index, setIndex] = useState(0)
  const next = () => setIndex((i) => i + 1)
  const segment = segments[index]

  if (!segment) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SessionComplete
          title={segments.length > 0 ? 'Mixed session done!' : 'Nothing due right now'}
          subtitle={segments.length > 0 ? 'Your progress is saved.' : 'New words and Kanji start from their own sections.'}
          stats={[]}
          primary={{ href: '/learn', label: 'Back to Learn' }}
          secondary={{ href: '/', label: 'Back to Home' }}
        />
      </div>
    )
  }
  if (segment.kind === 'kanji') return <KanjiPractice key={index} questions={segment.questions} onDone={next} />
  return <LearnPractice key={index} questions={segment.questions} sessionNumber={1} sessionsLeft={1} onDone={next} />
}
