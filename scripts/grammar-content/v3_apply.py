"""Ngữ pháp V3: nối câu hỏi–đáp bổ sung (data/grammar/v3/extra-*.json) vào file bài data/grammar/lesson-NN.json.

Nguồn soạn ở nhánh content/grammar-v3-data (scripts/grammar-content/v3_extra.py). Chạy lại nhiều lần vẫn an toàn:
câu đã có (theo mã) thì ghi đè, câu hỏi gắn vào câu gốc thì đặt lại.
Chạy: python3 -I scripts/grammar-content/v3_apply.py   rồi   pnpm seed
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data' / 'grammar'

for extra_file in sorted((DATA / 'v3').glob('extra-*.json')):
    ex = json.loads(extra_file.read_text(encoding='utf-8'))
    lessons = {int(code[1:3]) for code in [*ex['points'], *ex.get('attach', {})]}
    for lesson in sorted(lessons):
        path = DATA / f'lesson-{lesson:02d}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        added = attached = 0
        for point in data['points']:
            code = point['code']
            prompts = {a['code']: a['prompt'] for a in ex.get('attach', {}).get(code, [])}
            for s in point['sentences']:
                if s['code'] in prompts:
                    s['prompt'] = prompts[s['code']]
                    attached += 1
            have = {s['code']: i for i, s in enumerate(point['sentences'])}
            for s in ex['points'].get(code, []):
                row = {k: v for k, v in s.items() if k != 'v3'}
                if row['code'] in have:
                    point['sentences'][have[row['code']]] = row
                else:
                    point['sentences'].append(row)
                    added += 1
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        print(f'{path.relative_to(ROOT)}: +{added} câu, {attached} câu hỏi gắn vào câu gốc')
