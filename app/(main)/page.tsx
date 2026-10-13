import { BookText, Brain, Languages } from 'lucide-react'
import { DailyProgress } from '@/components/dashboard/daily-progress'
import { DashboardStatCard } from '@/components/dashboard/dashboard-stat-card'
import { Greeting } from '@/components/dashboard/greeting'
import { LearningCard } from '@/components/dashboard/learning-card'
import { QuickTraining } from '@/components/dashboard/quick-training'
import { ReviewHeroCard } from '@/components/dashboard/review-hero-card'
import { userProfile, vocabulary } from '@/lib/mock-data'

export default function DashboardPage() {
  const weakCount = vocabulary.filter((v) => v.strength < 0.5).length

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={userProfile.name} streak={userProfile.streak} />

      <ReviewHeroCard due={userProfile.dueToday} newCount={userProfile.newToday} minutes={14} />

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          label="Vocabulary learned"
          value={userProfile.vocabLearned}
          total={userProfile.vocabTotal}
          icon={BookText}
          tone="cyan"
          jp="語"
        />
        <DashboardStatCard
          label="Kanji learned"
          value={userProfile.kanjiLearned}
          total={userProfile.kanjiTotal}
          icon={Languages}
          tone="pink"
          jp="字"
        />
        <DashboardStatCard
          label="Retention rate"
          value={Math.round(userProfile.retention * 100)}
          suffix="%"
          icon={Brain}
          tone="primary"
          jp="記"
        />
      </div>

      <section aria-labelledby="continue-title" className="flex flex-col gap-4">
        <h2 id="continue-title" className="text-lg font-semibold">
          Continue learning
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <LearningCard
            href="/learn/session?mode=vocab"
            title="New Vocabulary"
            description="N5 · Lesson 4 — School life"
            sample="学校"
            count={8}
            countLabel="new words"
            tone="cyan"
          />
          <LearningCard
            href="/learn/session?mode=kanji"
            title="New Kanji"
            description="N5 · Set 7 — Rest & light"
            sample="休"
            count={3}
            countLabel="new kanji"
            tone="pink"
          />
          <LearningCard
            href="/review/session"
            title="Weak Words"
            description="Items you often get wrong"
            sample="病"
            count={weakCount}
            countLabel="to strengthen"
            tone="yellow"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <DailyProgress completed={userProfile.completedToday} goal={userProfile.dailyGoal} streakDaysThisWeek={4} />
        <QuickTraining />
      </div>
    </div>
  )
}
