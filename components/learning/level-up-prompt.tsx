'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { raiseSkillLevelAction } from '@/app/learn/actions'
import { actionButton } from '@/components/action-button'
import { levelLabel, type LearnSkill } from '@/lib/learn/levels'

/** Đã mở hết mục mới của cấp: hỏi có mở cấp sau không. Chưa muốn thì cứ để đó, phần cũ vẫn học tiếp. */
export function LevelUpPrompt({ skill, level, next, itemName }: { skill: LearnSkill; level: number; next: number; itemName: string }) {
  const router = useRouter()
  const [error, setError] = useState(false)
  const [saving, startSaving] = useTransition()

  const open = () => {
    setError(false)
    startSaving(async () => {
      try {
        const { status } = await raiseSkillLevelAction(skill, next)
        if (status !== 'saved') throw new Error(status)
        router.refresh()
      } catch {
        setError(true)
      }
    })
  }

  return (
    <section className="mb-6 rounded-3xl border border-primary/40 bg-primary/8 p-6">
      <h2 className="font-semibold">You&apos;ve opened all {levelLabel(level)} {itemName}</h2>
      <p className="mt-2 text-sm text-subtle">Open {levelLabel(next)} to get new {itemName}. Questions and cards you already have continue as usual.</p>
      <button type="button" onClick={open} disabled={saving} className={`${actionButton({ size: 'sm' })} mt-4`}>
        Open {levelLabel(next)}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-error">Couldn&apos;t save. Check your connection and try again.</p>}
    </section>
  )
}
