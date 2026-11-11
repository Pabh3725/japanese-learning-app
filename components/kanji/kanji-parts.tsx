// V9 R12: bộ thủ và cây thành phần của một chữ (KanjiVG). Bộ thủ là bộ chính thức theo từ điển; thành phần là các phần cấu tạo.
import type { KanjiPart, KanjiVisualView } from '@/lib/kanji/visual'

const POSITION: Record<string, string> = {
  left: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
  kamae: 'enclosure',
  tare: 'hanging',
  nyo: 'wrapping',
  middle: 'middle',
  // Phần nằm bên trong bộ bao (KanjiVG: tarec, nyoc, kamaec)
  tarec: 'inside',
  nyoc: 'inside',
  kamaec: 'inside',
}

function PartTree({ parts }: { parts: readonly KanjiPart[] }) {
  return (
    <ul className="flex flex-wrap items-start justify-center gap-2">
      {parts.map((p, i) => (
        <li key={`${p.c}-${i}`} className="flex flex-col items-center gap-1 rounded-xl border border-border px-2.5 py-1.5">
          <span className="flex items-baseline gap-1.5">
            <span lang="ja" className="font-jp text-xl">{p.c}</span>
            {p.pos && POSITION[p.pos] && <span className="text-[11px] text-muted-foreground">{POSITION[p.pos]}</span>}
          </span>
          {p.parts && p.parts.length > 0 && (
            <span lang="ja" className="font-jp text-xs text-subtle">= {p.parts.map((child) => child.c).join(' + ')}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function KanjiPartsInfo({ visual }: { visual: KanjiVisualView }) {
  return (
    <div className="flex w-full flex-col gap-3 text-sm">
      {visual.radical && (
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Radical</span>
          <span>
            <span lang="ja" className="font-jp text-lg">{visual.radical.character}</span>
            <span className="ml-2 text-subtle">
              {visual.radical.name ? `${visual.radical.name} · ` : ''}No. {visual.radical.number}
            </span>
          </span>
        </p>
      )}
      {visual.parts.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-left text-xs text-muted-foreground">Parts</span>
          <PartTree parts={visual.parts} />
        </div>
      )}
    </div>
  )
}
