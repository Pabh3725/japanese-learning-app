// Dựng docs/kanji-policy-review.md: số lượng theo nhãn và danh sách từ cần chủ dự án xem. Pure.

import type { PolicyProposal } from './classify'
import type { PolicyRow } from './policy-file'

const cell = (s: string) => s.replace(/\|/g, '\\|')

function table(rows: readonly PolicyRow[], words: ReadonlyMap<string, Record<string, string>>): string[] {
  if (rows.length === 0) return ['Không có.', '']
  return [
    '| Mã | Từ | Cách đọc | Nghĩa | Cấp từ | Nhãn | Học ở | Lý do |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => {
      const w = words.get(r.code) ?? {}
      return `| ${r.code} | ${cell(r.expression)} | ${w.reading_kana ?? ''} | ${cell(w.meaning_vi ?? '')} | N${w.jlpt_level ?? '?'} | ${r.policy} | ${r.targetLevel === null ? '—' : `N${r.targetLevel}`} | ${cell(r.reason)} |`
    }),
    '',
  ]
}

export function formatReview(
  rows: readonly PolicyRow[],
  lockedDiffers: readonly { row: PolicyRow; proposal: PolicyProposal }[],
  wordList: readonly Record<string, string>[],
  levelSource: string,
): string {
  const words = new Map(wordList.map((w) => [w.code, w]))
  const open = rows.filter((r) => !r.locked)
  const count = (p: string, level?: number) =>
    rows.filter((r) => r.policy === p && (level === undefined || words.get(r.code)?.jlpt_level === String(level))).length
  const byConfidence = (c: string) => open.filter((r) => r.confidence === c && r.policy !== 'KANA_ONLY')

  return [
    '# Rà soát chính sách Kanji của từ (V9 gói 3)',
    '',
    `File này do \`pnpm policy:propose\` tạo, đừng sửa tay. Sửa nhãn trong \`data/n5/kanji_policy.csv\`, đặt \`locked\` = \`true\` cho dòng đã duyệt, rồi chạy lại script và \`pnpm seed\`.`,
    '',
    `Nguồn: JMdict (EDRDG, CC BY-SA 4.0) để biết từ thường viết bằng Kana; cấp chữ Kanji theo ${levelSource}. JLPT không công bố danh sách chính thức, nên mọi cấp ở đây là ước lượng.`,
    '',
    '## 1. Số lượng',
    '',
    '| Nhãn | Ý nghĩa | Từ N5 | Từ N4 |',
    '| --- | --- | --- | --- |',
    `| KANA_ONLY | Không có Kanji | ${count('KANA_ONLY', 5)} | ${count('KANA_ONLY', 4)} |`,
    `| KANJI_CORE | Học dạng Kanji ở cấp của từ | ${count('KANJI_CORE', 5)} | ${count('KANJI_CORE', 4)} |`,
    `| KANJI_DEFERRED | Học dạng Kanji ở cấp sau | ${count('KANJI_DEFERRED', 5)} | ${count('KANJI_DEFERRED', 4)} |`,
    `| KANJI_OPTIONAL | Thường viết Kana, chỉ học khi bấm "Học dạng Kanji" | ${count('KANJI_OPTIONAL', 5)} | ${count('KANJI_OPTIONAL', 4)} |`,
    '',
    `Đã duyệt (locked): ${rows.filter((r) => r.locked).length}/${rows.length}.`,
    '',
    '## 2. Đã duyệt nhưng đề xuất mới khác',
    '',
    ...(lockedDiffers.length === 0
      ? ['Không có.', '']
      : [
          '| Mã | Từ | Nhãn đã duyệt | Đề xuất mới | Lý do đề xuất |',
          '| --- | --- | --- | --- | --- |',
          ...lockedDiffers.map(
            ({ row, proposal }) =>
              `| ${row.code} | ${cell(row.expression)} | ${row.policy} ${row.targetLevel ? `N${row.targetLevel}` : ''} | ${proposal.policy} ${proposal.targetLevel ? `N${proposal.targetLevel}` : ''} | ${cell(proposal.reason)} |`,
          ),
          '',
        ]),
    '## 3. Độ tin cậy thấp: không tìm thấy trong JMdict hoặc có chữ chưa có cấp',
    '',
    ...table(byConfidence('low'), words),
    '## 4. Độ tin cậy vừa: JMdict ghi thường viết bằng Kana hoặc cách viết hiếm',
    '',
    ...table(byConfidence('medium'), words),
    '## 5. Học dạng Kanji ở cấp sau (KANJI_DEFERRED, độ tin cậy cao)',
    '',
    ...table(open.filter((r) => r.policy === 'KANJI_DEFERRED' && r.confidence === 'high'), words),
  ].join('\n')
}
