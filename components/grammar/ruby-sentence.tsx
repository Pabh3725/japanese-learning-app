// Grammar: câu tiếng Nhật theo mảnh, có furigana trên Kanji (bật/tắt), ô trống, phần gạch dưới (tìm chỗ sai) và ô ★.
import type { GrammarPiece } from '@/lib/grammar/types'
import { cn } from '@/lib/utils'

const KANJI = /[一-鿿㐀-䶿々〆]/

/** Tách mảnh thành phần Kanji (có furigana) và phần kana đi kèm: 寝ます{ねます} → 寝(ね)ます. */
function rubyParts(p: GrammarPiece): { text: string; ruby?: string }[] {
  if (!p.r || !KANJI.test(p.t)) return [{ text: p.t }]
  // Phần kana cuối giống nhau ở chữ và cách đọc thì không cần furigana
  let tail = 0
  while (tail < p.t.length && tail < p.r.length && !KANJI.test(p.t[p.t.length - 1 - tail]) && p.t[p.t.length - 1 - tail] === p.r[p.r.length - 1 - tail]) tail++
  let head = 0
  while (head < p.t.length - tail && head < p.r.length - tail && !KANJI.test(p.t[head]) && p.t[head] === p.r[head]) head++
  const parts: { text: string; ruby?: string }[] = []
  if (head) parts.push({ text: p.t.slice(0, head) })
  parts.push({ text: p.t.slice(head, p.t.length - tail), ruby: p.r.slice(head, p.r.length - tail) })
  if (tail) parts.push({ text: p.t.slice(p.t.length - tail) })
  return parts
}

export function RubyPiece({ piece, furigana }: { piece: GrammarPiece; furigana: boolean }) {
  return (
    <>
      {rubyParts(piece).map((part, i) =>
        part.ruby && furigana ? (
          <ruby key={i}>
            {part.text}
            <rt className="text-[0.5em] text-muted-foreground">{part.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}

interface RubySentenceProps {
  pieces: readonly GrammarPiece[]
  furigana: boolean
  blank?: number
  /** Chữ điền tạm vào ô trống (đáp án đang chọn hoặc đáp án đúng sau khi chấm). */
  fill?: string
  underline?: readonly number[]
  selected?: number | null
  onPick?: (index: number) => void
  hidden?: readonly number[]
  star?: number
  className?: string
}

export function RubySentence({ pieces, furigana, blank, fill, underline, selected, onPick, hidden, star, className }: RubySentenceProps) {
  return (
    <p lang="ja" className={cn('font-jp text-2xl leading-[2.4] md:text-3xl', className)}>
      {pieces.map((p, i) => {
        if (i === blank) {
          return (
            <span key={i} className={cn('mx-1 inline-block min-w-14 border-b-2 px-2 text-center', fill ? 'border-primary text-primary' : 'border-muted-foreground')}>
              {fill || ' '}
            </span>
          )
        }
        if (hidden?.includes(i)) {
          return (
            <span key={i} className={cn('mx-1 inline-flex size-10 items-center justify-center rounded-lg border-2 border-dashed align-middle text-base', i === star ? 'border-yellow text-yellow' : 'border-border text-transparent')}>
              {i === star ? '★' : '·'}
            </span>
          )
        }
        if (underline?.includes(i)) {
          const n = underline.indexOf(i) + 1
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick?.(i)}
              className={cn('relative mx-0.5 rounded-md border-b-2 px-1 transition-colors', selected === i ? 'border-primary bg-primary/10' : 'border-yellow hover:bg-secondary')}
            >
              <RubyPiece piece={p} furigana={furigana} />
              <sub className="ml-0.5 font-sans text-xs text-muted-foreground">{n}</sub>
            </button>
          )
        }
        return <RubyPiece key={i} piece={p} furigana={furigana} />
      })}
    </p>
  )
}
