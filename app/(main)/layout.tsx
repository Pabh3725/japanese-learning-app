import { Suspense } from 'react'
import { AppSidebar } from '@/components/nav/app-sidebar'
import { MobileBottomNav } from '@/components/nav/mobile-bottom-nav'
import { MobileTopBar } from '@/components/nav/mobile-top-bar'
import { SidebarStreak } from '@/components/nav/sidebar-streak'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppSidebar
        streak={
          <Suspense fallback={<div className="h-[74px] rounded-2xl border border-border bg-secondary" />}>
            <SidebarStreak />
          </Suspense>
        }
      />
      <MobileTopBar />
      <main className="pb-28 lg:pb-12 lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-8 lg:pt-10">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  )
}
