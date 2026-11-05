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
