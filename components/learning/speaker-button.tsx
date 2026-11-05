'use client'

import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
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

/** Nút loa. Thiết bị không có giọng Nhật thì không hiện gì. `kana` là chuỗi Kana, không đưa Kanji. */
export function SpeakerButton({ kana, large = false }: { kana: string; large?: boolean }) {
  const status = useJapaneseVoice()
  if (status !== 'available') return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speak(kana)
      }}
      aria-label="Play pronunciation"
      className={cn(
        'flex items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-colors hover:border-primary/60 hover:text-primary active:scale-95',
        large ? 'size-20' : 'size-11',
      )}
    >
      <Volume2 className={large ? 'size-9' : 'size-5'} aria-hidden="true" />
    </button>
  )
}
