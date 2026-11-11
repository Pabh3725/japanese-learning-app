// Tìm cặp chữ Kanji gần giống (日/目, 土/士, 未/末) từ nét viết KanjiVG, và soạn lời giải thích tự động. Pure.
// Chỉ là đề xuất: chủ dự án duyệt từng cặp trước khi dùng cho câu hỏi (R12).

import type { KanjiPart, KanjiVisual } from './kanjivg'

const SIZE = 109
const GRID = 14

type Point = [number, number]

/** Lấy điểm dọc theo đường nét SVG (M, L, H, V, C, S, Q, T, Z; hoa và thường). */
export function samplePath(d: string, perSegment = 8): Point[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const pts: Point[] = []
  let i = 0
  let cmd = ''
  let x = 0
  let y = 0
  let lastCtrl: Point | null = null
  const num = () => Number(tokens[i++])
  const cubic = (p0: Point, p1: Point, p2: Point, p3: Point) => {
    for (let k = 1; k <= perSegment; k++) {
      const t = k / perSegment
      const u = 1 - t
      pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]])
    }
  }
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    switch (cmd.toUpperCase()) {
      case 'M': {
        x = ox + num()
        y = oy + num()
        pts.push([x, y])
        cmd = rel ? 'l' : 'L'
        lastCtrl = null
        break
      }
      case 'L': {
        const nx = ox + num()
        const ny = oy + num()
        for (let k = 1; k <= perSegment; k++) pts.push([x + ((nx - x) * k) / perSegment, y + ((ny - y) * k) / perSegment])
        x = nx
        y = ny
        lastCtrl = null
        break
      }
      case 'H':
      case 'V': {
        const v = num()
        const nx = cmd.toUpperCase() === 'H' ? (rel ? x + v : v) : x
        const ny = cmd.toUpperCase() === 'V' ? (rel ? y + v : v) : y
        for (let k = 1; k <= perSegment; k++) pts.push([x + ((nx - x) * k) / perSegment, y + ((ny - y) * k) / perSegment])
        x = nx
        y = ny
        lastCtrl = null
        break
      }
      case 'C': {
        const c1: Point = [ox + num(), oy + num()]
        const c2: Point = [ox + num(), oy + num()]
        const end: Point = [ox + num(), oy + num()]
        cubic([x, y], c1, c2, end)
        lastCtrl = c2
        ;[x, y] = end
        break
      }
      case 'S': {
        const c1: Point = lastCtrl ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y]
        const c2: Point = [ox + num(), oy + num()]
        const end: Point = [ox + num(), oy + num()]
        cubic([x, y], c1, c2, end)
        lastCtrl = c2
        ;[x, y] = end
        break
      }
      case 'Q':
      case 'T': {
        const q: Point = cmd.toUpperCase() === 'Q' ? [ox + num(), oy + num()] : lastCtrl ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y]
        const end: Point = [ox + num(), oy + num()]
        cubic([x, y], [x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y)], [end[0] + (2 / 3) * (q[0] - end[0]), end[1] + (2 / 3) * (q[1] - end[1])], end)
        lastCtrl = q
        ;[x, y] = end
        break
      }
      case 'Z':
        lastCtrl = null
        break
      default:
        // Lệnh không hỗ trợ: bỏ qua phần còn lại của nét
        return pts
    }
  }
  return pts
}

/** Ô lưới mà nét đi qua; nới thêm một ô quanh mỗi ô để nét lệch nhẹ vẫn trùng. */
export function shapeCells(strokes: readonly string[]): Set<number> {
  const cells = new Set<number>()
  for (const d of strokes) {
    for (const [px, py] of samplePath(d)) {
      const cx = Math.min(GRID - 1, Math.max(0, Math.floor((px / SIZE) * GRID)))
      const cy = Math.min(GRID - 1, Math.max(0, Math.floor((py / SIZE) * GRID)))
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx >= 0 && ny >= 0 && nx < GRID && ny < GRID) cells.add(ny * GRID + nx)
        }
      }
    }
  }
  return cells
}

export function overlap(a: ReadonlySet<number>, b: ReadonlySet<number>): number {
  let both = 0
  for (const c of a) if (b.has(c)) both++
  const union = a.size + b.size - both
  return union === 0 ? 0 : both / union
}

export interface SimilarPair {
  a: string
  b: string
  /** Độ trùng hình 0–1. */
  score: number
}

/** Cặp có hình trùng nhiều và số nét chênh ít. Mỗi chữ giữ tối đa `perChar` cặp tốt nhất. */
export function findSimilarPairs(visuals: readonly KanjiVisual[], opts = { minScore: 0.68, maxStrokeDiff: 2, perChar: 3 }): SimilarPair[] {
  const shapes = visuals.map((v) => ({ v, cells: shapeCells(v.strokes) }))
  const all: SimilarPair[] = []
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const A = shapes[i]
      const B = shapes[j]
      if (Math.abs(A.v.strokes.length - B.v.strokes.length) > opts.maxStrokeDiff) continue
      const score = overlap(A.cells, B.cells)
      if (score >= opts.minScore) all.push({ a: A.v.character, b: B.v.character, score: Math.round(score * 1000) / 1000 })
    }
  }
  all.sort((x, y) => y.score - x.score || x.a.localeCompare(y.a) || x.b.localeCompare(y.b))
  const used = new Map<string, number>()
  return all.filter((p) => {
    if ((used.get(p.a) ?? 0) >= opts.perChar || (used.get(p.b) ?? 0) >= opts.perChar) return false
    used.set(p.a, (used.get(p.a) ?? 0) + 1)
    used.set(p.b, (used.get(p.b) ?? 0) + 1)
    return true
  })
}

const leaves = (parts: readonly KanjiPart[]): string[] => parts.flatMap((p) => (p.parts ? [p.c, ...leaves(p.parts)] : [p.c]))
const top = (parts: readonly KanjiPart[]) => parts.map((p) => p.c)

export interface KanjiInfo {
  visual: KanjiVisual
  hanViet: string
  meaning: string
}

/** Lời giải thích tự động (chủ dự án chọn 2026-11-13): số nét và thành phần khác nhau. */
export function explainPair(a: KanjiInfo, b: KanjiInfo): string {
  const name = (k: KanjiInfo) => `${k.visual.character} (${k.hanViet}, ${k.meaning})`
  const na = a.visual.strokes.length
  const nb = b.visual.strokes.length
  const strokes = na === nb ? `Cả hai đều ${na} nét.` : `${a.visual.character} có ${na} nét, ${b.visual.character} có ${nb} nét.`
  const onlyA = top(a.visual.parts).filter((c) => !top(b.visual.parts).includes(c))
  const onlyB = top(b.visual.parts).filter((c) => !top(a.visual.parts).includes(c))
  let parts = ''
  if (onlyA.length > 0 && onlyB.length > 0) parts = ` Khác ở thành phần: ${a.visual.character} có ${onlyA.join(', ')}, ${b.visual.character} có ${onlyB.join(', ')}.`
  else if (onlyA.length > 0 || onlyB.length > 0) {
    const [more, extra] = onlyA.length > 0 ? [a, onlyA] : [b, onlyB]
    parts = ` ${more.visual.character} có thêm ${extra.join(', ')}.`
  } else {
    const shared = leaves(a.visual.parts).filter((c) => leaves(b.visual.parts).includes(c))
    parts = shared.length > 0 ? ` Cùng có ${[...new Set(shared)].slice(0, 3).join(', ')}; nhìn kỹ số nét và độ dài các nét.` : ' Nhìn kỹ số nét và độ dài các nét.'
  }
  return `${name(a)} và ${name(b)}. ${strokes}${parts}`
}
