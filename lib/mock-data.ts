import type { KanjiItem, ReviewCard, VocabItem } from './types'

export const vocabulary: VocabItem[] = [
  { id: 'v-gakkou', word: '学校', kana: 'がっこう', kanaPieces: ['が', 'っ', 'こ', 'う'], romaji: 'gakkou', meaning: 'Trường học', hanViet: 'HỌC HIỆU', jlpt: 'N5', strength: 0.82 },
  { id: 'v-sensei', word: '先生', kana: 'せんせい', kanaPieces: ['せ', 'ん', 'せ', 'い'], romaji: 'sensei', meaning: 'Giáo viên', hanViet: 'TIÊN SINH', jlpt: 'N5', strength: 0.9 },
  { id: 'v-gakusei', word: '学生', kana: 'がくせい', kanaPieces: ['が', 'く', 'せ', 'い'], romaji: 'gakusei', meaning: 'Học sinh', hanViet: 'HỌC SINH', jlpt: 'N5', strength: 0.74 },
  { id: 'v-tomodachi', word: '友達', kana: 'ともだち', kanaPieces: ['と', 'も', 'だ', 'ち'], romaji: 'tomodachi', meaning: 'Bạn bè', hanViet: 'HỮU ĐẠT', jlpt: 'N5', strength: 0.35 },
  { id: 'v-densha', word: '電車', kana: 'でんしゃ', kanaPieces: ['で', 'ん', 'しゃ'], romaji: 'densha', meaning: 'Tàu điện', hanViet: 'ĐIỆN XA', jlpt: 'N5', strength: 0.41 },
  { id: 'v-jikan', word: '時間', kana: 'じかん', kanaPieces: ['じ', 'か', 'ん'], romaji: 'jikan', meaning: 'Thời gian', hanViet: 'THỜI GIAN', jlpt: 'N5', strength: 0.66 },
  { id: 'v-tenki', word: '天気', kana: 'てんき', kanaPieces: ['て', 'ん', 'き'], romaji: 'tenki', meaning: 'Thời tiết', hanViet: 'THIÊN KHÍ', jlpt: 'N5', strength: 0.28 },
  { id: 'v-kaisha', word: '会社', kana: 'かいしゃ', kanaPieces: ['か', 'い', 'しゃ'], romaji: 'kaisha', meaning: 'Công ty', hanViet: 'HỘI XÃ', jlpt: 'N5', strength: 0.58 },
  { id: 'v-mainichi', word: '毎日', kana: 'まいにち', kanaPieces: ['ま', 'い', 'に', 'ち'], romaji: 'mainichi', meaning: 'Mỗi ngày', hanViet: 'MỖI NHẬT', jlpt: 'N5', strength: 0.88 },
  { id: 'v-daigaku', word: '大学', kana: 'だいがく', kanaPieces: ['だ', 'い', 'が', 'く'], romaji: 'daigaku', meaning: 'Đại học', hanViet: 'ĐẠI HỌC', jlpt: 'N5', strength: 0.7 },
  { id: 'v-eiga', word: '映画', kana: 'えいが', kanaPieces: ['え', 'い', 'が'], romaji: 'eiga', meaning: 'Phim', hanViet: 'ÁNH HỌA', jlpt: 'N5', strength: 0.32 },
  { id: 'v-byouin', word: '病院', kana: 'びょういん', kanaPieces: ['びょ', 'う', 'い', 'ん'], romaji: 'byouin', meaning: 'Bệnh viện', hanViet: 'BỆNH VIỆN', jlpt: 'N5', strength: 0.22 },
  { id: 'v-mizu', word: '水', kana: 'みず', kanaPieces: ['み', 'ず'], romaji: 'mizu', meaning: 'Nước', hanViet: 'THỦY', jlpt: 'N5', strength: 0.95 },
  { id: 'v-yama', word: '山', kana: 'やま', kanaPieces: ['や', 'ま'], romaji: 'yama', meaning: 'Núi', hanViet: 'SƠN', jlpt: 'N5', strength: 0.91 },
  { id: 'v-hon', word: '本', kana: 'ほん', kanaPieces: ['ほ', 'ん'], romaji: 'hon', meaning: 'Sách', hanViet: 'BẢN', jlpt: 'N5', strength: 0.86 },
  { id: 'v-kuruma', word: '車', kana: 'くるま', kanaPieces: ['く', 'る', 'ま'], romaji: 'kuruma', meaning: 'Xe ô tô', hanViet: 'XA', jlpt: 'N5', strength: 0.47 },
]

export const kanjiList: KanjiItem[] = [
  { id: 'k-gaku', char: '学', hanViet: 'HỌC', meaning: 'Học tập', onyomi: 'ガク', kunyomi: 'まな.ぶ', strokes: 8, components: ['⺍', '冖', '子'], jlpt: 'N5' },
  { id: 'k-kou', char: '校', hanViet: 'HIỆU', meaning: 'Trường học', onyomi: 'コウ', kunyomi: '—', strokes: 10, components: ['木', '交'], jlpt: 'N5' },
  { id: 'k-sen', char: '先', hanViet: 'TIÊN', meaning: 'Trước, tiên', onyomi: 'セン', kunyomi: 'さき', strokes: 6, components: ['⺧', '儿'], jlpt: 'N5' },
  { id: 'k-sei', char: '生', hanViet: 'SINH', meaning: 'Sống, sinh ra', onyomi: 'セイ', kunyomi: 'い.きる', strokes: 5, components: ['生'], jlpt: 'N5' },
  { id: 'k-yasu', char: '休', hanViet: 'HƯU', meaning: 'Nghỉ ngơi', onyomi: 'キュウ', kunyomi: 'やす.む', strokes: 6, components: ['亻', '木'], jlpt: 'N5' },
  { id: 'k-mei', char: '明', hanViet: 'MINH', meaning: 'Sáng, rõ ràng', onyomi: 'メイ', kunyomi: 'あか.るい', strokes: 8, components: ['日', '月'], jlpt: 'N5' },
  { id: 'k-ji', char: '時', hanViet: 'THỜI', meaning: 'Thời gian, giờ', onyomi: 'ジ', kunyomi: 'とき', strokes: 10, components: ['日', '寺'], jlpt: 'N5' },
  { id: 'k-kan', char: '間', hanViet: 'GIAN', meaning: 'Khoảng, giữa', onyomi: 'カン', kunyomi: 'あいだ', strokes: 12, components: ['門', '日'], jlpt: 'N5' },
  { id: 'k-nichi', char: '日', hanViet: 'NHẬT', meaning: 'Ngày, mặt trời', onyomi: 'ニチ', kunyomi: 'ひ', strokes: 4, components: ['日'], jlpt: 'N5' },
  { id: 'k-mizu', char: '水', hanViet: 'THỦY', meaning: 'Nước', onyomi: 'スイ', kunyomi: 'みず', strokes: 4, components: ['水'], jlpt: 'N5' },
  { id: 'k-yama', char: '山', hanViet: 'SƠN', meaning: 'Núi', onyomi: 'サン', kunyomi: 'やま', strokes: 3, components: ['山'], jlpt: 'N5' },
  { id: 'k-den', char: '電', hanViet: 'ĐIỆN', meaning: 'Điện', onyomi: 'デン', kunyomi: '—', strokes: 13, components: ['雨', '电'], jlpt: 'N5' },
]

export const kanjiDistractorComponents = ['口', '木', '目', '田', '女', '火', '雨', '心', '寸', '土']

export const reviewQueue: ReviewCard[] = [
  { id: 'r-1', front: '学', kind: 'kanji', question: 'What is its Sino-Vietnamese reading and meaning?', answer: 'HỌC', detail: 'Học tập', reading: 'ガク · まな.ぶ' },
  { id: 'r-2', front: '学校', kind: 'vocab', question: 'What is its reading and meaning?', answer: 'がっこう', detail: 'Trường học', reading: 'HỌC HIỆU' },
  { id: 'r-3', front: '休', kind: 'kanji', question: 'What is its Sino-Vietnamese reading and meaning?', answer: 'HƯU', detail: 'Nghỉ ngơi', reading: 'キュウ · やす.む' },
  { id: 'r-4', front: '電車', kind: 'vocab', question: 'What is its reading and meaning?', answer: 'でんしゃ', detail: 'Tàu điện', reading: 'ĐIỆN XA' },
  { id: 'r-5', front: '明', kind: 'kanji', question: 'What is its Sino-Vietnamese reading and meaning?', answer: 'MINH', detail: 'Sáng, rõ ràng', reading: 'メイ · あか.るい' },
  { id: 'r-6', front: '友達', kind: 'vocab', question: 'What is its reading and meaning?', answer: 'ともだち', detail: 'Bạn bè', reading: 'HỮU ĐẠT' },
  { id: 'r-7', front: '時', kind: 'kanji', question: 'What is its Sino-Vietnamese reading and meaning?', answer: 'THỜI', detail: 'Thời gian, giờ', reading: 'ジ · とき' },
  { id: 'r-8', front: '天気', kind: 'vocab', question: 'What is its reading and meaning?', answer: 'てんき', detail: 'Thời tiết', reading: 'THIÊN KHÍ' },
]

export const userProfile = {
  name: 'Minh',
  streak: 12,
  dueToday: 42,
  newToday: 8,
  dailyGoal: 30,
  completedToday: 18,
  vocabLearned: 248,
  vocabTotal: 800,
  kanjiLearned: 64,
  kanjiTotal: 103,
  retention: 0.87,
}

export const weeklyActivity = [
  { day: 'Mon', minutes: 24 },
  { day: 'Tue', minutes: 32 },
  { day: 'Wed', minutes: 18 },
  { day: 'Thu', minutes: 40 },
  { day: 'Fri', minutes: 28 },
  { day: 'Sat', minutes: 12 },
  { day: 'Sun', minutes: 22 },
]

export const achievements = [
  { id: 'a-1', title: 'Steady Week', description: 'Studied 7 days in a row', unlocked: true, color: 'yellow' as const },
  { id: 'a-2', title: 'Kana Master', description: 'Completed all Hiragana', unlocked: true, color: 'cyan' as const },
  { id: 'a-3', title: '50 Kanji', description: 'Learned 50 Kanji characters', unlocked: true, color: 'pink' as const },
  { id: 'a-4', title: 'Lightning Hands', description: 'Match 30 pairs in Speed Matching', unlocked: false, color: 'primary' as const },
]
