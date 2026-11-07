'use client'

// Một phiên khu Learn: cụm thẻ giới thiệu ở đầu, rồi câu hỏi đã trộn.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeIntroAction } from '@/app/learn/intro/actions'
import { openWordKanjiAction } from '@/app/learn/stage3/actions'
import { KnownWordBar } from '@/components/learning/known-word-button'
import { LearnPractice } from '@/components/learning/learn-practice'
import { SessionComplete } from '@/components/learning/session-complete'
import { SessionHeader } from '@/components/learning/session-header'
import { NoVoiceNote, SpeakerButton, useAutoSpeak } from '@/components/learning/speaker-button'
import { KanaIntroExercise } from '@/components/learning/steps/kana-intro-exercise'
import { WordKanjiIntroExercise } from '@/components/learning/steps/word-kanji-intro-exercise'
import type { LearnIntroItem, LearnSessionData } from '@/lib/dal/stage-session'
import { formatVnDateTime } from '@/lib/learning/time'

const SAVE_ERROR = "Couldn't save. Check your connection and try again."

/** Stage 1: hiện từ là đọc ngay; nút to để dễ bấm nghe lại. */
function IntroSpeaker({ kana }: { kana: string }) {
  useAutoSpeak(kana)
  return (
    <>
      <SpeakerButton kana={kana} large />
      <NoVoiceNote />
    </>
  )
}

function vocabularyIdOf(item: LearnIntroItem): string {
  return item.kind === 'new' ? item.word.id : item.vocabularyId
}

async function saveIntro(item: LearnIntroItem): Promise<boolean> {
  if (item.kind === 'new') return (await completeIntroAction(item.word.id)).status === 'saved'
  return (await openWordKanjiAction(item.learnerVocabularyId)).status === 'saved'
}

/** Thẻ giới thiệu đi liền nhau; xem xong thì câu đầu tiên của các từ này đến ngay sau đó. */
function IntroCluster({ items: initialItems, sessionNumber, sessionsLeft, skillQuery }: { items: LearnIntroItem[]; sessionNumber: number; sessionsLeft: number; skillQuery: string }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const item = items[index]
  const goToPractice = () => router.replace(`/learn/session?n=${sessionNumber}&practice=1${skillQuery}`)

  const complete = () => {
    if (saving) return
    setError(null)
    startSaving(async () => {
      try {
        if (!(await saveIntro(item))) {
          setError(SAVE_ERROR)
          return
        }
        if (index + 1 < items.length) setIndex(index + 1)
        else goToPractice()
      } catch {
        setError(SAVE_ERROR)
      }
    })
  }

  const key = vocabularyIdOf(item)
  const removeWord = (vocabularyId: string) => {
    const remaining = items.filter((other) => vocabularyIdOf(other) !== vocabularyId)
    setError(null)
    if (index >= remaining.length) goToPractice()
    setItems(remaining.length > 0 ? remaining : items)
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionHeader
        backHref="/learn"
        label={`Session ${sessionNumber} of ${sessionNumber - 1 + sessionsLeft}`}
        sublabel={`New ${index + 1} of ${items.length}`}
        current={index}
        total={items.length}
      />
      <KnownWordBar vocabularyId={key} onKnown={removeWord} />
      {item.kind === 'new' && (
        <KanaIntroExercise key={key} word={item.word} saving={saving} error={error} onComplete={complete} speaker={<IntroSpeaker kana={item.word.reading} />} />
      )}
      {item.kind === 'kanji' && <WordKanjiIntroExercise key={key} word={item} saving={saving} error={error} onComplete={complete} />}
    </div>
  )
}

export function LearnSession({ data, sessionNumber, wordKanji = false }: { data: LearnSessionData; sessionNumber: number; wordKanji?: boolean }) {
  const skillQuery = wordKanji ? '&skill=word_kanji' : ''
  if (data.intros.length > 0) {
    return <IntroCluster items={data.intros} sessionNumber={sessionNumber} sessionsLeft={data.sessionsLeft} skillQuery={skillQuery} />
  }
  if (data.questions.length > 0) {
    return <LearnPractice questions={data.questions} sessionNumber={sessionNumber} sessionsLeft={data.sessionsLeft} skillQuery={skillQuery} />
  }

  const subtitle = data.stageLimitReached
    ? "You've reached today's question limit. The rest will come up tomorrow."
    : data.block === 'cards'
      ? 'New words are paused because many cards are waiting. Review them first.'
      : data.nextDueAt
        ? `Your next question is due at ${formatVnDateTime(new Date(data.nextDueAt))}.`
        : 'Meet some new words to get started.'
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionComplete
        title="All caught up!"
        subtitle={subtitle}
        stats={[]}
        primary={data.block === 'cards' ? { href: '/review', label: 'Go to Review' } : { href: wordKanji ? '/learn/word-kanji' : '/learn', label: 'Back to Learn' }}
        secondary={{ href: '/', label: 'Back to Home' }}
      />
    </div>
  )
}
