// Đọc KanjiVG (Ulrich Apel, CC BY-SA 3.0): nét viết, cây thành phần, vị trí, bộ thủ. Pure: nhận chuỗi XML.
// Tệp gốc không nằm trong repo (xem scripts/kanji-data/build.ts).

/** Một thành phần của chữ. Đủ mọi tầng (chủ dự án chọn 2026-11-13). */
export interface KanjiPart {
  /** Chữ của thành phần như KanjiVG ghi (亻, 木…). */
  c: string
  /** Dạng gốc khi thành phần là biến thể (亻 → 人). */
  original?: string
  /** left, right, top, bottom, kamae, tare, nyo… theo KanjiVG. */
  pos?: string
  /** Là bộ thủ của chữ. */
  radical?: boolean
  parts?: KanjiPart[]
}

export interface KanjiVisual {
  character: string
  /** Đường nét SVG theo thứ tự viết, hệ toạ độ 109 × 109 của KanjiVG. */
  strokes: string[]
  parts: KanjiPart[]
  /** Bộ thủ theo KanjiVG (dạng gốc), null khi KanjiVG không đánh dấu. */
  radicalChar: string | null
}

interface Node {
  attrs: Record<string, string>
  children: Node[]
  strokes: number
}

const attrRe = /([\w:]+)="([^"]*)"/g

function attrsOf(tag: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (let m = attrRe.exec(tag); m; m = attrRe.exec(tag)) out[m[1]] = m[2]
  attrRe.lastIndex = 0
  return out
}

/** Gom nhóm không có kvg:element lên tầng trên; nhóm cùng thành phần bị tách (kvg:part) chỉ giữ một lần. */
function toParts(nodes: readonly Node[]): KanjiPart[] {
  const out: KanjiPart[] = []
  for (const node of nodes) {
    const el = node.attrs['kvg:element']
    if (!el) {
      out.push(...toParts(node.children))
      continue
    }
    if (node.attrs['kvg:part'] && node.attrs['kvg:part'] !== '1' && out.some((p) => p.c === el)) continue
    const part: KanjiPart = { c: el }
    if (node.attrs['kvg:original']) part.original = node.attrs['kvg:original']
    if (node.attrs['kvg:position']) part.pos = node.attrs['kvg:position']
    if (node.attrs['kvg:radical'] === 'general' || node.attrs['kvg:radical'] === 'tradit') part.radical = true
    const children = toParts(node.children)
    if (children.length > 0) part.parts = children
    out.push(part)
  }
  return out
}

function findRadical(nodes: readonly Node[]): string | null {
  // Ưu tiên đánh dấu "general", rồi "tradit"
  for (const kind of ['general', 'tradit']) {
    const stack = [...nodes]
    while (stack.length > 0) {
      const n = stack.shift()!
      if (n.attrs['kvg:radical'] === kind) return n.attrs['kvg:original'] ?? n.attrs['kvg:element'] ?? null
      stack.push(...n.children)
    }
  }
  return null
}

/** Đọc toàn bộ tệp. Chỉ lấy bản chính của mỗi chữ (bỏ các biến thể như -Kaisho). */
export function parseKanjiVg(xml: string, wanted?: ReadonlySet<string>): Map<string, KanjiVisual> {
  const out = new Map<string, KanjiVisual>()
  const kanjiRe = /<kanji id="kvg:kanji_([0-9a-f]+)">([\s\S]*?)<\/kanji>/g
  for (let m = kanjiRe.exec(xml); m; m = kanjiRe.exec(xml)) {
    const character = String.fromCodePoint(parseInt(m[1], 16))
    if (wanted && !wanted.has(character)) continue
    const body = m[2]
    const root: Node = { attrs: {}, children: [], strokes: 0 }
    const stack: Node[] = [root]
    const strokes: string[] = []
    const tagRe = /<(\/?)(g|path)\b([^>]*?)(\/?)>/g
    for (let t = tagRe.exec(body); t; t = tagRe.exec(body)) {
      const [, closing, name, rest, selfClosing] = t
      if (name === 'path') {
        const d = attrsOf(rest).d
        if (d) strokes.push(d)
        for (const n of stack) n.strokes++
        continue
      }
      if (closing) {
        if (stack.length > 1) stack.pop()
        continue
      }
      const node: Node = { attrs: attrsOf(rest), children: [], strokes: 0 }
      stack[stack.length - 1].children.push(node)
      if (!selfClosing) stack.push(node)
    }
    // Nhóm ngoài cùng là chính chữ đó
    const top = root.children.length === 1 && root.children[0].attrs['kvg:element'] === character ? root.children[0].children : root.children
    out.set(character, { character, strokes, parts: toParts(top), radicalChar: findRadical(root.children) })
  }
  return out
}

/** Số thứ tự bộ thủ Khang Hy (1–214) theo khối Kangxi Radicals của Unicode (U+2F00–U+2FD5, chuẩn hoá NFKC). */
export const KANGXI_RADICALS: readonly string[] = Array.from({ length: 214 }, (_, i) => String.fromCodePoint(0x2f00 + i).normalize('NFKC'))

/**
 * Dạng KanjiVG dùng cho bộ thủ mà chuẩn hoá Unicode không quy về được bộ Khang Hy:
 * 戸 (bộ Hộ 戶, 63), 辶 (bộ Sước 辵, 162), 青 (bộ Thanh 靑, 174), 氷 (KanjiVG ghi 冫 là biến thể của 氷; bộ Băng, 15), 黄 (bộ Hoàng 黃, 201).
 */
const VARIANT_RADICALS: Readonly<Record<string, number>> = { 戸: 63, 辶: 162, 青: 174, 氷: 15, 黄: 201 }

export function radicalNumber(char: string | null): number | null {
  if (!char) return null
  if (VARIANT_RADICALS[char]) return VARIANT_RADICALS[char]
  const i = KANGXI_RADICALS.indexOf(char.normalize('NFKC'))
  return i === -1 ? null : i + 1
}
