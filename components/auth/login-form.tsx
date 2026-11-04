'use client'

import { useActionState, useState } from 'react'
import { actionButton } from '@/components/action-button'
import { signIn, signUp, type AuthFormState } from '@/app/login/actions'
import { PASSWORD_MIN_LENGTH, USERNAME_RULES } from '@/lib/auth/username'
import { cn } from '@/lib/utils'

const initial: AuthFormState = { error: null, username: '' }

const inputClass =
  'h-12 w-full rounded-xl border border-input bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signInState, signInAction, signingIn] = useActionState(signIn, initial)
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initial)

  const isSignUp = mode === 'signup'
  const state = isSignUp ? signUpState : signInState
  const pending = isSignUp ? signingUp : signingIn

  return (
    <form action={isSignUp ? signUpAction : signInAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Username</span>
        <input
          name="username"
          defaultValue={state.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={USERNAME_RULES.min}
          maxLength={USERNAME_RULES.max}
          className={inputClass}
        />
        {isSignUp && (
          <span className="text-xs text-muted-foreground">
            {USERNAME_RULES.min}–{USERNAME_RULES.max} characters: lowercase letters, numbers, underscores.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          required
          minLength={isSignUp ? PASSWORD_MIN_LENGTH : undefined}
          className={inputClass}
        />
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={cn(actionButton({ variant: 'primary', size: 'lg' }), 'mt-2 w-full')}>
        {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={() => setMode(isSignUp ? 'signin' : 'signup')}
        className={cn(actionButton({ variant: 'ghost', size: 'md' }), 'w-full')}
      >
        {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </form>
  )
}
