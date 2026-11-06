// Dữ liệu mẫu để xem trước giao diện Ngữ pháp và Động từ. Chưa phải nội dung thật: câu do nhóm tự viết,
// chưa được rà soát, chưa lưu kết quả. Phần thật làm sau v0.1.

export type GrammarExerciseType = 'translate' | 'verb_form' | 'word_choice' | 'particle'

export const EXERCISE_TYPES: { id: GrammarExerciseType; label: string; description: string }[] = [
  { id: 'translate', label: 'Translate', description: 'Build the Japanese sentence from pieces' },
  { id: 'verb_form', label: 'Verb form', description: 'Choose the correct form of the verb' },
  { id: 'word_choice', label: 'Word choice', description: 'Choose the word that fits the meaning' },
  { id: 'particle', label: 'Particle', description: 'Choose the correct particle' },
]

export type GrammarQuestion =
  | { type: 'verb_form' | 'word_choice' | 'particle'; prompt: string; hint: string; options: string[]; answer: string }
  | { type: 'translate'; prompt: string; pieces: string[]; answer: string[] }

export interface GrammarPoint {
  id: string
  lesson: number
  pattern: string
  meaning: string
  explanation: string
  examples: { japanese: string; reading: string; meaning: string }[]
  questions: GrammarQuestion[]
}

export const GRAMMAR_POINTS: GrammarPoint[] = [
  {
    id: 'n-wa-n-desu',
    lesson: 1,
    pattern: 'N1 は N2 です',
    meaning: 'N1 là N2',
    explanation: 'Dùng để nói một người hoặc vật là gì. は đứng sau chủ đề và đọc là "wa". です đứng cuối câu, thể hiện sự lịch sự.',
    examples: [
      { japanese: 'わたしは がくせいです。', reading: 'わたしは がくせいです', meaning: 'Tôi là học sinh.' },
      { japanese: 'たなかさんは せんせいです。', reading: 'たなかさんは せんせいです', meaning: 'Anh Tanaka là giáo viên.' },
    ],
    questions: [
      { type: 'particle', prompt: 'わたし ＿ がくせいです。', hint: 'Tôi là học sinh.', options: ['は', 'を', 'に', 'で'], answer: 'は' },
      { type: 'translate', prompt: 'Tôi là giáo viên.', pieces: ['わたし', 'は', 'せんせい', 'です', 'を', 'ます'], answer: ['わたし', 'は', 'せんせい', 'です'] },
      { type: 'word_choice', prompt: 'たなかさんは ＿ です。', hint: 'Anh Tanaka là bác sĩ.', options: ['いしゃ', 'がくせい', 'せんせい', 'かいしゃいん'], answer: 'いしゃ' },
    ],
  },
  {
    id: 'n-wa-n-ja-arimasen',
    lesson: 1,
    pattern: 'N1 は N2 じゃ ありません',
    meaning: 'N1 không phải là N2',
    explanation: 'Thể phủ định của です. Trong văn viết trang trọng có thể dùng では ありません.',
    examples: [
      { japanese: 'わたしは せんせいじゃ ありません。', reading: 'わたしは せんせいじゃ ありません', meaning: 'Tôi không phải là giáo viên.' },
    ],
    questions: [
      { type: 'translate', prompt: 'Tôi không phải là học sinh.', pieces: ['わたし', 'は', 'がくせい', 'じゃ', 'ありません', 'です'], answer: ['わたし', 'は', 'がくせい', 'じゃ', 'ありません'] },
    ],
  },
  {
    id: 'kore-sore-are',
    lesson: 2,
    pattern: 'これ／それ／あれ は N です',
    meaning: 'Cái này / cái đó / cái kia là N',
    explanation: 'これ chỉ vật gần người nói, それ chỉ vật gần người nghe, あれ chỉ vật ở xa cả hai.',
    examples: [{ japanese: 'これは ほんです。', reading: 'これは ほんです', meaning: 'Đây là quyển sách.' }],
    questions: [
      { type: 'word_choice', prompt: '＿ は ほんです。', hint: 'Cái này là quyển sách (ở gần người nói).', options: ['これ', 'それ', 'あれ', 'どれ'], answer: 'これ' },
    ],
  },
  {
    id: 'n-wo-v-masu',
    lesson: 6,
    pattern: 'N を V ます',
    meaning: 'Làm V với N',
    explanation: 'を đứng sau tân ngữ, là thứ chịu tác động của động từ.',
    examples: [{ japanese: 'パンを たべます。', reading: 'パンを たべます', meaning: 'Tôi ăn bánh mì.' }],
    questions: [
      { type: 'particle', prompt: 'パン ＿ たべます。', hint: 'Tôi ăn bánh mì.', options: ['を', 'は', 'へ', 'に'], answer: 'を' },
      { type: 'verb_form', prompt: 'きのう パンを ＿。', hint: 'Hôm qua tôi đã ăn bánh mì.', options: ['たべました', 'たべます', 'たべません', 'たべて'], answer: 'たべました' },
    ],
  },
  {
    id: 'v-te-kudasai',
    lesson: 14,
    pattern: 'V て ください',
    meaning: 'Hãy làm V',
    explanation: 'Dùng để nhờ hoặc hướng dẫn ai đó làm gì một cách lịch sự. Động từ chia về thể て.',
    examples: [{ japanese: 'ここに なまえを かいて ください。', reading: 'ここに なまえを かいて ください', meaning: 'Hãy viết tên vào đây.' }],
    questions: [
      { type: 'verb_form', prompt: 'ちょっと ＿ ください。', hint: 'Hãy đợi một chút.', options: ['まって', 'まつ', 'まちます', 'まった'], answer: 'まって' },
    ],
  },
]

export function grammarById(id: string): GrammarPoint | undefined {
  return GRAMMAR_POINTS.find((point) => point.id === id)
}

export type VerbForm = 'te' | 'ta' | 'nai' | 'tai' | 'dictionary'

export const VERB_FORMS: { id: VerbForm; label: string; example: string }[] = [
  { id: 'te', label: 'て form', example: 'たべて' },
  { id: 'ta', label: 'た form', example: 'たべた' },
  { id: 'nai', label: 'ない form', example: 'たべない' },
  { id: 'tai', label: 'たい form', example: 'たべたい' },
  { id: 'dictionary', label: 'Dictionary form', example: 'たべる' },
]

export interface PreviewVerb {
  masu: string
  meaning: string
  group: 1 | 2 | 3
  forms: Record<VerbForm, string>
}

export const PREVIEW_VERBS: PreviewVerb[] = [
  { masu: 'のみます', meaning: 'uống', group: 1, forms: { te: 'のんで', ta: 'のんだ', nai: 'のまない', tai: 'のみたい', dictionary: 'のむ' } },
  { masu: 'かきます', meaning: 'viết', group: 1, forms: { te: 'かいて', ta: 'かいた', nai: 'かかない', tai: 'かきたい', dictionary: 'かく' } },
  { masu: 'かえります', meaning: 'về', group: 1, forms: { te: 'かえって', ta: 'かえった', nai: 'かえらない', tai: 'かえりたい', dictionary: 'かえる' } },
  { masu: 'たべます', meaning: 'ăn', group: 2, forms: { te: 'たべて', ta: 'たべた', nai: 'たべない', tai: 'たべたい', dictionary: 'たべる' } },
  { masu: 'みます', meaning: 'xem', group: 2, forms: { te: 'みて', ta: 'みた', nai: 'みない', tai: 'みたい', dictionary: 'みる' } },
  { masu: 'します', meaning: 'làm', group: 3, forms: { te: 'して', ta: 'した', nai: 'しない', tai: 'したい', dictionary: 'する' } },
  { masu: 'きます', meaning: 'đến', group: 3, forms: { te: 'きて', ta: 'きた', nai: 'こない', tai: 'きたい', dictionary: 'くる' } },
]

/** Trộn mảng cho phiên xem trước. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
