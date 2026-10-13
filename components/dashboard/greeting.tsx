import Image from 'next/image'
import { Flame } from 'lucide-react'

export function Greeting({ name, streak }: { name: string; streak: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-jp text-sm text-primary">おかえりなさい</p>
        <h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight md:text-4xl">Welcome back, {name}</h1>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-yellow/25 bg-yellow/10 px-3 py-1 text-sm text-yellow">
          <Flame className="size-4" aria-hidden="true" />
          <span className="font-medium tabular-nums">{streak}</span> day streak
        </div>
      </div>
      <div className="relative size-24 shrink-0 overflow-hidden rounded-3xl bg-secondary md:size-28">
        <Image src="/images/mascot-cat.png" alt="" fill sizes="112px" className="object-cover" priority />
      </div>
    </div>
  )
}
