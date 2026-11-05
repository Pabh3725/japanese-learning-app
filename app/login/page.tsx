import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign in — Nihongo' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-pop rounded-3xl border border-border bg-card p-8">
        <p className="font-jp text-sm text-primary">ようこそ</p>
        <h1 className="mt-1 text-2xl font-semibold">Welcome to Nihongo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to keep your progress in sync across your devices.
        </p>
        <div className="mt-8">
          <LoginForm next={safeNext} />
        </div>
      </div>
    </main>
  )
}
