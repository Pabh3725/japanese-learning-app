"""Sinh docs/listening-review-b.md: toàn bộ hội thoại để chủ dự án duyệt. Dùng: python3 show.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
POINTS = {}
for f in (ROOT / 'data' / 'grammar').glob('*.json'):
    for p in json.loads(f.read_text())['points']:
        POINTS[p['code']] = p['pattern']

items = json.loads((ROOT / 'data' / 'listening' / 'conversations.json').read_text())
out = [
    '# Luyện nghe đợt B — hội thoại bài 1–25 (đã duyệt 2026-11-16)',
    '',
    'Sinh bằng `python3 scripts/listening-content/show.py`. Mỗi bài 2 hội thoại (ngắn 6–8 lượt, 4–6 ô; dài 10–14 lượt, 8–10 ô).',
    'Công cụ đã kiểm tra: chỉ dùng từ của bài 1 tới bài đó (cộng tên người, địa danh, câu chào), mẫu ngữ pháp thuộc bài ≤ bài đó, mỗi ô 4 lựa chọn khác nhau.',
    '',
    'Cách đọc: `漢字(よみ)` là furigana; ô trống ghi **【✓đáp án / nhiễu / nhiễu / nhiễu】** (app xáo vị trí); 男 nam, 女 nữ.',
    '',
    f'Tổng: {len(items)} hội thoại, {sum(len(i["lines"]) for i in items)} lượt nói, {sum(len(i["blanks"]) for i in items)} ô trống.',
    '',
]
for c in items:
    out += [f"## Bài {c['lesson']} · {'Ngắn' if c['kind'] == 'short' else 'Dài'} · {c['title']} (`{c['code']}`)", '', f"*{c['situation']}* — Mẫu: {' · '.join(POINTS.get(p, p) for p in c['patterns'])}", '']
    for li, line in enumerate(c['lines']):
        parts = []
        for pi, p in enumerate(line['pieces']):
            b = next((x for x in c['blanks'] if x['line'] == li and x['piece'] == pi), None)
            if b:
                opts = ['✓' + o if i == b['answer'] else o for i, o in enumerate(b['options'])]
                parts.append('**【' + ' / '.join(opts) + '】**')
            else:
                parts.append(p['t'] + (f"({p['r']})" if p.get('r') and p['r'] != p['t'] else ''))
        out.append(f"{li + 1}. {'男' if line['sp'] == 'M' else '女'}：{''.join(parts)}  ")
        out.append(f"   — {line['meaning']}")
    out.append('')
(ROOT / 'docs' / 'listening-review-b.md').write_text('\n'.join(out) + '\n')
print('docs/listening-review-b.md', len(out), 'dòng')
