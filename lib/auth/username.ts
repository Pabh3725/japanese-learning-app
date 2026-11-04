// Đăng nhập bằng username + mật khẩu (AUTH-01, SEC-D6).
// Supabase Auth cần một "email", nên mỗi username được đổi thành một địa chỉ nội bộ
// không có thật. App không bao giờ gửi email tới địa chỉ này (đã tắt "Confirm email").

/** Đuôi địa chỉ nội bộ. `.invalid` là tên miền dành riêng (RFC 2606), không ai sở hữu được. */
export const USERNAME_EMAIL_DOMAIN = 'users.projap.invalid'

export const USERNAME_RULES = { min: 3, max: 20, pattern: /^[a-z0-9_]+$/ }
export const PASSWORD_MIN_LENGTH = 8

/** Bỏ khoảng trắng hai đầu, đổi về chữ thường: "  Nghia_01 " → "nghia_01". */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

/** Trả về thông báo lỗi, hoặc null nếu hợp lệ. Username phải đã được normalize. */
export function validateUsername(username: string): string | null {
  const { min, max, pattern } = USERNAME_RULES
  if (username.length < min || username.length > max) {
    return `Username must be ${min}–${max} characters.`
  }
  if (!pattern.test(username)) {
    return 'Use only lowercase letters, numbers and underscores.'
  }
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  return null
}

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`
}

/** Lấy lại username từ địa chỉ nội bộ; trả về null nếu không đúng dạng. */
export function emailToUsername(email: string | null | undefined): string | null {
  if (!email) return null
  const suffix = `@${USERNAME_EMAIL_DOMAIN}`
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : null
}
