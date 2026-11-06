'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { isShortcutEvent, REPLAY_KEY } from '@/lib/keyboard'
import { hasJapaneseVoice, speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

export type VoiceStatus = 'checking' | 'available' | 'unavailable'

export function useJapaneseVoice(): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>('checking')
  useEffect(() => {
    let active = true
    hasJapaneseVoice().then((ok) => {
      if (active) setStatus(ok ? 'available' : 'unavailable')
    })
    return () => {
      active = false
    }
  }, [])
  return status
}

/** Tự đọc một lần khi hiện từ mới, sau khi biết chắc thiết bị có giọng Nhật. */
export function useAutoSpeak(kana: string) {
  const status = useJapaneseVoice()
  useEffect(() => {
    if (status === 'available') speak(kana)
  }, [status, kana])
}

/** Báo cho người học biết vì sao không có tiếng, thay vì chỉ ẩn nút. */
export function NoVoiceNote() {
  const status = useJapaneseVoice()
  if (status !== 'unavailable') return null
  return <p className="text-xs text-muted-foreground">This device has no Japanese voice, so audio is off.</p>
}

/** Nút loa. Thiết bị không có giọng Nhật thì không hiện gì. `kana` là chuỗi Kana, không đưa Kanji. */
export function SpeakerButton({ kana, large = false }: { kana: string; large?: boolean }) {
  const status = useJapaneseVoice()
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (status === 'available' && isShortcutEvent(e) && e.key.toLowerCase() === REPLAY_KEY) speak(kana)
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (status !== 'available') return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speak(kana)
      }}
      aria-label="Play pronunciation"
      title="Play again (P)"
      className={cn(
        'flex items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-primary/60 hover:text-primary active:scale-95',
        large ? 'size-20' : 'size-11',
      )}
    >
      <Volume2 className={large ? 'size-9' : 'size-5'} aria-hidden="true" />
    </button>
  )
}
