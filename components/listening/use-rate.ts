'use client'

import { useSyncExternalStore } from 'react'
import { LISTENING_V1 } from '@/lib/listening/questions'

const RATE_KEY = 'listening-rate'

// Tốc độ đọc nhớ trên thiết bị; trình duyệt chặn localStorage thì nhớ trong phiên
const rateListeners = new Set<() => void>()
let memoryRate: number = LISTENING_V1.rate.normal
function readRate(): number {
  try {
    const saved = localStorage.getItem(RATE_KEY)
    if (saved !== null) return Number(saved) === LISTENING_V1.rate.slow ? LISTENING_V1.rate.slow : LISTENING_V1.rate.normal
  } catch {}
  return memoryRate
}

export function useRate(): [number, (r: number) => void] {
  const rate = useSyncExternalStore(
    (cb) => {
      rateListeners.add(cb)
      return () => rateListeners.delete(cb)
    },
    readRate,
    () => LISTENING_V1.rate.normal,
  )
  const set = (r: number) => {
    memoryRate = r
    try {
      localStorage.setItem(RATE_KEY, String(r))
    } catch {}
    rateListeners.forEach((l) => l())
  }
  return [rate, set]
}

