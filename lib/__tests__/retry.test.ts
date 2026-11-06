import { describe, expect, it, vi } from 'vitest'
import { withRetry } from '../retry'

const noWait = () => Promise.resolve()

describe('withRetry', () => {
  it('thành công ngay thì chỉ gửi một lần', async () => {
    const send = vi.fn().mockResolvedValue('ok')
    await expect(withRetry(send, undefined, [1, 1], noWait)).resolves.toBe('ok')
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('lỗi mạng thì gửi lại', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue('ok')
    await expect(withRetry(send, undefined, [1, 1], noWait)).resolves.toBe('ok')
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('gửi lại khi kết quả cần thử lại, hết lượt thì trả kết quả cuối', async () => {
    const send = vi.fn().mockResolvedValue('conflict')
    await expect(withRetry(send, (r) => r === 'conflict', [1, 1], noWait)).resolves.toBe('conflict')
    expect(send).toHaveBeenCalledTimes(3)
  })

  it('lỗi mãi thì ném lỗi cuối', async () => {
    const send = vi.fn().mockRejectedValue(new Error('network'))
    await expect(withRetry(send, undefined, [1], noWait)).rejects.toThrow('network')
    expect(send).toHaveBeenCalledTimes(2)
  })
})
