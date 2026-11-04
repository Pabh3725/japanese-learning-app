import { describe, expect, it } from 'vitest'
import {
  emailToUsername,
  normalizeUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from '../username'

describe('username', () => {
  it('normalize: bỏ khoảng trắng, đổi chữ thường', () => {
    expect(normalizeUsername('  Nghia_01 ')).toBe('nghia_01')
  })

  it('chấp nhận chữ thường, số, gạch dưới; 3–20 ký tự', () => {
    expect(validateUsername('nghia_01')).toBe(null)
    expect(validateUsername('abc')).toBe(null)
    expect(validateUsername('a'.repeat(20))).toBe(null)
  })

  it('từ chối quá ngắn, quá dài, ký tự lạ', () => {
    expect(validateUsername('ab')).not.toBe(null)
    expect(validateUsername('a'.repeat(21))).not.toBe(null)
    expect(validateUsername('nghĩa')).not.toBe(null)
    expect(validateUsername('ng hia')).not.toBe(null)
    expect(validateUsername('a@b')).not.toBe(null)
  })

  it('đổi qua lại username ↔ địa chỉ nội bộ', () => {
    const email = usernameToEmail('nghia_01')
    expect(email).toBe('nghia_01@users.projap.invalid')
    expect(emailToUsername(email)).toBe('nghia_01')
    expect(emailToUsername('someone@gmail.com')).toBe(null)
    expect(emailToUsername(null)).toBe(null)
  })
})

describe('password', () => {
  it('tối thiểu 8 ký tự', () => {
    expect(validatePassword('1234567')).not.toBe(null)
    expect(validatePassword('12345678')).toBe(null)
  })
})
