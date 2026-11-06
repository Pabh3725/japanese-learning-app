import { Flame } from 'lucide-react'
import { getStudyStreak } from '@/lib/dal/progress'

function streakNote(streak: number, studiedToday: boolean) {
  if (studiedToday) return "You've studied today. Nice work!"
  return streak > 0 ? 'Study today to keep it going.' : 'Answer one question to start a streak.'
}

export async function SidebarStreak() {
  const { streak, studiedToday } = await getStudyStreak()
  return (
    <div className="rounded-2xl border border-border bg-secondary p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Flame className="size-4 text-yellow" aria-hidden="true" />
        {streak}-day streak
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{streakNote(streak, studiedToday)}</p>
    </div>
  )
}
