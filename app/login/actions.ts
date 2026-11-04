'use server'

// Server Functions cho trang /login. Chạy trên server: ghi được cookie session.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from '@/lib/auth/username'

export interface AuthFormState {
  error: string | null
  username: string
}

/** Chỉ cho phép chuyển về đường dẫn nội bộ (chặn open redirect). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

function readForm(formData: FormData) {
  const username = normalizeUsername(String(formData.get('username') ?? ''))
  const password = String(formData.get('password') ?? '')
  return { username, password, next: safeNext(formData.get('next')) }
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { username, password, next } = readForm(formData)
  if (validateUsername(username) || !password) {
    return { error: 'Wrong username or password.', username }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })
  // Không nói rõ sai username hay sai mật khẩu, để người lạ không dò được username nào tồn tại
  if (error) return { error: 'Wrong username or password.', username }

  redirect(next)
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { username, password, next } = readForm(formData)
  const invalid = validateUsername(username) ?? validatePassword(password)
  if (invalid) return { error: invalid, username }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username } },
  })

  if (error) {
    if (error.code === 'user_already_exists') {
      return { error: 'That username is already taken.', username }
    }
    return { error: 'Could not create the account. Please try again.', username }
  }
  // Nếu "Confirm email" chưa tắt trong Supabase, sẽ không có session
  if (!data.session) {
    return { error: 'Account created but sign-in is blocked. Ask the admin to turn off "Confirm email".', username }
  }

  redirect(next)
}
