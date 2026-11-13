// Xuất docs/counters-review.md từ lib/counters/data.ts để chủ dự án duyệt cách đọc.
// Chạy: pnpm exec tsx scripts/counters/review.ts
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { COUNT_THINGS, COUNTER_SETS, GROUP_LABELS, meaningOf, setById, type CounterGroup } from '../../lib/counters/data'

const L: string[] = [
  '# Duyệt Counters (số đếm, từ đếm, ngày tháng năm, giờ phút)\n',
  'Dữ liệu ở `lib/counters/data.ts`. Cột "Cách đọc" là cách đọc chính (hiện trong bảng tra); "Cũng đúng" được chấp nhận khi chấm; ' +
    '"Nhiễu soạn tay" là cách đọc sai hay gặp, dùng làm đáp án nhiễu. Ngoài ra bài luyện tự dựng nhiễu biến âm (さんほん, さんぽん…) ' +
    'và không bao giờ lấy một cách đọc được chấp nhận. Nhóm Numbers còn luyện số ngẫu nhiên 0–99,999, đọc bằng hàm numberReading ' +
    '(cùng quy tắc biến âm như bảng). Thấy cách đọc nào sai thì ghi lại chữ (ví dụ 8本) để Claude sửa.\n',
]
for (const group of ['numbers', 'counters', 'dates', 'time'] as CounterGroup[]) {
  L.push(`## ${GROUP_LABELS[group].title}\n`)
  for (const set of COUNTER_SETS.filter((s) => s.group === group)) {
    L.push(`### ${set.label} — ${set.usage}\n`)
    L.push('| Chữ | Cách đọc | Nghĩa | Cũng đúng | Nhiễu soạn tay |', '|---|---|---|---|---|')
    for (const e of set.entries) L.push(`| ${e.written} | ${e.readings[0]} | ${meaningOf(set, e)} | ${e.readings.slice(1).join(', ')} | ${(e.wrong ?? []).join(', ')} |`)
    L.push('')
  }
}
L.push('## Vật để luyện chọn từ đếm\n', '| Vật | Nghĩa | Từ đếm đúng |', '|---|---|---|')
for (const t of COUNT_THINGS) L.push(`| ${t.word} (${t.reading}) | ${t.meaning} | ${t.sets.map((id) => setById(id)!.label).join(', ')} |`)
writeFileSync(join(process.cwd(), 'docs', 'counters-review.md'), L.join('\n') + '\n')
console.log('Đã ghi docs/counters-review.md')
