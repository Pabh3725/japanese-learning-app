'use client'

// Màn thiết lập (Luyện thêm, Kiểm tra, Thể động từ): Enter bấm nút bắt đầu, dù con trỏ đang ở ô tick nào.
// Space vẫn để tick ô đang chọn. Đang focus đúng nút bắt đầu thì để trình duyệt tự bấm, tránh bấm hai lần.
import { useEffect, useEffectEvent } from 'react'

export function useEnterToStart(enabled: boolean, onStart: () => void, startRef: React.RefObject<HTMLElement | null>) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!enabled || e.key !== 'Enter' || e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
    const target = e.target
    if (target === startRef.current) return
    if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
    // Link khác (vd. nút quay lại) thì để trình duyệt đi theo link đó
    if (target instanceof HTMLAnchorElement) return
    e.preventDefault()
    onStart()
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
