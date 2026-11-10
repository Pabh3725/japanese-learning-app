// File data/n5/kanji_policy.csv: đọc, ghép đề xuất mới với dòng đã duyệt, ghi lại. Pure.

import { parseCsv } from '../seed/csv'
import type { Confidence, Policy, PolicyProposal } from './classify'

export const POLICY_COLUMNS = ['code', 'expression', 'policy', 'target_level', 'confidence', 'reason', 'source', 'locked'] as const

export interface PolicyRow {
  code: string
  expression: string
  policy: Policy
  targetLevel: number | null
  confidence: Confidence
  reason: string
  source: string
  /** Chủ dự án đã duyệt: chạy lại script không ghi đè. */
  locked: boolean
}

export interface ParsedPolicyFile {
  rows: PolicyRow[]
  errors: { line: number; message: string }[]
}

export function parsePolicyFile(text: string): ParsedPolicyFile {
  const { records, errors: csvErrors } = parseCsv(text)
  const errors = csvErrors.map((e) => ({ line: e.line, message: e.message }))
  const header = records[0]?.cells ?? []
  if (header.join(',') !== POLICY_COLUMNS.join(',')) {
    errors.push({ line: 1, message: `Header sai. Cần: ${POLICY_COLUMNS.join(',')}` })
    return { rows: [], errors }
  }
  const rows: PolicyRow[] = []
  for (const rec of records.slice(1)) {
    const [code, expression, policy, target, confidence, reason, source, locked] = rec.cells
    if (rec.cells.length !== POLICY_COLUMNS.length) {
      errors.push({ line: rec.line, message: `Có ${rec.cells.length} cột, cần ${POLICY_COLUMNS.length}` })
      continue
    }
    if (target !== '' && !/^[1-5]$/.test(target)) errors.push({ line: rec.line, message: 'target_level phải để trống hoặc là 1–5' })
    if (!['high', 'medium', 'low'].includes(confidence)) errors.push({ line: rec.line, message: 'confidence phải là high, medium hoặc low' })
    if (locked !== 'true' && locked !== 'false') errors.push({ line: rec.line, message: 'locked phải là true hoặc false' })
    rows.push({
      code,
      expression,
      policy: policy as Policy,
      targetLevel: target === '' ? null : Number(target),
      confidence: confidence as Confidence,
      reason,
      source,
      locked: locked === 'true',
    })
  }
  return { rows, errors }
}

export interface MergeResult {
  rows: PolicyRow[]
  /** Dòng đã khóa mà đề xuất mới khác: giữ dòng đã khóa, báo để người duyệt xem lại. */
  lockedDiffers: { row: PolicyRow; proposal: PolicyProposal }[]
}

/** Dòng đã khóa giữ nguyên; dòng chưa khóa lấy đề xuất mới. Thứ tự theo danh sách từ. */
export function mergeProposals(
  words: readonly { code: string; expression: string }[],
  proposals: ReadonlyMap<string, PolicyProposal>,
  existing: readonly PolicyRow[],
): MergeResult {
  const old = new Map(existing.map((r) => [r.code, r]))
  const lockedDiffers: MergeResult['lockedDiffers'] = []
  const rows = words.map((w) => {
    const proposal = proposals.get(w.code)!
    const prev = old.get(w.code)
    if (prev?.locked) {
      if (prev.policy !== proposal.policy || prev.targetLevel !== proposal.targetLevel) lockedDiffers.push({ row: prev, proposal })
      return { ...prev, expression: w.expression }
    }
    return { code: w.code, expression: w.expression, ...proposal, locked: false }
  })
  return { rows, lockedDiffers }
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function formatPolicyFile(rows: readonly PolicyRow[]): string {
  const lines = rows.map((r) =>
    [r.code, r.expression, r.policy, r.targetLevel === null ? '' : String(r.targetLevel), r.confidence, r.reason, r.source, String(r.locked)].map(cell).join(','),
  )
  return [POLICY_COLUMNS.join(','), ...lines].join('\n') + '\n'
}
