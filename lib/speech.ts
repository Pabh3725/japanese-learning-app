// AUD-01 — Phát âm bằng Web Speech API. Chỉ chạy trên trình duyệt.
// Luôn đưa Kana cho máy đọc: đọc 学校 thì máy có thể đọc sai, đọc がっこう thì luôn đúng.

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'ja-JP') ?? voices.find((v) => v.lang.toLowerCase().startsWith('ja'))
}

/** Danh sách giọng nạp bất đồng bộ trên nhiều trình duyệt, nên phải chờ sự kiện voiceschanged. */
export function hasJapaneseVoice(timeoutMs = 1500): Promise<boolean> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve(false)
  if (japaneseVoice()) return Promise.resolve(true)
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    const finish = () => {
      synth.removeEventListener('voiceschanged', onChange)
      clearTimeout(timer)
      resolve(Boolean(japaneseVoice()))
    }
    const onChange = () => finish()
    const timer = setTimeout(finish, timeoutMs)
    synth.addEventListener('voiceschanged', onChange)
  })
}

export function speak(kana: string): void {
  const voice = japaneseVoice()
  if (!voice) return
  const synth = window.speechSynthesis
  synth.cancel() // bấm liên tiếp thì đọc lại từ đầu, không xếp hàng
  const utterance = new SpeechSynthesisUtterance(kana)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = 0.9
  synth.speak(utterance)
}

/**
 * JLPT 聴解: đọc lần lượt nhiều câu, mỗi người nói một giọng. Thiết bị thường chỉ có một giọng Nhật nên phân biệt
 * nam / nữ bằng cao độ; có nhiều giọng thì nam và nữ dùng hai giọng khác nhau. Gọi lại thì đọc lại từ đầu.
 */
export function speakScript(lines: readonly { sp: 'M' | 'F' | 'N'; text: string }[], onDone?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'))
  if (voices.length === 0) return
  const synth = window.speechSynthesis
  synth.cancel()
  const voiceOf = { N: voices[0], M: voices[0], F: voices[1] ?? voices[0] }
  const pitchOf = { N: 1, M: 0.75, F: voices[1] ? 1.1 : 1.35 }
  lines.forEach((line, i) => {
    const u = new SpeechSynthesisUtterance(line.text)
    u.voice = voiceOf[line.sp]
    u.lang = u.voice.lang
    u.pitch = pitchOf[line.sp]
    u.rate = 0.9
    if (i === lines.length - 1 && onDone) u.onend = onDone
    synth.speak(u)
  })
}
