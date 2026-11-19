

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_WORDS_PER_CHANGE = 200

/** Danh sách từ trình duyệt gửi lên. Sai dạng, rỗng hoặc quá dài trả null; từ trùng chỉ giữ một. */
export function parseVocabularyIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_WORDS_PER_CHANGE) return null
  if (!input.every(isVocabularyId)) return null
  return [...new Set(input as string[])]
}

/** Không tin trình duyệt: chỉ nhận chuỗi UUID. */
export function isVocabularyId(input: unknown): input is string {
  return typeof input === 'string' && UUID.test(input)
}
